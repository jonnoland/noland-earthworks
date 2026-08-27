/**
 * /ops/tasks — Owner task list
 * Shows all pending tasks auto-created by agents plus any manual tasks.
 * Supports search, relatedType filter, and manual task creation.
 */
import { useState, useMemo } from "react";
import {
  CheckSquare, Trash2, Clock, CheckCircle2, AlertCircle,
  Plus, Search, X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
const OpsDashboardLayout = DashboardLayout;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatDue(dueAt: Date | string) {
  const d = new Date(dueAt);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / 86_400_000);
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: "text-red-400" };
  if (diffDays === 0) return { label: "Due today", color: "text-amber-400" };
  if (diffDays === 1) return { label: "Due tomorrow", color: "text-amber-300" };
  return { label: `Due in ${diffDays}d`, color: "text-muted-foreground" };
}

// ── Add Task Modal ─────────────────────────────────────────────────────────────
function AddTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });

  const create = trpc.ops.tasks.create.useMutation({
    onSuccess: () => { toast.success("Task added."); onCreated(); onClose(); },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    create.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      dueAt: new Date(dueDate + "T12:00:00"),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Add Task</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Follow up with Smith property quote"
              autoFocus
              maxLength={255}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Any additional context..."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Due Date</label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={!title.trim() || create.isPending} className="flex-1">
              {create.isPending ? "Adding..." : "Add Task"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function OpsTasksPage() {
  const [showCompleted, setShowCompleted] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: tasks, isLoading, refetch } = trpc.ops.tasks.list.useQuery(
    { includeCompleted: showCompleted },
    { staleTime: 30_000 }
  );

  const complete = trpc.ops.tasks.complete.useMutation({
    onSuccess: () => { toast.success("Task marked complete."); refetch(); },
    onError: () => toast.error("Failed to complete task."),
  });
  const del = trpc.ops.tasks.delete.useMutation({
    onSuccess: () => { toast.success("Task deleted."); refetch(); },
    onError: () => toast.error("Failed to delete task."),
  });

  const relatedTypes = useMemo(() => {
    const types = new Set<string>();
    (tasks ?? []).forEach(t => { if (t.relatedType) types.add(t.relatedType); });
    return Array.from(types).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let list = tasks ?? [];
    if (typeFilter !== "all") list = list.filter(t => t.relatedType === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [tasks, search, typeFilter]);

  const pending = filteredTasks.filter(t => !t.completed);
  const completed = filteredTasks.filter(t => t.completed);

  return (
    <OpsDashboardLayout title="Tasks" subtitle="Agent-created and manual reminders">
      {showAddModal && (
        <AddTaskModal onClose={() => setShowAddModal(false)} onCreated={() => refetch()} />
      )}
      <div className="p-6 max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {pending.length} pending task{pending.length !== 1 ? "s" : ""}
            </h2>
          </div>
          <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-1.5 self-start sm:self-auto">
            <Plus className="w-3.5 h-3.5" />
            Add Task
          </Button>
        </div>

        {/* Search + filter bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="pl-8 h-8 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {relatedTypes.length > 0 && (
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All types</option>
              {relatedTypes.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowCompleted(p => !p)}
            className="h-8 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary transition-colors whitespace-nowrap"
          >
            {showCompleted ? "Hide completed" : "Show completed"}
          </button>
        </div>

        {/* Pending tasks */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-lg bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500 mb-3" />
            <p className="text-sm font-medium text-foreground">
              {search || typeFilter !== "all" ? "No tasks match your filter." : "All caught up."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {search || typeFilter !== "all"
                ? "Try clearing the search or filter."
                : "No pending tasks. Agents will add items here automatically."}
            </p>
            {(search || typeFilter !== "all") && (
              <button
                onClick={() => { setSearch(""); setTypeFilter("all"); }}
                className="mt-3 text-xs text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map(task => {
              const due = formatDue(task.dueAt);
              const isOverdue = due.label.includes("overdue");
              return (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
                    isOverdue
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-border bg-card hover:bg-secondary/20"
                  }`}
                >
                  <button
                    onClick={() => complete.mutate({ id: task.id })}
                    disabled={complete.isPending}
                    className="mt-0.5 w-5 h-5 rounded border border-border hover:border-green-500 hover:bg-green-500/10 flex items-center justify-center shrink-0 transition-colors"
                    title="Mark complete"
                  >
                    {complete.isPending ? (
                      <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
                    ) : null}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      {isOverdue ? (
                        <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                      ) : (
                        <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                      )}
                      <span className={`text-[11px] font-medium ${due.color}`}>{due.label}</span>
                      {task.relatedType && (
                        <button
                          onClick={() => setTypeFilter(task.relatedType!)}
                          className="text-[11px] text-muted-foreground/60 capitalize hover:text-primary transition-colors"
                          title={`Filter by ${task.relatedType}`}
                        >
                          {task.relatedType} #{task.relatedId}
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => del.mutate({ id: task.id })}
                    disabled={del.isPending}
                    className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Completed tasks */}
        {showCompleted && completed.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 px-1">
              Completed ({completed.length})
            </p>
            {completed.map(task => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-4 rounded-lg border border-border/40 bg-secondary/10 opacity-60"
              >
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/70 line-through leading-snug">{task.title}</p>
                  {task.completedAt && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Completed {new Date(task.completedAt).toLocaleDateString("en-US")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => del.mutate({ id: task.id })}
                  className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </OpsDashboardLayout>
  );
}
