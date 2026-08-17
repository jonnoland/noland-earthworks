import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  formatNewRequestAlert,
  getNewRequestIds,
  playOpsNewRequestSound,
  showOpsNewRequestBrowserNotification,
  type IdentifiableRequest,
} from "@/lib/opsNewRequestAlert";

type IncomingRequestAlertOptions<T extends IdentifiableRequest> = {
  items: readonly T[];
  isReady: boolean;
  enabled: boolean;
  browserNotificationsEnabled: boolean;
  label: string;
  onNewRequests?: (count: number, label: string) => void;
};

/**
 * Establishes the current list as a baseline on first load, then alerts only
 * for records that appear on a subsequent refresh.
 */
export function useIncomingRequestAlert<T extends IdentifiableRequest>({
  items,
  isReady,
  enabled,
  browserNotificationsEnabled,
  label,
  onNewRequests,
}: IncomingRequestAlertOptions<T>): void {
  const knownIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    // Query hooks initially expose an empty fallback before their first real
    // response. Wait for that response before establishing the silent baseline.
    if (!isReady) return;
    const currentIds = new Set(items.map(item => String(item.id)));
    if (knownIds.current === null) {
      knownIds.current = currentIds;
      return;
    }

    const newIds = getNewRequestIds(knownIds.current, items);
    knownIds.current = currentIds;
    if (newIds.length === 0) return;

    const count = newIds.length;
    onNewRequests?.(count, label);
    if (enabled) void playOpsNewRequestSound();
    if (browserNotificationsEnabled) showOpsNewRequestBrowserNotification(count, label);
    toast.success(formatNewRequestAlert(count, label), {
      description: "Operations Quotes has been refreshed.",
    });
  }, [browserNotificationsEnabled, enabled, isReady, items, label, onNewRequests]);
}
