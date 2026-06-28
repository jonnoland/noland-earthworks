/**
 * AI Chat Widget — public-facing floating chat assistant for nolandearthworks.com
 * Appears as a floating button in the bottom-right corner of all public pages.
 * Collects visitor contact info and creates a lead in the ops dashboard.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { MessageSquare, X, Send, ChevronDown, ExternalLink } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "ne_chat_session";
const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content: "Hey there — thanks for stopping by Noland Earthworks. What can I help you with today? Whether you have questions about land management, forestry mulching, or want to get a quote started, I'm here.",
};

/** Extract phone number from text, returns 10-digit string or null */
function extractPhone(text: string): string | null {
  const match = text.match(/\b(\+?1?\s*[-.]?\s*\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/);
  if (!match) return null;
  const digits = match[1].replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}

/** Extract a likely name from text — looks for "I'm [Name]", "my name is [Name]", or "This is [Name]" */
function extractName(text: string): string | null {
  const patterns = [
    /(?:i['']?m|i am|my name is|this is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[\s,!.]+(?:here|calling|reaching out)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  // Use refs so the latest values are always available synchronously in handleSend
  const visitorNameRef = useRef<string | undefined>(undefined);
  const visitorPhoneRef = useRef<string | undefined>(undefined);
  const [, forceUpdate] = useState(0); // used to re-render after ref updates if needed

  const startSession = trpc.chat.startSession.useMutation();
  const sendMessage = trpc.chat.sendMessage.useMutation();

  // Initialize or resume session
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    startSession.mutate(
      { sessionToken: stored ?? undefined },
      {
        onSuccess: (data) => {
          setSessionToken(data.sessionToken);
          localStorage.setItem(STORAGE_KEY, data.sessionToken);
          if (data.messages && data.messages.length > 0) {
            setMessages([
              WELCOME_MESSAGE,
              ...data.messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
            ]);
          }
        },
      }
    );
  }, []);

  // Scroll to bottom on new messages
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input when opened
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !sessionToken || isTyping) return;

    // Extract contact info synchronously from the current message BEFORE mutating
    const phone = extractPhone(text);
    if (phone && !visitorPhoneRef.current) {
      visitorPhoneRef.current = phone;
    }
    const name = extractName(text);
    if (name && !visitorNameRef.current) {
      visitorNameRef.current = name;
    }

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setIsTyping(true);

    sendMessage.mutate(
      {
        sessionToken,
        message: text,
        visitorName: visitorNameRef.current,
        visitorPhone: visitorPhoneRef.current,
      },
      {
        onSuccess: (data) => {
          setIsTyping(false);
          setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
          if (!isOpen) setHasUnread(true);
        },
        onError: () => {
          setIsTyping(false);
          setMessages(prev => [
            ...prev,
            {
              role: "assistant",
              content: "Sorry, I had trouble connecting. For the fastest response, please fill out the quote form at nolandearthworks.com/quote or call us directly.",
            },
          ]);
        },
      }
    );
  }, [input, sessionToken, isTyping, isOpen, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Show quote CTA after AI has collected contact info or visitor expresses intent
  const showQuoteCTA = messages.some(
    m =>
      m.role === "assistant" &&
      (m.content.toLowerCase().includes("quote form") ||
        m.content.toLowerCase().includes("nolandearthworks.com/quote") ||
        m.content.toLowerCase().includes("get a quote") ||
        m.content.toLowerCase().includes("fill out") ||
        m.content.toLowerCase().includes("jon will follow up") ||
        m.content.toLowerCase().includes("jon will get back"))
  );

  // Build pre-filled quote URL from conversation context
  const quoteUrl = (() => {
    const allText = messages.map(m => m.content).join(" ").toLowerCase();
    const params = new URLSearchParams();
    if (allText.includes("forestry mulch")) params.set("service", "forestry-mulching");
    else if (allText.includes("land clear") || allText.includes("land management")) params.set("service", "land-management");
    else if (allText.includes("brush hog") || allText.includes("brush hogg")) params.set("service", "brush-hogging");
    else if (allText.includes("right of way") || allText.includes("right-of-way")) params.set("service", "right-of-way-clearing");
    const qs = params.toString();
    return qs ? `/quote?${qs}` : "/quote";
  })();

  return (
    <>
      {/* Chat window */}
      {isOpen && (
        <div
          className="fixed right-4 z-50 w-[340px] sm:w-[380px] flex flex-col rounded-xl shadow-2xl overflow-hidden border border-zinc-700
            bottom-[144px] lg:bottom-[72px]"
          style={{
            height: "480px",
            backgroundColor: "#1a1a1a",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ backgroundColor: "#E07B2A" }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
              <span className="font-semibold text-white text-sm">Noland Earthworks</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "text-white rounded-br-none"
                      : "text-zinc-100 rounded-bl-none"
                  }`}
                  style={{
                    backgroundColor: msg.role === "user" ? "#E07B2A" : "#2a2a2a",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div
                  className="rounded-lg rounded-bl-none px-3 py-2 text-sm"
                  style={{ backgroundColor: "#2a2a2a" }}
                >
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="flex items-center gap-2 px-3 py-2 flex-shrink-0 border-t border-zinc-700"
            style={{ backgroundColor: "#111" }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              className="flex-1 bg-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500"
              maxLength={1000}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="p-2 rounded-lg transition-colors disabled:opacity-40"
              style={{ backgroundColor: "#E07B2A", color: "white" }}
              aria-label="Send message"
            >
              <Send size={15} />
            </button>
          </div>

          {/* Quote CTA — shown after AI mentions the quote form or collects contact info */}
          {showQuoteCTA && (
            <div
              className="px-3 pb-2 flex-shrink-0"
              style={{ backgroundColor: "#111" }}
            >
              <a
                href={quoteUrl}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#E07B2A" }}
              >
                <ExternalLink size={14} />
                Get a Free Quote
              </a>
            </div>
          )}

          {/* Footer */}
          <div
            className="text-center py-1 text-xs text-zinc-600 flex-shrink-0"
            style={{ backgroundColor: "#111" }}
          >
            Powered by Noland Earthworks AI
          </div>
        </div>
      )}

      {/* Floating button — raised above sticky mobile CTA bar on small screens */}
      <div className="fixed right-4 z-50 flex flex-col items-center gap-1.5 bottom-[108px] lg:bottom-[56px]">
        {/* Availability label — only shown when chat is closed */}
        {!isOpen && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-md text-xs font-semibold whitespace-nowrap"
            style={{ backgroundColor: "#1a1a1a", color: "#d4d0c8", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" style={{ boxShadow: "0 0 6px #4ade80" }} />
            We're available
          </div>
        )}
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: "#E07B2A" }}
          aria-label={isOpen ? "Close chat" : "Open chat"}
        >
          {isOpen ? (
            <X size={22} className="text-white" />
          ) : (
            <>
              <MessageSquare size={22} className="text-white" />
              {hasUnread && (
                <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
              )}
            </>
          )}
        </button>
      </div>
    </>
  );
}
