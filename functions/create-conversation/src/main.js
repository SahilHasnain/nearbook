import { createHash } from "node:crypto";

const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
const apiKey = process.env.APPWRITE_FUNCTION_API_KEY;
const databaseId = "nearbook";
const collectionId = "conversations";
const notificationsCollectionId = "notifications";

function json(res, body, status = 200) {
  return res.json(body, status);
}

export default async ({ req, res, error }) => {
  if (req.method !== "POST") {
    return json(res, { message: "Method not allowed" }, 405);
  }

  const body = req.bodyJson ?? {};
  if (!body.jwt || !body.buyerId) {
    return json(res, { message: "Authenticated buyer is required" }, 401);
  }

  const accountResponse = await fetch(`${endpoint}/account`, {
    headers: {
      "X-Appwrite-Project": projectId,
      "X-Appwrite-JWT": body.jwt,
    },
  });
  const authenticatedUser = await accountResponse.json();
  if (!accountResponse.ok || authenticatedUser.$id !== body.buyerId) {
    return json(res, { message: "Invalid authentication" }, 401);
  }

  const required = [
    "buyerId",
    "buyerName",
    "sellerId",
    "sellerName",
    "listingId",
    "listingTitle",
  ];
  if (required.some((key) => typeof body[key] !== "string" || !body[key].trim())) {
    return json(res, { message: "Invalid conversation data" }, 400);
  }

  const documentId = createHash("sha256")
    .update(`${body.buyerId}:${body.sellerId}:${body.listingId}`)
    .digest("hex")
    .slice(0, 32);

  const headers = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": projectId,
    "X-Appwrite-Key": apiKey,
  };
  const baseUrl = `${endpoint}/databases/${databaseId}/collections/${collectionId}/documents`;
  const data = {
    buyerId: body.buyerId,
    buyerName: body.buyerName,
    sellerId: body.sellerId,
    sellerName: body.sellerName,
    listingId: body.listingId,
    listingTitle: body.listingTitle,
  };
  const permissions = [
    `read("user:${body.buyerId}")`,
    `read("user:${body.sellerId}")`,
    `update("user:${body.buyerId}")`,
    `update("user:${body.sellerId}")`,
  ];

  try {
    const createResponse = await fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ documentId, data, permissions }),
    });

    if (createResponse.ok) {
      try {
        const notificationResponse = await fetch(
          `${endpoint}/databases/${databaseId}/collections/${notificationsCollectionId}/documents`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              documentId: "unique()",
              data: {
                userId: body.sellerId,
                type: "contact",
                title: body.buyerName,
                body: `Messaged you about "${body.listingTitle}"`,
                listingId: body.listingId,
                conversationId: documentId,
                read: false,
              },
              permissions: [
                `read("user:${body.sellerId}")`,
                `update("user:${body.sellerId}")`,
              ],
            }),
          }
        );
        if (!notificationResponse.ok) {
          error(`[chat] Contact notification failed: ${await notificationResponse.text()}`);
        }
      } catch (notifErr) {
        error(`[chat] Contact notification error: ${notifErr.message}`);
      }
      return json(res, await createResponse.json());
    }

    if (createResponse.status === 409) {
      const existingResponse = await fetch(`${baseUrl}/${documentId}`, {
        headers,
      });
      return json(res, await existingResponse.json(), existingResponse.status);
    }

    const responseBody = await createResponse.text();
    error(`[chat] Conversation creation failed: ${responseBody}`);
    return json(res, { message: responseBody }, createResponse.status);
  } catch (err) {
    error(`[chat] Conversation function failed: ${err.message}`);
    return json(res, { message: "Conversation service unavailable" }, 500);
  }
};
