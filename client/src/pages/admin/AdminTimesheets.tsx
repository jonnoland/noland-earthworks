import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Clock, User, Briefcase } from "lucide-react";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function AdminTimesheets() {
  const { data, isLoading, error } = trpc.jobber.timesheets.useQuery({ first: 200 });
  const entries = data?.nodes ?? [];

  const totalSeconds = entries.reduce((sum: number, e: any) => sum + (e.durationInSeconds ?? 0), 0);

  // Group by user
  const byUser: Record<string, { name: string; seconds: number; entries: any[] }> = {};
  entries.forEach((e: any) => {
    const uid = e.user?.id ?? "unknown";
    if (!byUser[uid]) byUser[uid] = { name: e.user?.name ?? "Unknown", seconds: 0, entries: [] };
    byUser[uid].seconds += e.durationInSeconds ?? 0;
    byUser[uid].entries.push(e);
  });

  return (
    <AdminLayout title="Timesheets">
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#F0EDE6" }}>Timesheets</h2>
        <p style={{ color: "rgba(240,237,230,0.45)", fontSize: "13px" }}>
          {data?.totalCount ?? 0} entries — {formatDuration(totalSeconds)} total
        </p>
      </div>

      {/* Summary by user */}
      {!isLoading && !error && Object.keys(byUser).length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {Object.values(byUser).map(u => (
            <div
              key={u.name}
              style={{
                background: "#1a2035",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                <User size={14} color="#E07B2A" />
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#F0EDE6" }}>{u.name}</span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: "#E07B2A" }}>{formatDuration(u.seconds)}</div>
              <div style={{ fontSize: "12px", color: "rgba(240,237,230,0.4)" }}>{u.entries.length} entries</div>
            </div>
          ))}
        </div>
      )}

      {isLoading && <LoadingRows />}
      {error && <ErrorBox message={error.message} />}
      {!isLoading && !error && entries.length === 0 && <EmptyBox message="No timesheet entries found in Jobber." />}

      {!isLoading && !error && entries.length > 0 && (
        <div
          style={{
            background: "#1a2035",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["Employee", "Job", "Duration", "Date", "Note"].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: "0.75rem 1rem",
                      textAlign: "left",
                      fontSize: "12px",
                      color: "rgba(240,237,230,0.4)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e: any, i: number) => (
                <tr
                  key={e.id}
                  style={{ borderBottom: i < entries.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                >
                  <td style={{ padding: "0.65rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "#F0EDE6", fontWeight: 500 }}>
                      <User size={13} color="#E07B2A" />
                      {e.user?.name ?? "—"}
                    </div>
                  </td>
                  <td style={{ padding: "0.65rem 1rem" }}>
                    {e.job ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "rgba(240,237,230,0.7)" }}>
                        <Briefcase size={12} />
                        #{e.job.jobNumber} {e.job.title ?? ""}
                      </div>
                    ) : (
                      <span style={{ color: "rgba(240,237,230,0.3)", fontSize: "13px" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "0.65rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "#E07B2A", fontWeight: 600 }}>
                      <Clock size={13} />
                      {formatDuration(e.durationInSeconds ?? 0)}
                    </div>
                  </td>
                  <td style={{ padding: "0.65rem 1rem", fontSize: "12px", color: "rgba(240,237,230,0.4)" }}>
                    {e.startAt
                      ? new Date(e.startAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "—"}
                  </td>
                  <td style={{ padding: "0.65rem 1rem", fontSize: "13px", color: "rgba(240,237,230,0.55)" }}>
                    {e.note || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

function LoadingRows() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ background: "#1a2035", borderRadius: "8px", height: "52px", opacity: 0.5 }} />
      ))}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "1rem", color: "#ef4444", fontSize: "14px" }}>
      Error: {message}
    </div>
  );
}

function EmptyBox({ message }: { message: string }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem", color: "rgba(240,237,230,0.35)", fontSize: "14px" }}>
      {message}
    </div>
  );
}
