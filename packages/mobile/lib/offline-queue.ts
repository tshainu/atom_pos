/**
 * Offline sale queue — persists pending sales in AsyncStorage.
 * Sales are enqueued when offline (or as fallback), then synced
 * to the server every 5 minutes in the background.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "offline_sale_queue";

export interface PendingSale {
  localId: string;       // TMP-<timestamp> — shown in UI until synced
  enqueuedAt: number;    // ms timestamp
  payload: {
    shopId: number;
    userId: number;
    billType: string;
    subtotal: number;
    discount: number;
    netPay: number;
    paymentMethod: string;
    status: string;
    heldLabel?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    promisedDate?: string | null;
    items: {
      itemId: number;
      itemName: string;
      qty: number;
      pricePerItem: number;
      total: number;
    }[];
  };
}

export async function getQueue(): Promise<PendingSale[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function enqueueSale(payload: PendingSale["payload"]): Promise<PendingSale> {
  const localId = `TMP-${Date.now()}`;
  const entry: PendingSale = { localId, enqueuedAt: Date.now(), payload };
  const queue = await getQueue();
  queue.push(entry);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return entry;
}

export async function removeFromQueue(localId: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter((e) => e.localId !== localId);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function getQueueCount(): Promise<number> {
  const q = await getQueue();
  return q.length;
}
