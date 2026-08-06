import "./local-storage";
import {
  Client,
  Account,
  Databases,
  Functions,
  Storage,
  ID,
} from "react-native-appwrite";

// demo | appwrite. See .env.example.
export const isDemo = process.env.EXPO_PUBLIC_DATA_MODE === "demo";

export const config = {
  endpoint:
    process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ||
    "https://cloud.appwrite.io/v1",
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "",
  platform:
    process.env.EXPO_PUBLIC_APPWRITE_PLATFORM || "com.nearbook.app",
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || "",
  createConversationFunctionId:
    process.env.EXPO_PUBLIC_APPWRITE_CREATE_CONVERSATION_FUNCTION_ID ||
    "create-conversation",
  sendMessageFunctionId:
    process.env.EXPO_PUBLIC_APPWRITE_SEND_MESSAGE_FUNCTION_ID || "send-message",
};

export const collections = {
  listings:
    process.env.EXPO_PUBLIC_COLLECTION_LISTINGS || "listings",
  conversations:
    process.env.EXPO_PUBLIC_COLLECTION_CONVERSATIONS || "conversations",
  messages: process.env.EXPO_PUBLIC_COLLECTION_MESSAGES || "messages",
  savedBooks:
    process.env.EXPO_PUBLIC_COLLECTION_SAVED_BOOKS || "saved_books",
  notifications:
    process.env.EXPO_PUBLIC_COLLECTION_NOTIFICATIONS || "notifications",
};

export const buckets = {
  bookPhotos: process.env.EXPO_PUBLIC_BUCKET_BOOK_PHOTOS || "book_photos",
};

export const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setPlatform(config.platform);

export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);
export const storage = new Storage(client);
export { ID };
