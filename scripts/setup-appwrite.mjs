import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(file) {
  const env = {};
  if (!existsSync(file)) return env;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return env;
}

const env = { ...loadEnv(resolve(root, ".env")), ...loadEnv(resolve(root, ".env.local")) };

const ENDPOINT = env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = env.APPWRITE_API_KEY;

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error(
    "Missing env vars. Set EXPO_PUBLIC_APPWRITE_ENDPOINT, EXPO_PUBLIC_APPWRITE_PROJECT_ID and APPWRITE_API_KEY in .env.local"
  );
  process.exit(1);
}

const schema = JSON.parse(readFileSync(resolve(root, "schema.json"), "utf8"));

async function api(method, path, body) {
  const res = await fetch(`${ENDPOINT}${path}`, {
    method,
    headers: {
      "X-Appwrite-Project": PROJECT_ID,
      "X-Appwrite-Key": API_KEY,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not json
  }
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status}: ${json?.message ?? text}`);
    err.status = res.status;
    err.json = json;
    throw err;
  }
  return json;
}

async function createIfMissing(fn, label, existsCheck) {
  try {
    if (existsCheck) {
      const existing = await existsCheck();
      if (existing) {
        console.log(`  exists  ${label}`);
        return;
      }
    }
    await fn();
    console.log(`  created ${label}`);
  } catch (e) {
    if (e.status === 409) {
      console.log(`  exists  ${label}`);
    } else {
      throw e;
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const arraysEqual = (a, b) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const COLLECTION_PERMS = ['create("any")'];

async function waitForAttributes(base, keys, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const collection = await api("GET", base);
    const attrs = collection.attributes ?? [];
    const missing = keys.filter((k) => {
      const attr = attrs.find((a) => a.key === k);
      return !attr || attr.status !== "available";
    });
    if (missing.length === 0) return;
    await sleep(500);
  }
  throw new Error(`Timed out waiting for attributes to be available: ${keys.join(", ")}`);
}

async function createCollection(collection) {
  const existsCheck = async () => {
    try {
      const res = await api(
        "GET",
        `/databases/${schema.databaseId}/collections/${collection.id}`
      );
      return !!res;
    } catch (e) {
      if (e.status === 404) return false;
      throw e;
    }
  };

  await createIfMissing(
    () =>
      api("POST", `/databases/${schema.databaseId}/collections`, {
        collectionId: collection.id,
        name: collection.name,
        permissions: COLLECTION_PERMS,
        documentSecurity: true,
        enabled: true,
      }),
    `collection ${collection.id}`,
    existsCheck
  );

  const base = `/databases/${schema.databaseId}/collections/${collection.id}`;

  for (const attr of collection.attributes) {
    const body = { key: attr.key, required: !!attr.required, array: !!attr.array };
    if (attr.size != null) body.size = attr.size;
    if (attr.default !== undefined) body.default = attr.default;
    if (attr.min != null) body.min = attr.min;
    if (attr.max != null) body.max = attr.max;
    if (attr.format) body.format = attr.format;
    await createIfMissing(
      () => api("POST", `${base}/attributes/${attr.type}`, body),
      `attribute ${collection.id}.${attr.key}`
    );
  }

  await waitForAttributes(
    base,
    collection.attributes.map((a) => a.key)
  );

  for (const idx of collection.indexes ?? []) {
    const base = `/databases/${schema.databaseId}/collections/${collection.id}`;
    const current = (await api("GET", base)).indexes ?? [];
    const existing = current.find((i) => i.key === idx.key);
    if (!existing) {
      await createIfMissing(
        () =>
          api("POST", `${base}/indexes`, {
            key: idx.key,
            type: idx.type,
            attributes: idx.attributes,
            orders: idx.orders ?? [],
          }),
        `index ${collection.id}.${idx.key}`
      );
      continue;
    }
    if (
      existing.type === idx.type &&
      arraysEqual(existing.attributes ?? [], idx.attributes ?? []) &&
      arraysEqual(existing.orders ?? [], idx.orders ?? [])
    ) {
      console.log(`  exists  index ${collection.id}.${idx.key}`);
      continue;
    }
    console.log(
      `  update  index ${collection.id}.${idx.key}: ${existing.type} -> ${idx.type}`
    );
    await api("DELETE", `${base}/indexes/${idx.key}`);
    await api("POST", `${base}/indexes`, {
      key: idx.key,
      type: idx.type,
      attributes: idx.attributes,
      orders: idx.orders ?? [],
    });
  }
}

async function main() {
  console.log(`Project: ${PROJECT_ID}\nEndpoint: ${ENDPOINT}\n`);

  // 1. Database
  await createIfMissing(
    () =>
      api("POST", "/databases", {
        databaseId: schema.databaseId,
        name: schema.databaseName,
        enabled: true,
      }),
    `database ${schema.databaseId}`,
    async () => {
      try {
        return !!(await api("GET", `/databases/${schema.databaseId}`));
      } catch (e) {
        if (e.status === 404) return false;
        throw e;
      }
    }
  );

  // 2. Collections
  for (const collection of schema.collections) {
    await createCollection(collection);
  }

  // 3. Storage bucket
  const bucketPath = `/storage/buckets/${schema.bucket.id}`;
  await createIfMissing(
    () =>
      api("POST", "/storage/buckets", {
        bucketId: schema.bucket.id,
        name: schema.bucket.name,
        permissions: ['create("users")', 'read("any")'],
        fileSecurity: false,
        enabled: true,
        maximumFileSize: schema.bucket.maximumFileSize ?? 10485760,
        allowedFileExtensions: schema.bucket.allowedFileExtensions ?? [],
      }),
    `bucket ${schema.bucket.id}`,
    async () => {
      try {
        return !!(await api("GET", bucketPath));
      } catch (e) {
        if (e.status === 404) return false;
        throw e;
      }
    }
  );
  const currentBucket = await api("GET", bucketPath);
  await api("PUT", bucketPath, {
    name: currentBucket.name,
    permissions: ['create("users")', 'read("any")'],
    fileSecurity: false,
    enabled: currentBucket.enabled,
    maximumFileSize: currentBucket.maximumFileSize,
    allowedFileExtensions: currentBucket.allowedFileExtensions,
    compression: currentBucket.compression,
    encryption: currentBucket.encryption,
    antivirus: currentBucket.antivirus,
    transformations: currentBucket.transformations,
  });
  console.log(`  updated bucket ${schema.bucket.id} permissions`);

  // 4. Platforms are added in Console > Project Settings > Platforms
  //    (this endpoint is not exposed to API keys). Remember to add:
  //      - Web app:  http://localhost:8081
  //      - Android:  com.nearbook.app
  //      - Apple:    com.nearbook.app

  // 5. Ensure email/password auth is enabled
  try {
    const project = await api("GET", `/projects/${PROJECT_ID}`);
    const methods = project.authMethods ?? [];
    if (!methods.includes("email") && !methods.includes("emailpassword")) {
      try {
        await api("PATCH", `/projects/${PROJECT_ID}/auth/email-password`, { enabled: true });
        console.log("  enabled  email/password auth");
      } catch {
        console.log("  (could not enable email/password auth via API — enable it in Console > Auth)");
      }
    } else {
      console.log("  enabled  email/password auth");
    }
  } catch {
    console.log("  (could not read auth methods — enable email/password in Console > Auth if needed)");
  }

  console.log("\nNote: indexes and bucket permissions are reconciled against schema.json on every run.");

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("\nSetup failed:", e.message);
  process.exit(1);
});
