import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { questionsData } from "../components/questions-data.js";

export interface TankData {
  tankId: string;
  timestamp: Date | null;
  [key: string]: any;
}

/**
 * Gets all tank IDs from the questions data
 */
export function getTankIds(): string[] {
  return questionsData.screens
    .flatMap((screen) => screen.questions)
    .find((question) => question.text === "צ. הטנק")?.options || [];
}

/**
 * Gets the latest status entry for a specific tank
 */
export async function getLatestTankStatusEntry(tankId: string): Promise<TankData | null> {
  const tankStatusRef = collection(db, "tankStatus");
  const q = query(
    tankStatusRef,
    where("tankId", "==", tankId),
    orderBy("timestamp", "desc"),
    limit(1)
  );

  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  return { tankId, ...doc.data() } as TankData;
}

/**
 * Gets the latest status entries for multiple tanks
 */
export async function getLatestTankStatusEntries(tankIds: string[]): Promise<TankData[]> {
  const promises = tankIds.map(async (tankId) => {
    const tankData = await getLatestTankStatusEntry(tankId);
    return tankData || { tankId, timestamp: null };
  });

  return Promise.all(promises);
}

/**
 * Gets the previous status entry for a specific tank
 */
export async function getPreviousTankStatusEntry(tankId: string): Promise<TankData | null> {
  const tankStatusRef = collection(db, "tankStatus");
  const q = query(
    tankStatusRef,
    where("tankId", "==", tankId),
    orderBy("timestamp", "desc"),
    limit(2)
  );

  const querySnapshot = await getDocs(q);
  if (querySnapshot.docs.length < 2) {
    return null;
  }

  const doc = querySnapshot.docs[1];
  return { tankId, ...doc.data() } as TankData;
} 