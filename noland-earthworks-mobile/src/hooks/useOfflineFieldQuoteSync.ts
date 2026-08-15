import { useEffect, useRef } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { removeOfflineFieldQuote, readOfflineFieldQuoteQueue } from "@/lib/offlineFieldQuoteQueue";
import { useNetwork } from "@/hooks/useNetwork";

/** Flushes locally saved field requests once the device regains connectivity. */
export function useOfflineFieldQuoteSync() {
  const { isOnline } = useNetwork();
  const utils = trpc.useUtils();
  const syncingRef = useRef(false);
  const [syncState, setSyncState] = useState<{ status: "idle" | "syncing" | "synced"; syncedCount: number; completedAt: number | null }>({ status: "idle", syncedCount: 0, completedAt: null });

  useEffect(() => {
    if (!isOnline || syncingRef.current) return;
    let cancelled = false;
    const sync = async () => {
      syncingRef.current = true;
      let synced = 0;
      setSyncState((current) => ({ ...current, status: "syncing" }));
      try {
        const queue = await readOfflineFieldQuoteQueue();
        for (const item of queue) {
          if (cancelled) break;
          try {
            await utils.client.fieldQuote.submit.mutate(item.payload);
            await removeOfflineFieldQuote(item.id);
            synced += 1;
          } catch {
            // Leave this and subsequent records on the device for the next connection.
            break;
          }
        }
        if (synced > 0 && !cancelled) {
          setSyncState({ status: "synced", syncedCount: synced, completedAt: Date.now() });
          toast.success(`${synced} saved field request${synced === 1 ? "" : "s"} synchronized.`);
        } else if (!cancelled) {
          setSyncState((current) => ({ ...current, status: "idle" }));
        }
      } finally {
        syncingRef.current = false;
      }
    };
    void sync();
    return () => { cancelled = true; };
  }, [isOnline, utils]);

  return syncState;
}
