import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as fs from "fs";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Constants
const BACKUP_FILE_PATH = "db_backup.json";
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./serviceAccountKey.json";

// Initialize the app with a service account
initializeApp({
  credential: cert(serviceAccountPath),
});

// Get Firestore instance
const db = getFirestore();

async function databaseBackup() {
  try {
    const tankStatusRef = db.collection("tankStatus");
    const querySnapshot = await tankStatusRef.get();

    const data = querySnapshot.docs.map((doc) => {
      const docData = doc.data();
      // Handle Firestore Timestamp objects
      const processedData = { ...docData };
      if (docData.timestamp instanceof Timestamp) {
        processedData.timestamp = docData.timestamp.toDate().toISOString();
      }

      return {
        id: doc.id,
        ...processedData,
      };
    });

    fs.writeFileSync(BACKUP_FILE_PATH, JSON.stringify(data, null, 2));
    console.log(`Backup saved to ${BACKUP_FILE_PATH}`);
  } catch (error) {
    console.error("Error during backup:", error);
    throw error;
  }
}

databaseBackup().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
