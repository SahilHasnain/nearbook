import type { Models } from "react-native-appwrite";

export type Condition = "new" | "like-new" | "good" | "fair" | "poor";

export type ListingStatus = "active" | "sold";

export interface Listing extends Models.Document {
  title: string;
  subject: string;
  publisher: string;
  edition: string;
  condition: Condition;
  price: number;
  city: string;
  photos: string[];
  sellerId: string;
  sellerName: string;
  status: ListingStatus;
  description?: string;
}

export interface Conversation extends Models.Document {
  buyerId: string;
  sellerId: string;
  buyerName: string;
  sellerName: string;
  listingId: string;
  listingTitle: string;
  lastMessage?: string;
  lastMessageAt?: string;
}

export interface Message extends Models.Document {
  conversationId: string;
  senderId: string;
  text: string;
}

export interface SavedBook extends Models.Document {
  userId: string;
  listingId: string;
}

export type NotificationType = "message" | "save" | "contact" | "sold";

export interface AppNotification extends Models.Document {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  listingId?: string;
  conversationId?: string;
  read: boolean;
}

export const SUBJECTS = ["Physics", "Chemistry", "Biology"] as const;

export const PUBLISHERS = [
  "NCERT",
  "MTG",
  "Allen",
  "Aakash",
  "Resonance",
  "Cengage",
  "HC Verma",
  "Disha",
  "Other",
] as const;

export const CONDITIONS: Condition[] = [
  "new",
  "like-new",
  "good",
  "fair",
  "poor",
];

export interface ListingFilters {
  search?: string;
  subject?: string;
  publisher?: string;
  condition?: Condition;
  maxPrice?: number;
}

export interface NewListing {
  title: string;
  subject: string;
  publisher: string;
  edition: string;
  condition: Condition;
  price: number;
  city: string;
  description?: string;
  photos: string[];
}

export function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}
