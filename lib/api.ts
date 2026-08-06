import { isDemo } from "@/lib/appwrite";
import * as demoApi from "@/lib/api-demo";
import * as appwriteApi from "@/lib/api-appwrite";

const impl = isDemo ? demoApi : appwriteApi;

export const photoUrl = impl.photoUrl;
export const deletePhoto = impl.deletePhoto;
export const listListings = impl.listListings;
export const getListing = impl.getListing;
export const uploadPhotos = impl.uploadPhotos;
export const createListing = impl.createListing;
export const listMyListings = impl.listMyListings;
export const setListingStatus = impl.setListingStatus;
export const listSavedListingIds = impl.listSavedListingIds;
export const isSaved = impl.isSaved;
export const toggleSaved = impl.toggleSaved;
export const ensureConversation = impl.ensureConversation;
export const getConversation = impl.getConversation;
export const listConversations = impl.listConversations;
export const listMessages = impl.listMessages;
export const sendMessage = impl.sendMessage;
export const createNotification = impl.createNotification;
export const listNotifications = impl.listNotifications;
export const getUnreadNotificationCount = impl.getUnreadNotificationCount;
export const markNotificationRead = impl.markNotificationRead;
export const markAllNotificationsRead = impl.markAllNotificationsRead;
export const getUnreadConversationCount = impl.getUnreadConversationCount;
export const markConversationRead = impl.markConversationRead;

export type { ListingFilters, NewListing } from "@/lib/types";
