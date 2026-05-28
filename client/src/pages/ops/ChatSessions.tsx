/**
 * Chat Sessions — view all public AI chat sessions with full conversation transcripts.
 * Two-column layout: session list (left) | transcript (right)
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import OpsDashboardLayout from "@/components/OpsDashboardLayout";
import { trpc } from "@/lib/trpc";
import { BotMessageSquare, User, MessageSquare, Phone, Mail, UserCheck, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatFullTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatSessions() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [leadsOnly, setLeadsOnly] = useState(true);
  const [location] = useLocation();
  const utils = trpc.useUtils();

  const { data: sessions = [], isLoading } = trpc.chat.listSessions.useQuery({ limit: 100, leadsOnly });

  const { data: messages = [], isLoading: loadingMessages } = trpc.chat.getSessionMessages.useQuery(
    { sessionId: selectedId! },
    { enabled: selectedId !== null }
  );

  const { data: unreadCount = 0 } = trpc.chat.unreadCount.useQuery();

  const markViewed = trpc.chat.markViewed.useMutation({
    onSuccess: () => {
      utils.chat.unreadCount.invalidate();
      utils.chat.listSessions.invalidate();
    },
  });

  const markAllViewed = trpc.chat.markAllViewed.useMutation({
    onSuccess: () => {
      utils.chat.unreadCount.invalidate();
      utils.chat.listSessions.invalidate();
    },
  });

  // Handle ?session=ID param from Leads page transcript link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionParam = params.get("session");
    if (sessionParam) {
      const id = parseInt(sessionParam, 10);
      if (!isNaN(id)) setSelectedId(id);
    }
  }, [location]);

  function handleSelectSession(id: number) {
    setSelectedId(id);
    markViewed.mutate({ sessionId: id });
  }

  const selectedSession = sessions.find((s) => s.id === selectedId) ?? null;

  return (
    <OpsDashboardLayout title="Chat Sessions" subtitle="AI chat conversations from the public website">
      <div className="flex h-[calc(100vh-120px)] gap-0 overflow-hidden rounded-lg border border-zinc-800">
        {/* Session list */}
        <div className="w-80 flex-shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-900/50">
          <div className="px-4 py-3 border-b border-zinc-800 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-zinc-500">
                {sessions.length} session{sessions.length !== 1 ? "s" : ""}
              </p>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllViewed.mutate()}
                  disabled={markAllViewed.isPending}
                  className="text-[11px] font-medium text-teal-400 hover:text-teal-300 disabled:opacity-50 transition-colors whitespace-nowrap">
                  {markAllViewed.isPending ? "Marking..." : `Mark all read (${unreadCount})`}
                </button>
              )}
            </div>
            <div className="flex rounded-md overflow-hidden border border-zinc-700 text-[11px] font-medium">
              <button
                onClick={() => setLeadsOnly(true)}
                className={cn(
                  "flex-1 py-1 transition-colors",
                  leadsOnly ? "bg-teal-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                )}>
                Leads
              </button>
              <button
                onClick={() => setLeadsOnly(false)}
                className={cn(
                  "flex-1 py-1 transition-colors border-l border-zinc-700",
                  !leadsOnly ? "bg-zinc-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                )}>
                All Chats
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-zinc-500 text-sm">Loading sessions...</div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <BotMessageSquare size={32} className="text-zinc-600" />
              <p className="text-sm text-zinc-500">No chat sessions yet.</p>
              <p className="text-xs text-zinc-600">Sessions appear here when visitors use the chat widget on the website.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-zinc-800/60 transition-colors hover:bg-zinc-800/50",
                    selectedId === session.id && "bg-zinc-800 border-l-2 border-l-orange-500"
                  )}
                >
                    <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative flex-shrink-0">
                        {!session.viewedAt && selectedId !== session.id && (
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-teal-400 z-10" />
                        )}
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold",
                          session.leadCreated ? "bg-green-900/60 text-green-400" : "bg-zinc-700 text-zinc-400"
                        )}>
                          {session.visitorName ? session.visitorName.charAt(0).toUpperCase() : "?"}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">
                          {session.visitorName ?? "Unknown Visitor"}
                        </p>
                        {session.visitorPhone && (
                          <p className="text-xs text-zinc-500 truncate">{session.visitorPhone}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs text-zinc-500">{formatRelativeTime(session.updatedAt)}</p>
                      {session.leadCreated && (
                        <Badge variant="outline" className="mt-1 text-[10px] border-green-700 text-green-400 px-1 py-0">
                          Lead
                        </Badge>
                      )}
                    </div>
                  </div>
                  {selectedId !== session.id && (
                    <div className="flex items-center gap-1 mt-1.5 ml-9">
                      <ChevronRight size={12} className="text-zinc-600" />
                      <span className="text-xs text-zinc-600">View transcript</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Transcript panel */}
        <div className="flex-1 flex flex-col bg-zinc-950 min-w-0">
          {!selectedSession ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
              <MessageSquare size={40} className="text-zinc-700" />
              <p className="text-zinc-500 text-sm">Select a session to view the transcript</p>
            </div>
          ) : (
            <>
              {/* Session header */}
              <div className="px-5 py-4 border-b border-zinc-800 flex-shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-100">
                      {selectedSession.visitorName ?? "Unknown Visitor"}
                    </h2>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      {selectedSession.visitorPhone && (
                        <span className="flex items-center gap-1 text-xs text-zinc-400">
                          <Phone size={11} /> {selectedSession.visitorPhone}
                        </span>
                      )}
                      {selectedSession.visitorEmail && (
                        <span className="flex items-center gap-1 text-xs text-zinc-400">
                          <Mail size={11} /> {selectedSession.visitorEmail}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Clock size={11} /> Started {formatFullTime(selectedSession.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {selectedSession.leadCreated ? (
                      <Badge className="bg-green-900/50 text-green-400 border-green-700 text-xs">
                        <UserCheck size={11} className="mr-1" /> Lead Created
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-zinc-500 border-zinc-700 text-xs">
                        No Lead
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-zinc-500 text-sm">Loading transcript...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-zinc-600 text-sm">No messages in this session.</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-3",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-7 h-7 rounded-full bg-orange-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <BotMessageSquare size={14} className="text-orange-400" />
                        </div>
                      )}
                      <div className="max-w-[75%]">
                        <div
                          className={cn(
                            "rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                            msg.role === "user"
                              ? "bg-orange-600/20 text-zinc-100 rounded-br-none"
                              : "bg-zinc-800 text-zinc-200 rounded-bl-none"
                          )}
                        >
                          {msg.content}
                        </div>
                        <p className={cn(
                          "text-[10px] text-zinc-600 mt-1",
                          msg.role === "user" ? "text-right" : "text-left"
                        )}>
                          {formatFullTime(msg.createdAt)}
                        </p>
                      </div>
                      {msg.role === "user" && (
                        <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User size={14} className="text-zinc-400" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </OpsDashboardLayout>
  );
}
