/**
 * Employee Registration Page — /ops/register
 * No authentication required. Employees fill out this form to request access.
 * Jon receives a notification and approves or denies from /ops/team.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronRight, Briefcase, LayoutDashboard, HardHat } from "lucide-react";
import { Link } from "wouter";

const ROLES = [
  {
    id: "field_crew" as const,
    label: "Field Crew",
    description: "View your assigned jobs and the work schedule. No financial data.",
    icon: HardHat,
  },
  {
    id: "office" as const,
    label: "Office / Admin",
    description: "View jobs, invoices, and quotes. Suitable for office staff handling billing.",
    icon: Briefcase,
  },
  {
    id: "supervisor" as const,
    label: "Supervisor",
    description: "Full operations view — jobs, schedule, leads, invoices, and quotes. No settings access.",
    icon: LayoutDashboard,
  },
];

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    requestedRole: "field_crew" as "field_crew" | "office" | "supervisor",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const submit = trpc.team.submitRegistration.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (err) => toast.error(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    submit.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      requestedRole: form.requestedRole,
      message: form.message.trim() || undefined,
    });
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-green-400/10">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Request Submitted
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your access request has been sent to the owner for review. You will be contacted once it has been approved.
            </p>
          </div>
          <Link href="/">
            <span className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 cursor-pointer transition-colors">
              Return to site <ChevronRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1
            className="text-3xl font-bold text-foreground mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Request Access
          </h1>
          <p className="text-muted-foreground text-sm">
            Noland Earthworks — Operations Portal
          </p>
          <p className="text-muted-foreground/70 text-xs mt-1">
            Fill out the form below. Your request will be reviewed and approved by the owner.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact info */}
          <div className="ops-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Your Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(615) 555-0100"
                  className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jane@example.com"
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Use the email address you will sign in with.
              </p>
            </div>
          </div>

          {/* Role selection */}
          <div className="ops-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Access Level Requested
            </h2>
            <p className="text-xs text-muted-foreground">
              Select the level of access that matches your role. The owner will confirm the appropriate level before approval.
            </p>
            <div className="space-y-3">
              {ROLES.map((role) => {
                const Icon = role.icon;
                const selected = form.requestedRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, requestedRole: role.id }))}
                    className={cn(
                      "w-full text-left flex items-start gap-3 p-4 rounded-lg border transition-all",
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary hover:border-primary/40"
                    )}
                  >
                    <div className={cn("p-2 rounded-md mt-0.5 shrink-0", selected ? "bg-primary/20" : "bg-background")}>
                      <Icon className={cn("w-4 h-4", selected ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("text-sm font-semibold", selected ? "text-primary" : "text-foreground")}>
                          {role.label}
                        </span>
                        {selected && (
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {role.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional message */}
          <div className="ops-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Additional Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </h2>
            <textarea
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Briefly describe your role or why you need access..."
              rows={3}
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submit.isPending}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold text-sm py-3 rounded-md transition-colors"
          >
            {submit.isPending ? "Submitting..." : "Submit Access Request"}
            {!submit.isPending && <ChevronRight className="w-4 h-4" />}
          </button>

          <p className="text-center text-xs text-muted-foreground/60">
            Already approved?{" "}
            <Link href="/ops">
              <span className="text-primary hover:text-primary/80 cursor-pointer transition-colors">
                Sign in to the portal
              </span>
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
