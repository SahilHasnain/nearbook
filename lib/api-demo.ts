import type {
  Condition,
  Conversation,
  Listing,
  ListingFilters,
  Message,
  NewListing,
} from "@/lib/types";

// ---------- In-memory placeholder data (demo mode) ----------

const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

function listing(
  id: string,
  data: Omit<Listing, "$id" | "$createdAt" | "$updatedAt" | "$permissions" | "$collectionId" | "$databaseId" | "$sequence" | "$status" | "status"> & { status?: Listing["status"] },
  createdAt: number
): Listing {
  const base = {
    ...data,
    status: (data.status ?? "active") as Listing["status"],
  };
  return {
    ...base,
    $id: id,
    $createdAt: iso(createdAt),
    $updatedAt: iso(createdAt),
    $permissions: [],
    $collectionId: "listings",
    $databaseId: "demo",
    $sequence: "0",
  } as unknown as Listing;
}

const demoListings: Listing[] = [
  listing(
    "listing-1",
    {
      title: "MTG NCERT at Your Fingertips – Physics",
      subject: "Physics",
      publisher: "MTG",
      edition: "2024",
      condition: "good",
      price: 250,
      city: "Patna",
      photos: ["demo-physics-1", "demo-physics-2"],
      sellerId: "seller-2",
      sellerName: "Rahul Kumar",
      description: "Slight edge wear, no marks inside. Perfect for theory revision.",
    },
    1000 * 60 * 60 * 5
  ),
  listing(
    "listing-2",
    {
      title: "NCERT Biology Class 11 & 12",
      subject: "Biology",
      publisher: "NCERT",
      edition: "Latest",
      condition: "new",
      price: 350,
      city: "Patna",
      photos: ["demo-bio-1"],
      sellerId: "seller-1",
      sellerName: "Anjali Singh",
      description: "Bought fresh, never used. Both volumes.",
    },
    1000 * 60 * 60 * 26
  ),
  listing(
    "listing-3",
    {
      title: "Aakash Modules – Chemistry Complete Set",
      subject: "Chemistry",
      publisher: "Aakash",
      edition: "2023",
      condition: "like-new",
      price: 1200,
      city: "Delhi",
      photos: ["demo-chem-1", "demo-chem-2", "demo-chem-3"],
      sellerId: "seller-3",
      sellerName: "Priya Sharma",
      description: "Complete module set with DPPs. Few pencil markings.",
    },
    1000 * 60 * 60 * 50
  ),
  listing(
    "listing-4",
    {
      title: "Allen Test Series – Physics & Chemistry",
      subject: "Physics",
      publisher: "Allen",
      edition: "2024",
      condition: "good",
      price: 800,
      city: "Mumbai",
      photos: ["demo-allen-1"],
      sellerId: "seller-4",
      sellerName: "Karan Patel",
      description: "Full year test papers with solutions.",
    },
    1000 * 60 * 60 * 74
  ),
  listing(
    "listing-5",
    {
      title: "HC Verma – Concepts of Physics Vol 1 & 2",
      subject: "Physics",
      publisher: "HC Verma",
      edition: "Revised",
      condition: "like-new",
      price: 500,
      city: "Patna",
      photos: ["demo-hcv-1", "demo-hcv-2"],
      sellerId: "seller-1",
      sellerName: "Anjali Singh",
      description: "Clean copies, no annotations.",
    },
    1000 * 60 * 60 * 98
  ),
  listing(
    "listing-6",
    {
      title: "Disha NEET Previous Year Solved Papers",
      subject: "Biology",
      publisher: "Disha",
      edition: "2023",
      condition: "fair",
      price: 150,
      city: "Lucknow",
      photos: ["demo-disha-1"],
      sellerId: "seller-5",
      sellerName: "Simran Kaur",
      description: "Used, some solved in pencil.",
    },
    1000 * 60 * 60 * 120
  ),
];

const demoConversations: Conversation[] = [
  {
    $id: "conv-1",
    $createdAt: iso(1000 * 60 * 60 * 3),
    $updatedAt: iso(1000 * 60 * 60 * 1),
    $permissions: [],
    $collectionId: "conversations",
    $databaseId: "demo",
    $sequence: "0",
    buyerId: "demo-user",
    buyerName: "Demo Student",
    sellerId: "seller-2",
    sellerName: "Rahul Kumar",
    listingId: "listing-1",
    listingTitle: "MTG NCERT at Your Fingertips – Physics",
  } as unknown as Conversation,
];

const demoSaved = new Set<string>(["listing-2"]);

function message(
  id: string,
  conversationId: string,
  senderId: string,
  text: string,
  msAgo: number
): Message {
  return {
    $id: id,
    $createdAt: iso(msAgo),
    $updatedAt: iso(msAgo),
    $permissions: [],
    $collectionId: "messages",
    $databaseId: "demo",
    $sequence: "0",
    conversationId,
    senderId,
    text,
  } as unknown as Message;
}

const demoMessages: Message[] = [
  message("msg-1", "conv-1", "demo-user", "Hi! Is the MTG Physics still available?", 1000 * 60 * 60 * 3),
  message("msg-2", "conv-1", "seller-2", "Yes, it is. Are you in Patna?", 1000 * 60 * 60 * 1),
];

let uploadCounter = 0;

// ---------- Photos ----------

export function photoUrl(fileId: string): string {
  return `https://picsum.photos/seed/${fileId}/600/400`;
}

export async function deletePhoto(_fileId: string): Promise<void> {
  // demo mode has no real storage; nothing to clean up
}

// ---------- Listings ----------

export async function listListings(
  filters: ListingFilters = {}
): Promise<Listing[]> {
  let out = [...demoListings].filter((l) => l.status === "active");
  if (filters.subject) out = out.filter((l) => l.subject === filters.subject);
  if (filters.publisher) out = out.filter((l) => l.publisher === filters.publisher);
  if (filters.condition) out = out.filter((l) => l.condition === filters.condition);
  if (filters.maxPrice != null && filters.maxPrice > 0)
    out = out.filter((l) => l.price <= filters.maxPrice!);
  const q = filters.search?.trim().toLowerCase();
  if (q) out = out.filter((l) => l.title.toLowerCase().includes(q));
  return out.sort((a, b) => b.$createdAt.localeCompare(a.$createdAt));
}

export async function getListing(id: string): Promise<Listing> {
  const found = demoListings.find((l) => l.$id === id);
  if (!found) throw new Error("Listing not found");
  return found;
}

export async function uploadPhotos(
  files: { uri: string; name: string; type: string; size: number }[]
): Promise<string[]> {
  return files.map(() => `demo-upload-${++uploadCounter}`);
}

export async function createListing(
  data: NewListing,
  seller: { $id: string; name: string }
): Promise<Listing> {
  const doc = listing(
    `listing-${++uploadCounter}`,
    {
      ...data,
      sellerId: seller.$id,
      sellerName: seller.name,
      photos: data.photos.length > 0 ? data.photos : ["demo-upload-0"],
    },
    0
  );
  demoListings.unshift(doc);
  return doc;
}

export async function listMyListings(userId: string): Promise<Listing[]> {
  return demoListings
    .filter((l) => l.sellerId === userId)
    .sort((a, b) => b.$createdAt.localeCompare(a.$createdAt));
}

export async function setListingStatus(
  id: string,
  status: Listing["status"]
): Promise<Listing> {
  const found = demoListings.find((l) => l.$id === id);
  if (!found) throw new Error("Listing not found");
  found.status = status;
  return found;
}

// ---------- Saved books ----------

export async function listSavedListingIds(userId: string): Promise<string[]> {
  return Array.from(demoSaved);
}

export async function isSaved(
  userId: string,
  listingId: string
): Promise<boolean> {
  return demoSaved.has(listingId);
}

export async function toggleSaved(
  userId: string,
  listingId: string
): Promise<boolean> {
  if (demoSaved.has(listingId)) {
    demoSaved.delete(listingId);
    return false;
  }
  demoSaved.add(listingId);
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
  const existing = demoConversations.find(
    (c) =>
      c.buyerId === params.buyerId &&
      c.sellerId === params.sellerId &&
      c.listingId === params.listingId
  );
  if (existing) return existing;

  const conv = {
    $id: `conv-${++uploadCounter}`,
    $createdAt: iso(0),
    $updatedAt: iso(0),
    $permissions: [],
    $collectionId: "conversations",
    $databaseId: "demo",
    $sequence: "0",
    ...params,
  } as unknown as Conversation;
  demoConversations.unshift(conv);
  return conv;
}

export async function getConversation(id: string): Promise<Conversation> {
  const found = demoConversations.find((c) => c.$id === id);
  if (!found) throw new Error("Conversation not found");
  return found;
}

export async function listConversations(
  userId: string
): Promise<Conversation[]> {
  return demoConversations
    .filter((c) => c.buyerId === userId || c.sellerId === userId)
    .sort((a, b) => b.$updatedAt.localeCompare(a.$updatedAt));
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  return demoMessages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.$createdAt.localeCompare(b.$createdAt));
}

export async function sendMessage(params: {
  conversationId: string;
  senderId: string;
  text: string;
  recipientId: string;
}): Promise<Message> {
  const msg = message(
    `msg-${++uploadCounter}`,
    params.conversationId,
    params.senderId,
    params.text,
    0
  );
  demoMessages.push(msg);
  const conv = demoConversations.find((c) => c.$id === params.conversationId);
  if (conv) {
    conv.lastMessage = params.text;
    conv.lastMessageAt = msg.$createdAt;
    conv.$updatedAt = msg.$createdAt;
  }
  return msg;
}
