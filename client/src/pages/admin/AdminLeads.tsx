import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Phone, Mail, MapPin, Clock, Tag, BarChart2, ChevronDown } from "lucide-react";

// ─── Source metadata ──────────────────────────────────────────────────────────
const SOURCE_OPTIONS = [
  { value: "google_search",   label: "Google Search",     color: "#4285F4" },
  { value: "google_maps",     label: "Google Maps",       color: "#34A853" },
  { value: "facebook",        label: "Facebook",          color: "#1877F2" },
  { value: "instagram",       label: "Instagram",         color: "#E1306C" },
  { value: "word_of_mouth",   label: "Word of Mouth",     color: "#E07B2A" },
  { value: "yard_sign",       label: "Yard Sign",         color: "#f59e0b" },
  { value: "truck_wrap",      label: "Truck Wrap",        color: "#8b5cf6" },
  { value: "website",         label: "Website",           color: "#06b6d4" },
  { value: "repeat_customer", label: "Repeat Customer",   color: "#22c55e" },
  { value: "angi",            label: "Angi",              color: "#ff6b35" },
  { value: "nextdoor",        label: "Nextdoor",          color: "#00b259" },
  { value: "other",           label: "Other",             color: "rgba(240,237,230,0.35)" },
] as const;

type SourceValue = (typeof SOURCE_OPTIONS)[number]["value"];

function sourceColor(val: string) {
  return SOURCE_OPTIONS.find(s => s.value === val)?.color ?? "rgba(240,237,230,0.35)";
}
function sourceLabel(val: string) {
  return SOURCE_OPTIONS.find(s => s.value === val)?.label ?? val;
}

const STATUS_COLORS: Record<string, string> = {
  new: "#22c55e",
  pending: "#f59e0b",
  converted: "#60a5fa",
  archived: "rgba(240,237,230,0.3)",
};

function statusLabel(s: string) {
  return s?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) ?? s;
}

// ─── Source Breakdown Chart ───────────────────────────────────────────────────
function SourceBreakdown() {
  const { data: breakdown, isLoading } = trpc.jobber.getLeadSourceBreakdown.useQuery();
  const { data: allSources } = trpc.jobber.getLeadSources.useQuery();

  const total = breakdown?.reduce((s, r) => s + r.count, 0) ?? 0;

  if (isLoading) {
    return (
      <div style={{ background: "#1a2035", borderRadius: "10px", height: "120px", opacity: 0.5, marginBottom: "1.5rem" }} />
    );
  }

  if (!breakdown || breakdown.length === 0) {
    return (
      <div
        style={{
          background: "#1a2035",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "10px",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          color: "rgba(240,237,230,0.4)",
          fontSize: "13px",
        }}
      >
        <BarChart2 size={18} style={{ opacity: 0.4 }} />
        No lead sources tagged yet. Use the dropdowns below to tag each lead.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#1a2035",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "10px",
        padding: "1.25rem 1.5rem",
        marginBottom: "1.5rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <BarChart2 size={16} color="#E07B2A" />
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#F0EDE6", margin: 0 }}>Lead Source Breakdown</h3>
        <span style={{ fontSize: "12px", color: "rgba(240,237,230,0.35)", marginLeft: "auto" }}>
          {total} tagged lead{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Stacked bar */}
      <div style={{ height: "12px", borderRadius: "6px", overflow: "hidden", display: "flex", marginBottom: "1rem" }}>
        {breakdown.map(row => (
          <div
            key={row.source}
            title={`${sourceLabel(row.source)}: ${row.count}`}
            style={{
              width: `${(row.count / total) * 100}%`,
              background: sourceColor(row.source),
              transition: "width 0.4s ease",
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1.25rem" }}>
        {breakdown.map(row => {
          const pct = Math.round((row.count / total) * 100);
          return (
            <div key={row.source} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: sourceColor(row.source), flexShrink: 0 }} />
              <span style={{ color: "#F0EDE6" }}>{sourceLabel(row.source)}</span>
              <span style={{ color: "rgba(240,237,230,0.4)" }}>{row.count} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Source Tag Dropdown ──────────────────────────────────────────────────────
function SourceTagDropdown({
  requestId,
  clientName,
  currentSource,
}: {
  requestId: string;
  clientName?: string;
  currentSource?: string;
}) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string>(currentSource ?? "");

  const setSource = trpc.jobber.setLeadSource.useMutation({
    onSuccess: () => {
      utils.jobber.getLeadSources.invalidate();
      utils.jobber.getLeadSourceBreakdown.invalidate();
    },
  });

  const handleSelect = async (val: SourceValue) => {
    setOpen(false);
    setSelected(val);
    setSaving(true);
    await setSource.mutateAsync({
      jobberRequestId: requestId,
      clientName,
      source: val,
    });
    setSaving(false);
  };

  const color = selected ? sourceColor(selected) : "rgba(240,237,230,0.25)";

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "4px 10px",
          borderRadius: "20px",
          border: `1px solid ${color}55`,
          background: selected ? `${color}15` : "rgba(255,255,255,0.04)",
          color: selected ? color : "rgba(240,237,230,0.4)",
          fontSize: "12px",
          fontWeight: selected ? 600 : 400,
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "all 0.15s",
        }}
      >
        <Tag size={11} />
        {saving ? "Saving…" : selected ? sourceLabel(selected) : "Tag source"}
        <ChevronDown size={11} />
      </button>

      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              right: 0,
              zIndex: 50,
              background: "#0f1117",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              padding: "4px",
              minWidth: "180px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            {SOURCE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "6px 10px",
                  background: selected === opt.value ? `${opt.color}18` : "transparent",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: selected === opt.value ? opt.color : "rgba(240,237,230,0.7)",
                  textAlign: "left",
                }}
              >
                <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: opt.color, flexShrink: 0 }} />
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminLeads() {
  const { data, isLoading, error } = trpc.jobber.requests.useQuery({ first: 100 });
  const { data: sourceTags } = trpc.jobber.getLeadSources.useQuery();
  const requests = data?.nodes ?? [];

  // Build a quick lookup: jobberRequestId → source
  const sourceMap: Record<string, string> = {};
  sourceTags?.forEach((t: any) => { sourceMap[t.jobberRequestId] = t.source; });

  return (
    <AdminLayout title="Leads">
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#F0EDE6" }}>Leads</h2>
          <p style={{ color: "rgba(240,237,230,0.45)", fontSize: "13px" }}>
            {data?.totalCount ?? 0} total requests from Jobber
          </p>
        </div>
      </div>

      {/* Lead Source Breakdown */}
      <SourceBreakdown />

      {isLoading && <LoadingState />}
      {error && <ErrorState message={error.message} />}

      {!isLoading && !error && requests.length === 0 && (
        <EmptyState message="No leads found in Jobber." />
      )}

      {!isLoading && !error && requests.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {requests.map((req: any) => {
            const clientName = req.client?.name ?? req.contactName ?? undefined;
            return (
              <div
                key={req.id}
                style={{
                  background: "#1a2035",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "10px",
                  padding: "1.1rem 1.25rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "15px", fontWeight: 600, color: "#F0EDE6" }}>
                        {req.title || clientName || "Untitled Request"}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "20px",
                          background: `${STATUS_COLORS[req.requestStatus?.toLowerCase()] ?? "rgba(240,237,230,0.1)"}22`,
                          color: STATUS_COLORS[req.requestStatus?.toLowerCase()] ?? "rgba(240,237,230,0.5)",
                          border: `1px solid ${STATUS_COLORS[req.requestStatus?.toLowerCase()] ?? "rgba(240,237,230,0.15)"}44`,
                          fontWeight: 500,
                        }}
                      >
                        {statusLabel(req.requestStatus)}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", fontSize: "13px", color: "rgba(240,237,230,0.55)" }}>
                      {req.phone && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Phone size={12} /> {req.phone}
                        </span>
                      )}
                      {req.email && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Mail size={12} /> {req.email}
                        </span>
                      )}
                      {req.property?.address && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <MapPin size={12} />
                          {[req.property.address.street1, req.property.address.city, req.property.address.province]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "rgba(240,237,230,0.35)" }}>
                      <Clock size={11} />
                      {new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <SourceTagDropdown
                      requestId={req.id}
                      clientName={clientName}
                      currentSource={sourceMap[req.id]}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}

function LoadingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: "#1a2035", borderRadius: "10px", height: "80px", opacity: 0.5 }} />
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "1rem", color: "#ef4444", fontSize: "14px" }}>
      Error: {message}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem", color: "rgba(240,237,230,0.35)", fontSize: "14px" }}>
      {message}
    </div>
  );
}
