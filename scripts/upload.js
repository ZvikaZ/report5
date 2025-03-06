import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Constants
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./serviceAccountKey.json";

// Initialize the app with a service account
initializeApp({
  credential: cert(serviceAccountPath),
});

// Get Firestore instance
const db = getFirestore();

// Data to upload
const data = [
  {
    tankId: "425",
    timestamp: new Date("2025-02-16"),
    "שצל: ברוס מאג 7.62": 0.5,
    "שצל: כדורי 0.5": 0,
  },
  {
    tankId: "425",
    timestamp: new Date("2025-03-03"),
    "שצל: ברוס מאג 7.62": 0,
    "שצל: כדורי 0.5": 25,
  },
  {
    tankId: "425",
    timestamp: new Date("2025-03-04"),
    "שצל: ברוס מאג 7.62": 0,
    "שצל: כדורי 0.5": 23,
  },
  {
    tankId: "425",
    timestamp: new Date("2025-03-05"),
    "שצל: ברוס מאג 7.62": 1,
    "שצל: כדורי 0.5": 0,
  },
  {
    tankId: "417",
    timestamp: new Date("2025-02-09"),
    "שצל: ברוס מאג 7.62": 1,
    "שצל: כדורי 0.5": 0,
  },
  {
    tankId: "417",
    timestamp: new Date("2025-02-10"),
    "שצל: ברוס מאג 7.62": 1,
    "שצל: כדורי 0.5": 0,
  },
  {
    tankId: "417",
    timestamp: new Date("2025-02-16"),
    "שצל: ברוס מאג 7.62": 0.5,
    "שצל: כדורי 0.5": 0,
  },
  {
    tankId: "417",
    timestamp: new Date("2025-02-19"),
    "שצל: ברוס מאג 7.62": 0,
    "שצל: כדורי 0.5": 5,
  },
  {
    tankId: "191",
    timestamp: new Date("2025-02-10"),
    "שצל: ברוס מאג 7.62": 3,
    "שצל: כדורי 0.5": 0,
  },
  {
    tankId: "191",
    timestamp: new Date("2025-02-15"),
    "שצל: ברוס מאג 7.62": 3,
    "שצל: כדורי 0.5": 0,
  },
  {
    tankId: "191",
    timestamp: new Date("2025-02-20"),
    "שצל: ברוס מאג 7.62": 0,
    "שצל: כדורי 0.5": 20,
  },
  {
    tankId: "191",
    timestamp: new Date("2025-02-24"),
    "שצל: ברוס מאג 7.62": 1,
    "שצל: כדורי 0.5": 0,
  },
  {
    tankId: "191",
    timestamp: new Date("2025-02-28"),
    "שצל: ברוס מאג 7.62": 3,
    "שצל: כדורי 0.5": 0,
  },
  {
    tankId: "191",
    timestamp: new Date("2025-03-02"),
    "שצל: ברוס מאג 7.62": 2,
    "שצל: כדורי 0.5": 50,
  },
  {
    tankId: "191",
    timestamp: new Date("2025-03-04"),
    "שצל: ברוס מאג 7.62": 1,
    "שצל: כדורי 0.5": 0,
  },
  {
    tankId: "401",
    timestamp: new Date("2025-02-11"),
    "שצל: ברוס מאג 7.62": 5,
    "שצל: כדורי 0.5": 0,
  },
  {
    tankId: "401",
    timestamp: new Date("2025-02-17"),
    "שצל: ברוס מאג 7.62": 4,
    "שצל: כדורי 0.5": 0,
  },
  {
    tankId: "401",
    timestamp: new Date("2025-02-28"),
    "שצל: ברוס מאג 7.62": 2,
    "שצל: כדורי 0.5": 0,
  },
  {
    tankId: "401",
    timestamp: new Date("2025-03-02"),
    "שצל: ברוס מאג 7.62": 1.5,
    "שצל: כדורי 0.5": 20,
  },
  {
    tankId: "435",
    timestamp: new Date("2025-02-09"),
    "שצל: ברוס מאג 7.62": 2,
    "שצל: כדורי 0.5": 0,
  },
  {
    tankId: "435",
    timestamp: new Date("2025-02-10"),
    "שצל: ברוס מאג 7.62": 1,
    "שצל: כדורי 0.5": 0,
  },
  {
    tankId: "435",
    timestamp: new Date("2025-02-19"),
    "שצל: ברוס מאג 7.62": 1,
    "שצל: כדורי 0.5": 0,
  },
  {
    tankId: "435",
    timestamp: new Date("2025-02-25"),
    "שצל: ברוס מאג 7.62": 0.5,
    "שצל: כדורי 0.5": 0,
  },
  {
    tankId: "435",
    timestamp: new Date("2025-03-02"),
    "שצל: ברוס מאג 7.62": 2,
    "שצל: כדורי 0.5": 50,
  },
];

async function uploadTankStatus() {
  try {
    const tankStatusRef = db.collection("tankStatus");
    const batch = db.batch();
    let batchCount = 0;
    let totalUploaded = 0;

    console.log(
      `Starting upload of ${data.length} records to tankStatus collection...`,
    );

    for (const item of data) {
      // Create a document ID based on tankId and timestamp
      const timestamp = item.timestamp;
      const docId = `${item.tankId}_${timestamp.toISOString().split("T")[0]}`;

      // Create a reference to the document
      const docRef = tankStatusRef.doc(docId);

      // Convert the JavaScript Date object to a Firestore Timestamp
      const firestoreData = {
        ...item,
        timestamp: Timestamp.fromDate(item.timestamp),
      };

      // Add to batch
      batch.set(docRef, firestoreData, { merge: true });
      batchCount++;

      // Firestore has a limit of 500 operations per batch
      if (batchCount >= 500) {
        await batch.commit();
        totalUploaded += batchCount;
        console.log(
          `Uploaded batch of ${batchCount} documents. Total: ${totalUploaded}`,
        );
        batchCount = 0;
      }
    }

    // Commit any remaining documents
    if (batchCount > 0) {
      await batch.commit();
      totalUploaded += batchCount;
      console.log(
        `Uploaded final batch of ${batchCount} documents. Total: ${totalUploaded}`,
      );
    }

    console.log(
      `Successfully uploaded ${totalUploaded} documents to tankStatus collection.`,
    );
  } catch (error) {
    console.error("Error uploading data:", error);
    throw error;
  }
}

uploadTankStatus().catch((err) => {
  console.error("Upload failed:", err);
  process.exit(1);
});
