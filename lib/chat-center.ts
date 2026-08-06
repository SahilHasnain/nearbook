import { getUnreadConversationCount } from "@/lib/api";

type Listener = () => void;

const listeners = new Set<Listener>();
let count = 0;

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeUnreadChats(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getUnreadChats(): number {
  return count;
}

export function setUnreadChats(n: number): void {
  if (n !== count) {
    count = n;
    emit();
  }
}

export async function refreshUnreadChats(userId: string): Promise<void> {
  try {
    setUnreadChats(await getUnreadConversationCount(userId));
  } catch (e) {
    console.warn("[chat] refreshUnreadChats failed", e);
  }
}
