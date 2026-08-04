/*
 * /ops/faqs — Service FAQ Manager
 * Add, edit, reorder, toggle, and delete FAQs per service page.
 * Changes appear live on the public service pages without a code deploy.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import OpsDashboardLayout from "@/components/OpsDashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown,
  Eye, EyeOff, HelpCircle, ExternalLink,
} from "lucide-react";

const SERVICE_SLUGS = [
  { slug: "forestry-mulching",      label: "Forestry Mulching" },
  { slug: "land-management",        label: "Land Management" },
  { slug: "vegetation-management",  label: "Vegetation Management" },
  { slug: "right-of-way-clearing",  label: "Right-of-Way Clearing" },
  { slug: "trail-cutting",          label: "Trail Cutting" },
  { slug: "brush-hogging",          label: "Brush Hogging" },
  { slug: "site-preparation",       label: "Site Preparation" },
];

type FaqRow = {
  id: number;
  serviceSlug: string;
  question: string;
  answer: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type FaqFormState = {
  question: string;
  answer: string;
  sortOrder: number;
  active: boolean;
};

const EMPTY_FORM: FaqFormState = { question: "", answer: "", sortOrder: 0, active: true };

export default function ServiceFaqs() {
  const [selectedSlug, setSelectedSlug] = useState<string>(SERVICE_SLUGS[0].slug);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FaqFormState>(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: faqs = [], isLoading } = trpc.ops.serviceFaq.list.useQuery(
    { serviceSlug: selectedSlug },
    { staleTime: 30_000 }
  );

  const createMutation = trpc.ops.serviceFaq.create.useMutation({
    onSuccess: () => {
      utils.ops.serviceFaq.list.invalidate({ serviceSlug: selectedSlug });
      toast.success("FAQ added.");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.ops.serviceFaq.update.useMutation({
    onSuccess: () => {
      utils.ops.serviceFaq.list.invalidate({ serviceSlug: selectedSlug });
      toast.success("FAQ updated.");
      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.ops.serviceFaq.delete.useMutation({
    onSuccess: () => {
      utils.ops.serviceFaq.list.invalidate({ serviceSlug: selectedSlug });
      toast.success("FAQ deleted.");
      setDeleteConfirmId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const reorderMutation = trpc.ops.serviceFaq.reorder.useMutation({
    onSuccess: () => utils.ops.serviceFaq.list.invalidate({ serviceSlug: selectedSlug }),
    onError: (e) => toast.error(e.message),
  });

  const toggleActiveMutation = trpc.ops.serviceFaq.update.useMutation({
    onSuccess: () => utils.ops.serviceFaq.list.invalidate({ serviceSlug: selectedSlug }),
    onError: (e) => toast.error(e.message),
  });

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, sortOrder: faqs.length });
    setDialogOpen(true);
  }

  function openEdit(faq: FaqRow) {
    setEditingId(faq.id);
    setForm({
      question: faq.question,
      answer: faq.answer,
      sortOrder: faq.sortOrder,
      active: faq.active,
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error("Question and answer are required.");
      return;
    }
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate({ serviceSlug: selectedSlug, ...form });
    }
  }

  function moveItem(index: number, direction: "up" | "down") {
    const sorted = [...faqs].sort((a, b) => a.sortOrder - b.sortOrder);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;
    // Swap sort orders
    const updates = sorted.map((f, i) => {
      if (i === index) return { id: f.id, sortOrder: sorted[targetIndex].sortOrder };
      if (i === targetIndex) return { id: f.id, sortOrder: sorted[index].sortOrder };
      return { id: f.id, sortOrder: f.sortOrder };
    });
    reorderMutation.mutate(updates);
  }

  const sortedFaqs = [...faqs].sort((a, b) => a.sortOrder - b.sortOrder);
  const serviceLabel = SERVICE_SLUGS.find(s => s.slug === selectedSlug)?.label ?? selectedSlug;

  return (
    <OpsDashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <HelpCircle className="w-5 h-5 text-amber-500" />
              <h1 className="text-xl font-semibold text-white">Service FAQs</h1>
            </div>
            <p className="text-sm text-zinc-400">
              Manage FAQs for each service page. Changes appear live on the public site.
              Dynamic FAQs appear first; hardcoded FAQs fill in below.
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="bg-amber-600 hover:bg-amber-500 text-white gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" /> Add FAQ
          </Button>
        </div>

        {/* Service selector */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="text-sm text-zinc-400 shrink-0">Service page:</span>
          <Select value={selectedSlug} onValueChange={setSelectedSlug}>
            <SelectTrigger className="w-64 bg-zinc-900 border-zinc-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {SERVICE_SLUGS.map(s => (
                <SelectItem key={s.slug} value={s.slug} className="text-white hover:bg-zinc-800">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <a
            href={`/services/${selectedSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            View page <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* FAQ list */}
        {isLoading ? (
          <div className="text-zinc-500 text-sm py-8 text-center">Loading FAQs...</div>
        ) : sortedFaqs.length === 0 ? (
          <div className="border border-dashed border-zinc-700 rounded-lg p-10 text-center">
            <HelpCircle className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm mb-1">No dynamic FAQs for {serviceLabel} yet.</p>
            <p className="text-zinc-600 text-xs">
              The hardcoded FAQs from the code will still show. Add dynamic FAQs here to
              prepend them and override duplicates.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedFaqs.map((faq, index) => (
              <div
                key={faq.id}
                className={`rounded-lg border p-4 transition-colors ${
                  faq.active
                    ? "bg-zinc-900 border-zinc-700"
                    : "bg-zinc-950 border-zinc-800 opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Reorder controls */}
                  <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
                    <button
                      onClick={() => moveItem(index, "up")}
                      disabled={index === 0 || reorderMutation.isPending}
                      className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors"
                      title="Move up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveItem(index, "down")}
                      disabled={index === sortedFaqs.length - 1 || reorderMutation.isPending}
                      className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors"
                      title="Move down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-medium text-white leading-snug flex-1">
                        {faq.question}
                      </p>
                      {!faq.active && (
                        <Badge variant="outline" className="text-zinc-500 border-zinc-700 text-xs shrink-0">
                          Hidden
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                      {faq.answer}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleActiveMutation.mutate({ id: faq.id, active: !faq.active })}
                      className="p-1.5 text-zinc-500 hover:text-amber-400 transition-colors"
                      title={faq.active ? "Hide FAQ" : "Show FAQ"}
                    >
                      {faq.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => openEdit(faq)}
                      className="p-1.5 text-zinc-500 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(faq.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info footer */}
        {sortedFaqs.length > 0 && (
          <p className="text-xs text-zinc-600 mt-4">
            {sortedFaqs.filter(f => f.active).length} of {sortedFaqs.length} FAQs active.
            Use the eye icon to show/hide without deleting. Drag order with the arrows.
          </p>
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit FAQ" : `Add FAQ — ${serviceLabel}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Question</label>
              <Input
                value={form.question}
                onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                placeholder="e.g. How long does forestry mulching take?"
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600"
                maxLength={500}
              />
              <p className="text-xs text-zinc-600 mt-1">{form.question.length}/500</p>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Answer</label>
              <Textarea
                value={form.answer}
                onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                placeholder="Plain text answer. Keep it concise and direct."
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 min-h-[120px] resize-y"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-zinc-400 mb-1.5 block">Sort order (lower = first)</label>
                <Input
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                  className="bg-zinc-800 border-zinc-700 text-white w-24"
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="faq-active"
                  checked={form.active}
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                  className="accent-amber-500"
                />
                <label htmlFor="faq-active" className="text-sm text-zinc-300 cursor-pointer">
                  Active (visible on site)
                </label>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setDialogOpen(false); setEditingId(null); setForm(EMPTY_FORM); }}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-amber-600 hover:bg-amber-500 text-white"
            >
              {editingId ? "Save Changes" : "Add FAQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete FAQ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400 py-2">
            This FAQ will be permanently removed from the {serviceLabel} page. This cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteConfirmId !== null && deleteMutation.mutate({ id: deleteConfirmId })}
              disabled={deleteMutation.isPending}
              className="bg-red-700 hover:bg-red-600 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OpsDashboardLayout>
  );
}
