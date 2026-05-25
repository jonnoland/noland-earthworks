/**
 * Conversations — SMS messaging center
 * Two-column layout: conversation list (left) | message thread (right)
 * Wired to Twilio via tRPC ops.conversations procedures
 */
import { useState, useRef, useEffect } from "react";
import OpsDashboardLayout from "@/components/OpsDashboardLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Plus,
  Phone,
  Search,
  X,
  Circle,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatMessageTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Conversations() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [search, setSearch] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: convList = [], isLoading } = trpc.ops.conversations.list.useQuery();
  const selectedConv = convList.find((c) => c.id === selectedId) ?? null;

  const { data: threadMessages = [], isLoading: loadingMessages } = trpc.ops.conversations.getMessages.useQuery(
    { conversationId: selectedId! },
    { enabled: selectedId !== null }
  );

  const sendMutation = trpc.ops.conversations.send.useMutation({
    onSuccess: () => {
      setMessageText("");
      utils.ops.conversations.getMessages.invalidate({ conversationId: selectedId! });
      utils.ops.conversations.list.invalidate();
    },
    onError: (err) => toast.error(`Send failed: ${err.message}`),
  });

  const createMutation = trpc.ops.conversations.create.useMutation({
    onSuccess: (data) => {
      setShowNewModal(false);
      setNewName("");
      setNewPhone("");
      utils.ops.conversations.list.invalidate();
      setSelectedId(data.id);
      toast.success("Conversation started.");
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const markReadMutation = trpc.ops.conversations.markRead.useMutation({
    onSuccess: () => utils.ops.conversations.list.invalidate(),
  });

  const draftReplyMutation = trpc.ops.conversations.draftReply.useMutation({
    onSuccess: (data) => {
      setMessageText(data.draft);
      toast.success("AI draft ready — review and send.");
    },
    onError: (err) => toast.error(`Draft failed: ${err.message}`),
  });

  const deleteMutation = trpc.ops.conversations.delete.useMutation({
    onSuccess: () => {
      utils.ops.conversations.list.invalidate();
      setSelectedId(null);
      toast.success("Conversation deleted.");
    },
    onError: (err) => toast.error(`Delete failed: ${err.message}`),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages]);

  useEffect(() => {
    if (selectedId && selectedConv?.unread) {
      markReadMutation.mutate({ id: selectedId });
    }
  }, [selectedId]);

  const filtered = convList.filter(
    (c) =>
      c.contactName.toLowerCase().includes(search.toLowerCase()) ||
      c.contactPhone.includes(search)
  );

  function handleSend() {
    if (!messageText.trim() || !selectedId) return;
    sendMutation.mutate({ conversationId: selectedId, body: messageText.trim() });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <OpsDashboardLayout title="Conversations" subtitle="SMS messaging with clients">
      <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-white/10 bg-[#111]">
        {/* Left column — conversation list */}
        <div className="w-80 flex-shrink-0 flex flex-col border-r border-white/10">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm font-semibold text-white">Messages</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-amber-400 hover:bg-amber-400/10"
              onClick={() => setShowNewModal(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {/* Search */}
          <div className="px-3 py-2 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-white/30" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts..."
                className="pl-8 h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
          </div>
          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-white/40 text-sm">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="h-8 w-8 text-white/20 mx-auto mb-2" />
                <p className="text-white/40 text-sm">No conversations yet.</p>
                <button
                  className="mt-2 text-amber-400 text-xs hover:underline"
                  onClick={() => setShowNewModal(true)}
                >
                  Start one
                </button>
              </div>
            ) : (
              filtered.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors",
                    selectedId === conv.id && "bg-amber-400/10 border-l-2 border-l-amber-400"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {conv.unread && (
                        <Circle className="h-2 w-2 fill-amber-400 text-amber-400 flex-shrink-0" />
                      )}
                      <span className={cn("text-sm font-medium truncate", conv.unread ? "text-white" : "text-white/70")}>
                        {conv.contactName}
                      </span>
                    </div>
                    <span className="text-xs text-white/30 flex-shrink-0">
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3 text-white/20 flex-shrink-0" />
                    <span className="text-xs text-white/30 truncate">{conv.contactPhone}</span>
                  </div>
                  {conv.lastMessage && (
                    <p className="text-xs text-white/40 truncate mt-1">{conv.lastMessage}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right column — message thread */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">Select a conversation to view messages</p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                <div>
                  <p className="text-sm font-semibold text-white">{selectedConv.contactName}</p>
                  <p className="text-xs text-white/40">{selectedConv.contactPhone}</p>
                </div>
                <button
                  className="text-white/30 hover:text-red-400 transition-colors"
                  onClick={() => {
                    if (confirm(`Delete conversation with ${selectedConv.contactName}? This cannot be undone.`)) {
                      deleteMutation.mutate({ id: selectedConv.id });
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {loadingMessages ? (
                  <div className="text-center text-white/30 text-sm">Loading messages...</div>
                ) : threadMessages.length === 0 ? (
                  <div className="text-center text-white/30 text-sm py-8">
                    No messages yet. Send the first one below.
                  </div>
                ) : (
                  threadMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn("flex", msg.direction === "outbound" ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-xs px-3 py-2 rounded-xl text-sm",
                          msg.direction === "outbound"
                            ? "bg-amber-500 text-black"
                            : "bg-white/10 text-white"
                        )}
                      >
                        <p>{msg.body}</p>
                        <p className={cn("text-xs mt-1", msg.direction === "outbound" ? "text-black/50" : "text-white/30")}>
                          {formatMessageTime(msg.sentAt)}
                          {msg.status && msg.status !== "sent" && ` · ${msg.status}`}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Compose */}
              <div className="px-4 py-3 border-t border-white/10">
                <div className="flex gap-2 mb-2">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
                    disabled={sendMutation.isPending}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!messageText.trim() || sendMutation.isPending}
                    className="bg-amber-500 hover:bg-amber-400 text-black"
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-amber-400/70 hover:text-amber-400 hover:bg-amber-400/10 gap-1.5 px-2"
                  onClick={() => draftReplyMutation.mutate({ conversationId: selectedId! })}
                  disabled={draftReplyMutation.isPending || !selectedId}
                >
                  {draftReplyMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {draftReplyMutation.isPending ? "Drafting..." : "Draft reply with AI"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-semibold mb-4">New Conversation</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Contact Name</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="John Smith"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Phone Number</label>
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+1 615 555 0100"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button
                variant="ghost"
                className="flex-1 text-white/60"
                onClick={() => { setShowNewModal(false); setNewName(""); setNewPhone(""); }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black"
                disabled={!newName.trim() || !newPhone.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate({ contactName: newName.trim(), contactPhone: newPhone.trim() })}
              >
                Start
              </Button>
            </div>
          </div>
        </div>
      )}
    </OpsDashboardLayout>
  );
}
