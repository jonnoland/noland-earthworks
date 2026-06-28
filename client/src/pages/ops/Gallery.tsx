/**
 * Ops Gallery — upload, tag, and manage job photos.
 * Photos marked visible=true appear on the public /gallery page.
 */
import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Upload,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ImagePlus,
  X,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type ServiceType =
  | "forestry-mulching"
  | "land-management"
  | "brush-hogging"
  | "vegetation-management"
  | "gravel-driveway"
  | "other";

type PhotoType = "before" | "after" | "general";

const SERVICE_LABELS: Record<ServiceType, string> = {
  "forestry-mulching": "Forestry Mulching",
  "land-management": "Land Management",
  "brush-hogging": "Brush Hogging",
  "vegetation-management": "Vegetation Management",
  "gravel-driveway": "Gravel / Driveway",
  other: "Other",
};

const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  before: "Before",
  after: "After",
  general: "General",
};

const PHOTO_TYPE_COLORS: Record<PhotoType, string> = {
  before: "bg-red-900/40 text-red-300 border-red-700",
  after: "bg-green-900/40 text-green-300 border-green-700",
  general: "bg-zinc-800 text-zinc-300 border-zinc-600",
};

const MAX_FILE_MB = 10;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/gif"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix (data:image/jpeg;base64,)
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Upload Queue Item ────────────────────────────────────────────────────────
interface QueueItem {
  id: string;
  file: File;
  preview: string;
  title: string;
  description: string;
  serviceType: ServiceType;
  county: string;
  acreage: string;
  photoType: PhotoType;
  visible: boolean;
  status: "pending" | "uploading" | "done" | "error";
  errorMsg?: string;
}

// ─── Edit Modal State ─────────────────────────────────────────────────────────
interface EditState {
  id: number;
  title: string;
  description: string;
  serviceType: ServiceType;
  county: string;
  acreage: string;
  photoType: PhotoType;
  visible: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function OpsGallery() {
  const utils = trpc.useUtils();

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: photos = [], isLoading } = trpc.gallery.listAll.useQuery();

  // ── Upload queue ──────────────────────────────────────────────────────────
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [editItem, setEditItem] = useState<EditState | null>(null);

  // ── Delete confirm ────────────────────────────────────────────────────────
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // ── Filter ────────────────────────────────────────────────────────────────
  const [filterService, setFilterService] = useState<ServiceType | "all">("all");
  const [filterType, setFilterType] = useState<PhotoType | "all">("all");

  // ── Mutations ─────────────────────────────────────────────────────────────
  const uploadMutation = trpc.gallery.uploadPhoto.useMutation({
    onSuccess: () => utils.gallery.listAll.invalidate(),
  });
  const updateMutation = trpc.gallery.updatePhoto.useMutation({
    onSuccess: () => {
      utils.gallery.listAll.invalidate();
      setEditItem(null);
      toast.success("Photo updated");
    },
  });
  const deleteMutation = trpc.gallery.deletePhoto.useMutation({
    onSuccess: () => {
      utils.gallery.listAll.invalidate();
      setDeleteId(null);
      toast.success("Photo deleted");
    },
  });
  const toggleVisibleMutation = trpc.gallery.updatePhoto.useMutation({
    onSuccess: () => utils.gallery.listAll.invalidate(),
  });

  // ── File handling ─────────────────────────────────────────────────────────
  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid = arr.filter((f) => {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        toast.error(`Skipped ${f.name}: Unsupported file type.`);
        return false;
      }
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`Skipped ${f.name}: File exceeds ${MAX_FILE_MB} MB limit.`);
        return false;
      }
      return true;
    });

    const items: QueueItem[] = valid.map((f) => ({
      id: `${Date.now()}-${Math.random()}`,
      file: f,
      preview: URL.createObjectURL(f),
      title: f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
      description: "",
      serviceType: "forestry-mulching",
      county: "Middle Tennessee",
      acreage: "",
      photoType: "general",
      visible: true,
      status: "pending",
    }));

    setQueue((prev) => [...prev, ...items]);
    if (items.length > 0) setShowUploadPanel(true);
  }, [toast]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const updateQueueItem = (id: string, patch: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeFromQueue = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  // ── Upload all pending ────────────────────────────────────────────────────
  const uploadAll = async () => {
    const pending = queue.filter((i) => i.status === "pending");
    if (pending.length === 0) return;

    for (const item of pending) {
      updateQueueItem(item.id, { status: "uploading" });
      try {
        const base64 = await fileToBase64(item.file);
        await uploadMutation.mutateAsync({
          base64,
          mimeType: item.file.type as "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/gif",
          fileName: item.file.name,
          title: item.title,
          description: item.description || undefined,
          serviceType: item.serviceType,
          county: item.county,
          acreage: item.acreage || undefined,
          photoType: item.photoType,
          visible: item.visible,
        });
        updateQueueItem(item.id, { status: "done" });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        updateQueueItem(item.id, { status: "error", errorMsg: msg });
      }
    }

    // Remove done items after a short delay
    setTimeout(() => {
      setQueue((prev) => {
        prev.filter((i) => i.status === "done").forEach((i) => URL.revokeObjectURL(i.preview));
        return prev.filter((i) => i.status !== "done");
      });
      if (queue.filter((i) => i.status !== "done").length === 0) {
        setShowUploadPanel(false);
      }
    }, 1200);

    toast.success(`${pending.length} photo${pending.length > 1 ? "s" : ""} uploaded`);
  };

  // ── Filtered photos ───────────────────────────────────────────────────────
  const filtered = photos.filter((p) => {
    if (filterService !== "all" && p.serviceType !== filterService) return false;
    if (filterType !== "all" && p.photoType !== filterType) return false;
    return true;
  });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Gallery</h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              {photos.length} photo{photos.length !== 1 ? "s" : ""} &mdash;{" "}
              {photos.filter((p) => p.visible).length} visible on site
            </p>
          </div>
          <Button
            onClick={() => setShowUploadPanel(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
          >
            <ImagePlus className="w-4 h-4" />
            Upload Photos
          </Button>
        </div>

        {/* Upload Panel */}
        {showUploadPanel && (
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Upload Queue</h2>
              <button
                onClick={() => setShowUploadPanel(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-zinc-600 hover:border-orange-500/60 hover:bg-zinc-800/50"
              }`}
            >
              <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">
                Drag photos here or <span className="text-orange-400 font-medium">click to browse</span>
              </p>
              <p className="text-xs text-zinc-600 mt-1">JPG, PNG, WEBP, HEIC — max {MAX_FILE_MB} MB each</p>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                multiple
                className="hidden"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>

            {/* Queue items */}
            {queue.length > 0 && (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 bg-zinc-800 rounded-lg p-3 items-start"
                  >
                    {/* Thumbnail */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={item.preview}
                        alt=""
                        className="w-20 h-20 object-cover rounded-md"
                      />
                      {item.status === "uploading" && (
                        <div className="absolute inset-0 bg-black/60 rounded-md flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                        </div>
                      )}
                      {item.status === "done" && (
                        <div className="absolute inset-0 bg-green-900/60 rounded-md flex items-center justify-center">
                          <span className="text-green-300 text-xs font-bold">Done</span>
                        </div>
                      )}
                      {item.status === "error" && (
                        <div className="absolute inset-0 bg-red-900/60 rounded-md flex items-center justify-center">
                          <span className="text-red-300 text-xs font-bold">Error</span>
                        </div>
                      )}
                    </div>

                    {/* Fields */}
                    <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                      <div className="col-span-2">
                        <Input
                          value={item.title}
                          onChange={(e) => updateQueueItem(item.id, { title: e.target.value })}
                          placeholder="Title"
                          className="bg-zinc-700 border-zinc-600 text-white text-sm h-8"
                          disabled={item.status !== "pending"}
                        />
                      </div>
                      <Select
                        value={item.serviceType}
                        onValueChange={(v) => updateQueueItem(item.id, { serviceType: v as ServiceType })}
                        disabled={item.status !== "pending"}
                      >
                        <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(SERVICE_LABELS).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={item.photoType}
                        onValueChange={(v) => updateQueueItem(item.id, { photoType: v as PhotoType })}
                        disabled={item.status !== "pending"}
                      >
                        <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PHOTO_TYPE_LABELS).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={item.county}
                        onChange={(e) => updateQueueItem(item.id, { county: e.target.value })}
                        placeholder="County / Region"
                        className="bg-zinc-700 border-zinc-600 text-white text-xs h-8"
                        disabled={item.status !== "pending"}
                      />
                      <Input
                        value={item.acreage}
                        onChange={(e) => updateQueueItem(item.id, { acreage: e.target.value })}
                        placeholder="Acreage (e.g. 3.5 acres)"
                        className="bg-zinc-700 border-zinc-600 text-white text-xs h-8"
                        disabled={item.status !== "pending"}
                      />
                      <div className="col-span-2">
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateQueueItem(item.id, { description: e.target.value })}
                          placeholder="Description (optional)"
                          className="bg-zinc-700 border-zinc-600 text-white text-xs resize-none"
                          rows={2}
                          disabled={item.status !== "pending"}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.visible}
                          onCheckedChange={(v) => updateQueueItem(item.id, { visible: v })}
                          disabled={item.status !== "pending"}
                        />
                        <span className="text-xs text-zinc-400">Show on site</span>
                      </div>
                    </div>

                    {/* Remove */}
                    {item.status === "pending" && (
                      <button
                        onClick={() => removeFromQueue(item.id)}
                        className="text-zinc-500 hover:text-red-400 flex-shrink-0 mt-0.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {queue.filter((i) => i.status === "pending").length > 0 && (
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    queue.forEach((i) => URL.revokeObjectURL(i.preview));
                    setQueue([]);
                    setShowUploadPanel(false);
                  }}
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={uploadAll}
                  disabled={uploadMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Upload {queue.filter((i) => i.status === "pending").length} Photo
                  {queue.filter((i) => i.status === "pending").length !== 1 ? "s" : ""}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={filterService} onValueChange={(v) => setFilterService(v as ServiceType | "all")}>
            <SelectTrigger className="w-48 bg-zinc-900 border-zinc-700 text-white text-sm h-8">
              <SelectValue placeholder="All Services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {Object.entries(SERVICE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as PhotoType | "all")}>
            <SelectTrigger className="w-36 bg-zinc-900 border-zinc-700 text-white text-sm h-8">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(PHOTO_TYPE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterService !== "all" || filterType !== "all") && (
            <button
              onClick={() => { setFilterService("all"); setFilterType("all"); }}
              className="text-xs text-zinc-400 hover:text-white underline"
            >
              Clear filters
            </button>
          )}
          <span className="text-xs text-zinc-500 ml-auto">
            {filtered.length} of {photos.length} photos
          </span>
        </div>

        {/* Photo Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading photos...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-500 border border-dashed border-zinc-700 rounded-xl">
            <ImagePlus className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No photos yet. Upload your first job photo above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map((photo) => (
              <div
                key={photo.id}
                className={`group relative rounded-lg overflow-hidden border ${
                  photo.visible ? "border-zinc-700" : "border-zinc-800 opacity-50"
                } bg-zinc-900`}
              >
                <img
                  src={photo.url}
                  alt={photo.title}
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() =>
                        toggleVisibleMutation.mutate({ id: photo.id, visible: !photo.visible })
                      }
                      className="p-1.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300"
                      title={photo.visible ? "Hide from site" : "Show on site"}
                    >
                      {photo.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() =>
                        setEditItem({
                          id: photo.id,
                          title: photo.title,
                          description: photo.description ?? "",
                          serviceType: photo.serviceType as ServiceType,
                          county: photo.county,
                          acreage: photo.acreage ?? "",
                          photoType: photo.photoType as PhotoType,
                          visible: photo.visible,
                        })
                      }
                      className="p-1.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(photo.id)}
                      className="p-1.5 rounded bg-zinc-800/80 hover:bg-red-700 text-zinc-300 hover:text-white"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    {photo.title && (
                      <p className="text-xs text-white font-medium truncate">{photo.title}</p>
                    )}
                    <p className="text-xs text-zinc-400 truncate">{photo.county}</p>
                  </div>
                </div>
                {/* Badges */}
                <div className="absolute top-1.5 left-1.5 flex gap-1 flex-wrap">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${PHOTO_TYPE_COLORS[photo.photoType as PhotoType]}`}
                  >
                    {PHOTO_TYPE_LABELS[photo.photoType as PhotoType]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Photo</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div>
                <Label className="text-zinc-300 text-sm">Title</Label>
                <Input
                  value={editItem.title}
                  onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
                  className="bg-zinc-800 border-zinc-600 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-zinc-300 text-sm">Description</Label>
                <Textarea
                  value={editItem.description}
                  onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                  className="bg-zinc-800 border-zinc-600 text-white mt-1 resize-none"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-zinc-300 text-sm">Service Type</Label>
                  <Select
                    value={editItem.serviceType}
                    onValueChange={(v) => setEditItem({ ...editItem, serviceType: v as ServiceType })}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SERVICE_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-zinc-300 text-sm">Photo Type</Label>
                  <Select
                    value={editItem.photoType}
                    onValueChange={(v) => setEditItem({ ...editItem, photoType: v as PhotoType })}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PHOTO_TYPE_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-zinc-300 text-sm">County / Region</Label>
                  <Input
                    value={editItem.county}
                    onChange={(e) => setEditItem({ ...editItem, county: e.target.value })}
                    className="bg-zinc-800 border-zinc-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300 text-sm">Acreage</Label>
                  <Input
                    value={editItem.acreage}
                    onChange={(e) => setEditItem({ ...editItem, acreage: e.target.value })}
                    placeholder="e.g. 3.5 acres"
                    className="bg-zinc-800 border-zinc-600 text-white mt-1"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={editItem.visible}
                  onCheckedChange={(v) => setEditItem({ ...editItem, visible: v })}
                />
                <Label className="text-zinc-300 text-sm">
                  {editItem.visible ? "Visible on public gallery" : "Hidden from public gallery"}
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditItem(null)}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!editItem) return;
                updateMutation.mutate({
                  id: editItem.id,
                  title: editItem.title,
                  description: editItem.description || null,
                  serviceType: editItem.serviceType,
                  county: editItem.county,
                  acreage: editItem.acreage || null,
                  photoType: editItem.photoType,
                  visible: editItem.visible,
                });
              }}
              disabled={updateMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Photo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            This will permanently remove the photo from the gallery and the public site. This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
