import { ExecutionMethod, Query } from "react-native-appwrite";
import {
  buckets,
  account,
  collections,
  config,
  databases,
  functions,
  ID,
  storage,
} from "@/lib/appwrite";
import type {
  AppNotification,
  Conversation,
  Listing,
  ListingFilters,
  Message,
  NewListing,
  NotificationType,
  SavedBook,
} from "@/lib/types";

export function photoUrl(fileId: string): string {
  return storage.getFileViewURL(buckets.bookPhotos, fileId).toString();
}

export async function deletePhoto(fileId: string): Promise<void> {
  await storage.deleteFile({
    bucketId: buckets.bookPhotos,
    fileId,
  });
}

function docPermissions(ownerId: string): string[] {
  return [
    `read("user:${ownerId}")`,
    `update("user:${ownerId}")`,
    `delete("user:${ownerId}")`,
  ];
}

function listingPermissions(ownerId: string): string[] {
  return [
    `read("any")`,
    `read("user:${ownerId}")`,
    `update("user:${ownerId}")`,
    `delete("user:${ownerId}")`,
  ];
}

// ---------- Listings ----------

export async function listListings(
  filters: ListingFilters = {}
): Promise<Listing[]> {
  const queries: string[] = [
    Query.equal("status", ["active"]),
    Query.orderDesc("$createdAt"),
    Query.limit(filters.search ? 1000 : 100),
  ];
  if (filters.subject) queries.push(Query.equal("subject", [filters.subject]));
  if (filters.publisher)
    queries.push(Query.equal("publisher", [filters.publisher]));
  if (filters.condition)
    queries.push(Query.equal("condition", [filters.condition]));
  if (filters.maxPrice != null && filters.maxPrice > 0)
    queries.push(Query.lessThanEqual("price", filters.maxPrice));

  const res = await databases.listDocuments<Listing>({
    databaseId: config.databaseId,
    collectionId: collections.listings,
    queries,
  });

  let listings = res.documents;
  const q = filters.search?.trim().toLowerCase();
  if (q) {
    listings = listings.filter((l) => l.title.toLowerCase().includes(q));
  }
  return listings;
}

export async function getListing(id: string): Promise<Listing> {
  return databases.getDocument<Listing>({
    databaseId: config.databaseId,
    collectionId: collections.listings,
    documentId: id,
  });
}

export async function uploadPhotos(
  uris: { uri: string; name: string; type: string; size: number }[],
  ownerId: string
): Promise<string[]> {
  const ids: string[] = [];
  for (const file of uris) {
    const uploaded = await storage.createFile({
      bucketId: buckets.bookPhotos,
      fileId: ID.unique(),
      file: { uri: file.uri, name: file.name, type: file.type, size: file.size },
      permissions: [
        `read("any")`,
        `read("user:${ownerId}")`,
        `update("user:${ownerId}")`,
        `delete("user:${ownerId}")`,
      ],
    });
    ids.push(uploaded.$id);
  }
  return ids;
}

export async function createListing(
  data: NewListing,
  seller: { $id: string; name: string }
): Promise<Listing> {
  return databases.createDocument<Listing>({
    databaseId: config.databaseId,
    collectionId: collections.listings,
    documentId: ID.unique(),
    data: {
      ...data,
      sellerId: seller.$id,
      sellerName: seller.name,
      status: "active",
    },
    permissions: listingPermissions(seller.$id),
  });
}

export async function listMyListings(userId: string): Promise<Listing[]> {
  const res = await databases.listDocuments<Listing>({
    databaseId: config.databaseId,
    collectionId: collections.listings,
    queries: [
      Query.equal("sellerId", [userId]),
      Query.orderDesc("$createdAt"),
    ],
  });
  return res.documents;
}

export async function setListingStatus(
  id: string,
  status: Listing["status"]
): Promise<Listing> {
  const listing = await databases.updateDocument<Listing>({
    databaseId: config.databaseId,
    collectionId: collections.listings,
    documentId: id,
    data: { status },
  });

  if (status === "sold") {
    try {
      const me = await account.get();
      const conversations = await listConversations(me.$id);
      const related = conversations.filter((c) => c.listingId === id);
      for (const conversation of related) {
        if (conversation.buyerId === me.$id) continue;
        await createNotification({
          userId: conversation.buyerId,
          type: "sold",
          title: "Listing sold",
          body: `"${conversation.listingTitle}" is now sold`,
          listingId: id,
          conversationId: conversation.$id,
        });
      }
    } catch (e) {
      console.warn("[notifications] Sold notifications failed", e);
    }
  }

  return listing;
}

// ---------- Saved books ----------

export async function listSavedListingIds(userId: string): Promise<string[]> {
  const res = await databases.listDocuments<SavedBook>({
    databaseId: config.databaseId,
    collectionId: collections.savedBooks,
    queries: [Query.equal("userId", [userId]), Query.limit(200)],
  });
  return res.documents.map((d) => d.listingId);
}

export async function isSaved(
  userId: string,
  listingId: string
): Promise<boolean> {
  const res = await databases.listDocuments({
    databaseId: config.databaseId,
    collectionId: collections.savedBooks,
    queries: [
      Query.equal("userId", [userId]),
      Query.equal("listingId", [listingId]),
      Query.limit(1),
    ],
  });
  return res.documents.length > 0;
}

export async function toggleSaved(
  userId: string,
  listingId: string,
  actorName?: string
): Promise<boolean> {
  const saved = await isSaved(userId, listingId);
  if (saved) {
    const res = await databases.listDocuments({
      databaseId: config.databaseId,
      collectionId: collections.savedBooks,
      queries: [
        Query.equal("userId", [userId]),
        Query.equal("listingId", [listingId]),
      ],
    });
    for (const doc of res.documents) {
      await databases.deleteDocument({
        databaseId: config.databaseId,
        collectionId: collections.savedBooks,
        documentId: doc.$id,
      });
    }
    return false;
  }
  await databases.createDocument({
    databaseId: config.databaseId,
    collectionId: collections.savedBooks,
    documentId: ID.unique(),
    data: { userId, listingId },
    permissions: docPermissions(userId),
  });
  if (actorName) {
    try {
      const listing = await getListing(listingId);
      if (listing.sellerId !== userId) {
        await createNotification({
          userId: listing.sellerId,
          type: "save",
          title: actorName,
          body: `Saved your listing "${listing.title}"`,
          listingId,
        });
      }
    } catch (e) {
      console.warn("[notifications] Save notification failed", e);
    }
  }
  return true;
}

// ---------- Notifications ----------

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  listingId?: string;
  conversationId?: string;
}): Promise<void> {
  try {
    const data: Record<string, unknown> = {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      read: false,
    };
    if (input.listingId) data.listingId = input.listingId;
    if (input.conversationId) data.conversationId = input.conversationId;
    await databases.createDocument({
      databaseId: config.databaseId,
      collectionId: collections.notifications,
      documentId: ID.unique(),
      data,
      permissions: [
        `read("user:${input.userId}")`,
        `update("user:${input.userId}")`,
      ],
    });
  } catch (e) {
    console.warn("[notifications] createNotification failed", e);
  }
}

export async function listNotifications(userId: string): Promise<AppNotification[]> {
  const res = await databases.listDocuments<AppNotification>({
    databaseId: config.databaseId,
    collectionId: collections.notifications,
    queries: [
      Query.equal("userId", [userId]),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ],
  });
  return res.documents;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const res = await databases.listDocuments<AppNotification>({
    databaseId: config.databaseId,
    collectionId: collections.notifications,
    queries: [
      Query.equal("userId", [userId]),
      Query.equal("read", [false]),
      Query.limit(1),
    ],
  });
  return res.total ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  await databases.updateDocument({
    databaseId: config.databaseId,
    collectionId: collections.notifications,
    documentId: id,
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const res = await databases.listDocuments<AppNotification>({
    databaseId: config.databaseId,
    collectionId: collections.notifications,
    queries: [
      Query.equal("userId", [userId]),
      Query.equal("read", [false]),
      Query.limit(100),
    ],
  });
  for (const doc of res.documents) {
    await databases.updateDocument({
      databaseId: config.databaseId,
      collectionId: collections.notifications,
      documentId: doc.$id,
      data: { read: true },
    });
  }
}

// ---------- Chat ----------

export async function ensureConversation(params: {
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  listingId: string;
  listingTitle: string;
}): Promise<Conversation> {
  try {
    const jwt = await account.createJWT();
    const execution = await functions.createExecution({
      functionId: config.createConversationFunctionId,
      body: JSON.stringify({ ...params, jwt: jwt.jwt }),
      async: false,
      method: ExecutionMethod.POST,
    });
    const responseBody = execution.responseBody || "{}";
    if (execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
      throw new Error(responseBody);
    }
    return JSON.parse(responseBody) as Conversation;
  } catch (error) {
    console.error("[appwrite chat] Conversation function failed", {
      error,
      buyerId: params.buyerId,
      sellerId: params.sellerId,
      listingId: params.listingId,
    });
    throw error;
  }
}

export async function getConversation(id: string): Promise<Conversation> {
  return databases.getDocument<Conversation>({
    databaseId: config.databaseId,
    collectionId: collections.conversations,
    documentId: id,
  });
}

export async function listConversations(userId: string): Promise<Conversation[]> {
  const [asBuyer, asSeller] = await Promise.all([
    databases.listDocuments<Conversation>({
      databaseId: config.databaseId,
      collectionId: collections.conversations,
      queries: [
        Query.equal("buyerId", [userId]),
        Query.orderDesc("$updatedAt"),
        Query.limit(500),
      ],
    }),
    databases.listDocuments<Conversation>({
      databaseId: config.databaseId,
      collectionId: collections.conversations,
      queries: [
        Query.equal("sellerId", [userId]),
        Query.orderDesc("$updatedAt"),
        Query.limit(500),
      ],
    }),
  ]);
  const seen = new Map<string, Conversation>();
  for (const c of [...asBuyer.documents, ...asSeller.documents]) {
    seen.set(c.$id, c);
  }
  return Array.from(seen.values()).sort(
    (a, b) => (b.$updatedAt ?? "").localeCompare(a.$updatedAt ?? "")
  );
}

function isConversationUnread(conversation: Conversation, userId: string): boolean {
  const lastMessageAt = conversation.lastMessageAt;
  if (!lastMessageAt) return false;
  const isBuyer = conversation.buyerId === userId;
  const lastReadAt = isBuyer
    ? conversation.buyerLastReadAt
    : conversation.sellerLastReadAt;
  return !lastReadAt || new Date(lastMessageAt).getTime() > new Date(lastReadAt).getTime();
}

export async function getUnreadConversationCount(userId: string): Promise<number> {
  const conversations = await listConversations(userId);
  return conversations.filter((c) => isConversationUnread(c, userId)).length;
}

export async function markConversationRead(
  conversation: Conversation,
  userId: string
): Promise<void> {
  const isBuyer = conversation.buyerId === userId;
  const key = isBuyer ? "buyerLastReadAt" : "sellerLastReadAt";
  try {
    await databases.updateDocument({
      databaseId: config.databaseId,
      collectionId: collections.conversations,
      documentId: conversation.$id,
      data: { [key]: new Date().toISOString() },
    });
  } catch (e) {
    console.warn("[chat] markConversationRead failed", e);
  }
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const res = await databases.listDocuments<Message>({
    databaseId: config.databaseId,
    collectionId: collections.messages,
    queries: [
      Query.equal("conversationId", [conversationId]),
      Query.orderAsc("$createdAt"),
      Query.limit(1000),
    ],
  });
  return res.documents;
}

export async function sendMessage(params: {
  conversationId: string;
  senderId: string;
  text: string;
  recipientId: string;
}): Promise<Message> {
  const jwt = await account.createJWT();
  const execution = await functions.createExecution({
    functionId: config.sendMessageFunctionId,
    body: JSON.stringify({ ...params, jwt: jwt.jwt }),
    async: false,
    method: ExecutionMethod.POST,
  });
  const responseBody = execution.responseBody || "{}";
  if (execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
    throw new Error(responseBody);
  }
  return JSON.parse(responseBody) as Message;
}
