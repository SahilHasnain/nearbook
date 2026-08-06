import { getUnreadNotificationCount } from "@/lib/api";

type Listener = () => void;

const listeners = new Set<Listener>();
let count = 0;

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeUnread(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getUnread(): number {
  return count;
}

export function setUnread(n: number): void {
  if (n !== count) {
    count = n;
    emit();
  }
}

export function bumpUnread(by = 1): void {
  setUnread(count + by);
}

export async function refreshUnread(userId: string): Promise<void> {
  try {
    setUnread(await getUnreadNotificationCount(userId));
  } catch (e) {
    console.warn("[notifications] refreshUnread failed", e);
  }
}
