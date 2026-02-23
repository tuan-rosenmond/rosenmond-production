import * as admin from "firebase-admin";
import { getFirestore, FieldValue, Timestamp as FsTimestamp } from "firebase-admin/firestore";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = getFirestore();

export const collections = {
  tasksMirror:       () => db.collection("tasksMirror"),
  clients:           () => db.collection("clients"),
  team:              () => db.collection("team"),
  domains:           () => db.collection("domains"),
  channelMap:        () => db.collection("channelMap"),
  activityLog:       () => db.collection("activityLog"),
  scans:             () => db.collection("scans"),
  checkins:          () => db.collection("checkins"),
  pendingSuggestions: () => db.collection("pendingSuggestions"),
  clientBoardSync:   () => db.collection("clientBoardSync"),
  slackArchive:      () => db.collection("slackArchive"),
  projects:          (clientId: string) => db.collection("projects").doc(clientId).collection("projects"),
  coachingLog:       (userId: string) => db.collection("coachingLog").doc(userId).collection("entries"),
} as const;

export const serverTimestamp = FieldValue.serverTimestamp;
export const Timestamp = FsTimestamp;
export type FirestoreTimestamp = FsTimestamp;
