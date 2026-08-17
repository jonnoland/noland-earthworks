import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  getNewRequestIds,
  playOpsNewRequestSound,
  type IdentifiableRequest,
} from "@/lib/opsNewRequestAlert";

type IncomingRequestAlertOptions<T extends IdentifiableRequest> = {
  items: readonly T[];
  enabled: boolean;
  label: string;
};

/**
 * Establishes the current list as a baseline on first load, then alerts only
 * for records that appear on a subsequent refresh.
 */
export function useIncomingRequestAlert<T extends IdentifiableRequest>({
  items,
  enabled,
  label,
}: IncomingRequestAlertOptions<T>): void {
  const knownIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    const currentIds = new Set(items.map(item => String(item.id)));
    if (knownIds.current === null) {
      knownIds.current = currentIds;
      return;
    }

    const newIds = getNewRequestIds(knownIds.current, items);
    knownIds.current = currentIds;
    if (!enabled || newIds.length === 0) return;

    void playOpsNewRequestSound();
    const count = newIds.length;
    toast.success(`${count} new ${label}${count === 1 ? "" : "s"} received.`, {
      description: "Operations Quotes has been refreshed.",
    });
  }, [enabled, items, label]);
}
