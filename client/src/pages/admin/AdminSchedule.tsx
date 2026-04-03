import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Calendar, User } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  unscheduled: "rgba(240,237,230,0.3)",
  scheduled: "#60a5fa",
  in_progress: "#22c55e",
  completed: "#a78bfa",
  late: "#ef4444",
};

function statusLabel(s: string) {
  return s?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) ?? s;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AdminSchedule() {
  const { data, isLoading, error } = trpc.jobber.visits.useQuery({ first: 200 });
  const visits = data?.nodes ?? [];

  // Group by day of week for this week
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const visitsByDay = days.map(day => {
    const dayVisits = visits.filter((v: any) => {
      if (!v.startAt) return false;
      const vDate = new Date(v.startAt);
      return (
        vDate.getFullYear() === day.getFullYear() &&
        vDate.getMonth() === day.getMonth() &&
        vDate.getDate() === day.getDate()
      );
    });
    return { day, visits: dayVisits };
  });

  return (
    <AdminLayout title="Schedule">
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#F0EDE6" }}>Schedule</h2>
          <p style={{ color: "rgba(240,237,230,0.45)", fontSize: "13px" }}>
            Week of{" "}
            {weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>

      {isLoading && <LoadingGrid />}
      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "1rem", color: "#ef4444", fontSize: "14px" }}>
          Error: {error.message}
        </div>
      )}

      {!isLoading && !error && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "0.5rem",
          }}
        >
          {visitsByDay.map(({ day, visits: dayVisits }) => {
            const isToday =
              day.getFullYear() === now.getFullYear() &&
              day.getMonth() === now.getMonth() &&
              day.getDate() === now.getDate();
            return (
              <div
                key={day.toISOString()}
                style={{
                  background: isToday ? "rgba(224,123,42,0.07)" : "#1a2035",
                  border: isToday ? "1px solid rgba(224,123,42,0.3)" : "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "10px",
                  padding: "0.75rem",
                  minHeight: "120px",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: isToday ? "#E07B2A" : "rgba(240,237,230,0.5)",
                    marginBottom: "0.5rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {DAYS[day.getDay()]}
                  <span style={{ display: "block", fontSize: "18px", fontWeight: 700, color: isToday ? "#E07B2A" : "#F0EDE6" }}>
                    {day.getDate()}
                  </span>
                </div>
                {dayVisits.length === 0 ? (
                  <div style={{ fontSize: "11px", color: "rgba(240,237,230,0.2)" }}>No visits</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {dayVisits.map((v: any) => (
                      <div
                        key={v.id}
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          borderRadius: "5px",
                          padding: "0.35rem 0.5rem",
                          borderLeft: `3px solid ${STATUS_COLORS[v.status?.toLowerCase()] ?? "rgba(240,237,230,0.2)"}`,
                        }}
                      >
                        <div style={{ fontSize: "11px", color: "#F0EDE6", fontWeight: 500, lineHeight: 1.3 }}>
                          {v.job?.client?.name ?? v.title ?? "Visit"}
                        </div>
                        {v.startAt && (
                          <div style={{ fontSize: "10px", color: "rgba(240,237,230,0.4)" }}>
                            {new Date(v.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </div>
                        )}
                        {v.assignedUsers?.nodes?.length > 0 && (
                          <div style={{ fontSize: "10px", color: "rgba(240,237,230,0.35)", display: "flex", alignItems: "center", gap: "3px" }}>
                            <User size={9} />
                            {v.assignedUsers.nodes.map((u: any) => u.name).join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* All Upcoming Visits */}
      {!isLoading && !error && visits.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#F0EDE6", marginBottom: "1rem" }}>
            All Visits ({data?.totalCount ?? 0})
          </h3>
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
                  {["Client", "Job", "Status", "Start", "Assigned To"].map(h => (
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
                {visits.map((v: any, i: number) => (
                  <tr
                    key={v.id}
                    style={{ borderBottom: i < visits.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                  >
                    <td style={{ padding: "0.65rem 1rem", fontSize: "14px", color: "#F0EDE6", fontWeight: 500 }}>
                      {v.job?.client?.name ?? "—"}
                    </td>
                    <td style={{ padding: "0.65rem 1rem", fontSize: "13px", color: "rgba(240,237,230,0.7)" }}>
                      {v.job ? `#${v.job.jobNumber} ${v.job.title ?? ""}` : v.title ?? "—"}
                    </td>
                    <td style={{ padding: "0.65rem 1rem" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          padding: "2px 8px",
                          borderRadius: "20px",
                          background: `${STATUS_COLORS[v.status?.toLowerCase()] ?? "rgba(240,237,230,0.1)"}22`,
                          color: STATUS_COLORS[v.status?.toLowerCase()] ?? "rgba(240,237,230,0.5)",
                          border: `1px solid ${STATUS_COLORS[v.status?.toLowerCase()] ?? "rgba(240,237,230,0.15)"}44`,
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {statusLabel(v.status)}
                      </span>
                    </td>
                    <td style={{ padding: "0.65rem 1rem", fontSize: "12px", color: "rgba(240,237,230,0.45)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Calendar size={11} />
                      {v.startAt
                        ? new Date(v.startAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </td>
                    <td style={{ padding: "0.65rem 1rem", fontSize: "13px", color: "rgba(240,237,230,0.6)" }}>
                      {v.assignedUsers?.nodes?.map((u: any) => u.name).join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function LoadingGrid() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem" }}>
      {[1, 2, 3, 4, 5, 6, 7].map(i => (
        <div key={i} style={{ background: "#1a2035", borderRadius: "10px", height: "120px", opacity: 0.5 }} />
      ))}
    </div>
  );
}
