import { Query } from "react-native-appwrite";
import {
  buckets,
  collections,
  config,
  databases,
  ID,
  storage,
} from "@/lib/appwrite";
import type {
  Condition,
  Conversation,
  Listing,
  ListingFilters,
  Message,
  NewListing,
  SavedBook,
} from "@/lib/types";

export function photoUrl(fileId: string): string {
  return storage.getFilePreviewURL(buckets.bookPhotos, fileId).toString();
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

function chatPermissions(buyerId: string, sellerId: string): string[] {
  return [
    `read("user:${buyerId}")`,
    `read("user:${sellerId}")`,
    `update("user:${buyerId}")`,
    `update("user:${sellerId}")`,
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
  uris: { uri: string; name: string; type: string; size: number }[]
): Promise<string[]> {
  const ids: string[] = [];
  for (const file of uris) {
    const uploaded = await storage.createFile({
      bucketId: buckets.bookPhotos,
      fileId: ID.unique(),
      file: { uri: file.uri, name: file.name, type: file.type, size: file.size },
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
  return databases.updateDocument<Listing>({
    databaseId: config.databaseId,
    collectionId: collections.listings,
    documentId: id,
    data: { status },
  });
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
  listingId: string
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
  return true;
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
  const res = await databases.listDocuments<Conversation>({
    databaseId: config.databaseId,
    collectionId: collections.conversations,
    queries: [
      Query.equal("buyerId", [params.buyerId]),
      Query.equal("sellerId", [params.sellerId]),
      Query.equal("listingId", [params.listingId]),
      Query.limit(1),
    ],
  });
  if (res.documents.length > 0) return res.documents[0];

  return databases.createDocument<Conversation>({
    databaseId: config.databaseId,
    collectionId: collections.conversations,
    documentId: ID.unique(),
    data: {
      buyerId: params.buyerId,
      buyerName: params.buyerName,
      sellerId: params.sellerId,
      sellerName: params.sellerName,
      listingId: params.listingId,
      listingTitle: params.listingTitle,
    },
    permissions: chatPermissions(params.buyerId, params.sellerId),
  });
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
  const message = await databases.createDocument<Message>({
    databaseId: config.databaseId,
    collectionId: collections.messages,
    documentId: ID.unique(),
    data: {
      conversationId: params.conversationId,
      senderId: params.senderId,
      text: params.text,
    },
    permissions: chatPermissions(params.senderId, params.recipientId),
  });
  await databases.updateDocument<Conversation>({
    databaseId: config.databaseId,
    collectionId: collections.conversations,
    documentId: params.conversationId,
    data: {
      lastMessage: params.text,
      lastMessageAt: message.$createdAt,
    },
  });
  return message;
}
