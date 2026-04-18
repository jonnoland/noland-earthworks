/**
 * /ops/tasks — Owner task list
 * Shows all pending tasks auto-created by agents (e.g. review follow-ups) plus any manual tasks.
 */
import { useState } from "react";
import { CheckSquare, Trash2, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import OpsDashboardLayout from "@/components/OpsDashboardLayout";

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

export default function OpsTasksPage() {
  const [showCompleted, setShowCompleted] = useState(false);
  const { data: tasks, isLoading, refetch } = trpc.ops.tasks.list.useQuery({ includeCompleted: showCompleted });

  const complete = trpc.ops.tasks.complete.useMutation({
    onSuccess: () => { toast.success("Task marked complete."); refetch(); },
    onError: () => toast.error("Failed to complete task."),
  });

  const del = trpc.ops.tasks.delete.useMutation({
    onSuccess: () => { toast.success("Task deleted."); refetch(); },
    onError: () => toast.error("Failed to delete task."),
  });

  const pending = tasks?.filter(t => !t.completed) ?? [];
  const completed = tasks?.filter(t => t.completed) ?? [];

  return (
    <OpsDashboardLayout title="Tasks" subtitle="Agent-created and manual reminders">
      <div className="p-6 max-w-3xl mx-auto space-y-6">

        {/* Header controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {pending.length} pending task{pending.length !== 1 ? "s" : ""}
            </h2>
          </div>
          <button
            onClick={() => setShowCompleted(v => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
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
            <p className="text-sm font-medium text-foreground">All caught up.</p>
            <p className="text-xs text-muted-foreground mt-1">No pending tasks. Agents will add items here automatically.</p>
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
                  {/* Complete button */}
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

                  {/* Content */}
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
                        <span className="text-[11px] text-muted-foreground/60 capitalize">
                          {task.relatedType} #{task.relatedId}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete */}
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
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 px-1">Completed</p>
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
