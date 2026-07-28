/**
 * NativeClientsSection — client directory backed by native_clients table.
 *
 * Layout mirrors NativeJobsSection:
 *   Left: searchable table with client rows
 *   Right: slide-out detail panel (contact info, job history, notes, edit, delete)
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  DollarSign,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type NativeClient = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  jobCount: number;
  totalSpentCents: number;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type NativeJob = {
  id: number;
  clientName: string;
  serviceType: string | null;
  propertyAddress: string | null;
  totalCents: number;
  status: string;
  scheduledDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
};

type ClientWithJobs = NativeClient & { jobs: NativeJob[] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function jobStatusColor(status: string): string {
  switch (status) {
    case "scheduled": return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "in_progress": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "completed": return "bg-green-500/15 text-green-400 border-green-500/30";
    case "cancelled": return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
    default: return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
  }
}

function jobStatusLabel(status: string): string {
  return status.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

function EditClientDialog({
  client,
  open,
  onClose,
  onSaved,
}: {
  client: NativeClient;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    name: client.name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    address: client.address ?? "",
    notes: client.notes ?? "",
  });

  const updateMutation = trpc.nativeClients.update.useMutation({
    onSuccess: () => {
      utils.nativeClients.list.invalidate();
      utils.nativeClients.getById.invalidate({ id: client.id });
      toast.success("Client updated");
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md bg-zinc-900 border-zinc-700 text-zinc-100">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Email</label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Phone</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Address</label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Internal Notes</label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-zinc-400">
            Cancel
          </Button>
          <Button
            onClick={() =>
              updateMutation.mutate({
                id: client.id,
                name: form.name,
                email: form.email || undefined,
                phone: form.phone || undefined,
                address: form.address || undefined,
                notes: form.notes || undefined,
              })
            }
            disabled={updateMutation.isPending}
            className="bg-amber-600 hover:bg-amber-500 text-white"
          >
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function ClientDetailPanel({
  clientId,
  onClose,
}: {
  clientId: number;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: client, isLoading } = trpc.nativeClients.getById.useQuery({ id: clientId });

  const deleteMutation = trpc.nativeClients.delete.useMutation({
    onSuccess: () => {
      utils.nativeClients.list.invalidate();
      toast.success("Client deleted");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">
        Loading...
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">
        Client not found.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-zinc-800">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">{client.name}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Client since {formatDate(client.createdAt)}
          </p>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 p-4 border-b border-zinc-800">
        <div className="bg-zinc-800/60 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
            <Briefcase className="w-3.5 h-3.5" /> Total Jobs
          </div>
          <div className="text-xl font-bold text-zinc-100">{client.jobCount}</div>
        </div>
        <div className="bg-zinc-800/60 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
            <DollarSign className="w-3.5 h-3.5" /> Total Spent
          </div>
          <div className="text-xl font-bold text-green-400">
            {formatCents(client.totalSpentCents)}
          </div>
        </div>
      </div>

      {/* Contact info */}
      <div className="p-4 border-b border-zinc-800 space-y-2">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
          Contact
        </p>
        {client.phone && (
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <a href={`tel:${client.phone}`} className="hover:text-amber-400">
              {client.phone}
            </a>
          </div>
        )}
        {client.email && (
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <a href={`mailto:${client.email}`} className="hover:text-amber-400 truncate">
              {client.email}
            </a>
          </div>
        )}
        {client.address && (
          <div className="flex items-start gap-2 text-sm text-zinc-300">
            <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
            <span>{client.address}</span>
          </div>
        )}
        {!client.phone && !client.email && !client.address && (
          <p className="text-xs text-zinc-600 italic">No contact details on file.</p>
        )}
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="p-4 border-b border-zinc-800">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
            Notes
          </p>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}

      {/* Job history */}
      <div className="p-4 flex-1">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">
          Job History ({client.jobs.length})
        </p>
        {client.jobs.length === 0 ? (
          <p className="text-xs text-zinc-600 italic">No jobs on record.</p>
        ) : (
          <div className="space-y-2">
            {client.jobs.map((job) => (
              <div
                key={job.id}
                className="bg-zinc-800/60 rounded-lg p-3 border border-zinc-700/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {job.serviceType ?? "Land Clearing"}
                    </p>
                    {job.propertyAddress && (
                      <p className="text-xs text-zinc-500 truncate mt-0.5">
                        {job.propertyAddress}
                      </p>
                    )}
                    <p className="text-xs text-zinc-600 mt-1">
                      {formatDate(job.scheduledDate ?? job.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${jobStatusColor(job.status)}`}
                    >
                      {jobStatusLabel(job.status)}
                    </span>
                    <span className="text-xs font-semibold text-zinc-300">
                      {formatCents(job.totalCents)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-zinc-800 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditOpen(true)}
          className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          className="border-red-900/50 text-red-400 hover:bg-red-900/20"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {editOpen && (
        <EditClientDialog
          client={client}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={() => {}}
        />
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will permanently remove {client.name} from the client directory. Job records
              are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-zinc-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate({ id: client.id })}
              className="bg-red-700 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NativeClientsSection() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: clients = [], isLoading, refetch } = trpc.nativeClients.list.useQuery({
    search: search || undefined,
    limit: 100,
  });

  const syncMutation = trpc.nativeClients.syncFromJobs.useMutation({
    onSuccess: (result) => {
      utils.nativeClients.list.invalidate();
      toast.success(`Sync complete: ${result.created} created, ${result.updated} updated.`);
    },
    onError: (e) => toast.error(e.message),
  });

  const selectedClient = clients.find((c) => c.id === selectedId) ?? null;

  return (
    <div
      className="flex h-full"
      style={{ minHeight: 500 }}
    >
      {/* ── Left: Table ── */}
      <div
        className={`flex flex-col border-r border-zinc-800 transition-all duration-200 ${
          selectedId ? "w-1/2" : "w-full"
        }`}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-3 border-b border-zinc-800">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="text-zinc-400 hover:text-zinc-200 h-8 px-2"
            title="Sync clients from jobs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Count */}
        <div className="px-3 py-1.5 border-b border-zinc-800">
          <span className="text-xs text-zinc-500">
            {isLoading ? "Loading..." : `${clients.length} client${clients.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
              Loading clients...
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-600 text-sm gap-2">
              <User className="w-8 h-8 opacity-30" />
              <p>No clients yet.</p>
              <p className="text-xs text-zinc-700">
                Click the sync button to import from existing jobs.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                  <th className="text-left px-3 py-2 font-medium">Client</th>
                  {!selectedId && (
                    <>
                      <th className="text-left px-3 py-2 font-medium">Contact</th>
                      <th className="text-right px-3 py-2 font-medium">Jobs</th>
                      <th className="text-right px-3 py-2 font-medium">Total Spent</th>
                    </>
                  )}
                  <th className="w-6" />
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => setSelectedId(client.id === selectedId ? null : client.id)}
                    className={`border-b border-zinc-800/50 cursor-pointer transition-colors ${
                      selectedId === client.id
                        ? "bg-amber-900/20"
                        : "hover:bg-zinc-800/40"
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-zinc-200 truncate max-w-[160px]">
                        {client.name}
                      </div>
                      {client.address && (
                        <div className="text-xs text-zinc-500 truncate max-w-[160px] mt-0.5">
                          {client.address.split(",").slice(-2).join(",").trim()}
                        </div>
                      )}
                    </td>
                    {!selectedId && (
                      <>
                        <td className="px-3 py-2.5 text-zinc-400 text-xs">
                          <div>{client.phone ?? "—"}</div>
                          <div className="truncate max-w-[140px]">{client.email ?? ""}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Badge
                            variant="outline"
                            className="border-zinc-700 text-zinc-400 text-[10px]"
                          >
                            {client.jobCount}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-green-400 text-xs">
                          {client.totalSpentCents > 0
                            ? formatCents(client.totalSpentCents)
                            : "—"}
                        </td>
                      </>
                    )}
                    <td className="px-2 py-2.5 text-zinc-600">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Right: Detail Panel ── */}
      {selectedId && (
        <div className="w-1/2 flex flex-col bg-zinc-900/50">
          <ClientDetailPanel
            clientId={selectedId}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}
    </div>
  );
}
