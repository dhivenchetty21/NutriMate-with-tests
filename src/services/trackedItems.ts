import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

import { CustomPriceItem } from '../types';
import { getDb } from './firebase';

/**
 * Shared live-price items, stored in the Firestore collection trackedItems
 * (one document per item). Every user sees the same list, and the Cloudflare
 * Worker refreshes the prices on a schedule.
 * Security rules: anyone can read, signed-in users can add or update, and only
 * the user who added an item can delete it (see FIRESTORE-SETUP.md).
 */

const TRACKED_ITEMS_COLLECTION = 'trackedItems';

export function isSharedTrackingConfigured(): boolean {
  return getDb() !== null;
}

/**
 * Listens to the shared list and calls onChange whenever any user adds,
 * removes or refreshes an item. Returns a function that stops listening.
 * Without Firestore it returns an empty list once.
 */
export function subscribeToSharedTrackedItems(
  onChange: (items: CustomPriceItem[]) => void,
): () => void {
  const db = getDb();
  if (!db) {
    onChange([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, TRACKED_ITEMS_COLLECTION),
    (snapshot) => {
      onChange(snapshot.docs.map((d) => d.data() as CustomPriceItem));
    },
    () => {
      // On error (offline or denied), keep showing the last list.
    },
  );
}

export async function addSharedTrackedItem(
  item: CustomPriceItem,
  addedBy: string,
): Promise<void> {
  const db = getDb();
  if (!db) return;
  await setDoc(doc(db, TRACKED_ITEMS_COLLECTION, item.id), {
    ...item,
    addedBy,
    addedAt: new Date().toISOString(),
  });
}

export async function removeSharedTrackedItem(itemId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await deleteDoc(doc(db, TRACKED_ITEMS_COLLECTION, itemId));
}

/**
 * Moves a user's older private tracked items into the shared list, then
 * clears the old field. Does nothing once the old list is empty.
 */
export async function migrateLegacyPriceItems(
  uid: string,
  legacyItems: CustomPriceItem[],
): Promise<void> {
  const db = getDb();
  if (!db || legacyItems.length === 0) return;

  const batch = writeBatch(db);
  for (const item of legacyItems) {
    batch.set(doc(db, TRACKED_ITEMS_COLLECTION, item.id), {
      ...item,
      addedBy: item.addedBy ?? uid,
      addedAt: item.addedAt ?? new Date().toISOString(),
    });
  }
  batch.set(doc(db, 'households', uid), { customPriceItems: [] }, { merge: true });
  await batch.commit();
}
