/**
 * SmsToastNotifier — polls for new unread inbound SMS conversations every 30s.
 * When a new message arrives, shows a toast with the sender's name and message preview.
 * Clicking the toast navigates to /ops/conversations.
 *
 * Only active when the user is authenticated (owner). Silently does nothing for
 * unauthenticated visitors or when the ops API is unavailable.
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { MessageSquare } from "lucide-react";

export default function SmsToastNotifier() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // Track the last conversation ID we toasted about to avoid repeat toasts
  const lastSeenId = useRef<number | null>(null);
  // Track whether this is the first poll (skip toast on initial page load)
  const isFirstPoll = useRef(true);

  const { data: latest } = trpc.ops.conversations.latestUnread.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30_000,
    retry: false,
  });

  useEffect(() => {
    if (!latest) {
      // No unread conversations — reset so we toast again if a new one arrives
      isFirstPoll.current = false;
      return;
    }

    // Skip toast on the very first poll (page load) to avoid spamming on refresh
    if (isFirstPoll.current) {
      isFirstPoll.current = false;
      lastSeenId.current = latest.id;
      return;
    }

    // Only toast if this is a different (newer) conversation than the last one we showed
    if (latest.id === lastSeenId.current) return;

    lastSeenId.current = latest.id;

    const preview = latest.lastMessage
      ? latest.lastMessage.length > 80
        ? latest.lastMessage.slice(0, 77) + "..."
        : latest.lastMessage
      : "New message received";

    toast(
      <div
        className="flex items-start gap-3 cursor-pointer"
        onClick={() => navigate("/ops/conversations")}
      >
        <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-green-600/20 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-green-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">{latest.contactName}</p>
          <p className="text-xs text-white/60 mt-0.5 leading-snug">{preview}</p>
          <p className="text-[10px] text-green-400/80 mt-1">Tap to open conversation</p>
        </div>
      </div>,
      {
        duration: 8000,
        className: "cursor-pointer",
        style: { background: "#1a1a1a", border: "1px solid #2a2a2a" },
      }
    );
  }, [latest, navigate]);

  return null;
}
