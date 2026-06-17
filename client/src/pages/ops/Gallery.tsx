/**
 * Ops Gallery — upload and manage job photos for the public site.
 */
import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload,
  Loader2,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Star,
  ImageIcon,
  X,
} from "lucide-react";
import {
  GALLERY_PHOTO_TYPES,
  GALLERY_SERVICES,
  galleryPhotoTypeLabel,
  galleryServiceLabel,
} from "@shared/gallery";

const COUNTIES = [
  "Bedford", "Benton", "Cannon", "Carroll", "Cheatham", "Chester",
  "Davidson", "Decatur", "Dickson", "Gibson", "Giles",
  "Hardin", "Henderson", "Henry", "Hickman", "Houston", "Humphreys",
  "Lawrence", "Lewis", "Lincoln", "Madison", "Marshall",
  "Maury", "Montgomery", "Moore", "Perry", "Robertson", "Rutherford",
  "Stewart", "Sumner", "Trousdale", "Wayne", "Weakley", "Williamson", "Wilson",
];

type PendingUpload = {
  imageUrl: string;
  imageKey: string;
  preview: string;
};

const emptyForm = {
  title: "",
  description: "",
  service: "forestry_mulching" as const,
  county: "",
  acreage: "",
  photoType: "general" as const,
  featured: false,
  published: true,
};

export default function OpsGallery() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isUploading, setIsUploading] = useState(false);

  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.gallery.list.useQuery();

  const uploadPhoto = trpc.gallery.uploadPhoto.useMutation();
  const createItem = trpc.gallery.create.useMutation({
    onSuccess: () => {
      toast.success("Photo added to gallery.");
      utils.gallery.list.invalidate();
      utils.gallery.listPublic.invalidate();
      setPending(null);
      setForm(emptyForm);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err) => toast.error(err.message || "Failed to save photo."),
  });
  const updateItem = trpc.gallery.update.useMutation({
    onSuccess: () => {
      utils.gallery.list.invalidate();
      utils.gallery.listPublic.invalidate();
    },
    onError: (err) => toast.error(err.message || "Update failed."),
  });
  const deleteItem = trpc.gallery.delete.useMutation({
    onSuccess: () => {
      toast.success("Photo removed.");
      utils.gallery.list.invalidate();
      utils.gallery.listPublic.invalidate();
    },
    onError: () => toast.error("Failed to delete photo."),
  });
  const moveItem = trpc.gallery.move.useMutation({
    onSuccess: () => {
      utils.gallery.list.invalidate();
      utils.gallery.listPublic.invalidate();
    },
  });

  async function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10 MB.");
      return;
    }

    setIsUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.split(",")[1];
      const { url, key } = await uploadPhoto.mutateAsync({
        base64,
        mimeType: file.type,
        filename: file.name,
      });
      setPending({ imageUrl: url, imageKey: key, preview: dataUrl });
      if (!form.title) {
        const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
        setForm((f) => ({ ...f, title: baseName.charAt(0).toUpperCase() + baseName.slice(1) }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  }

  function handleSave() {
    if (!pending) {
      toast.error("Upload a photo first.");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Add a title for this photo.");
      return;
    }
    createItem.mutate({
      ...form,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      imageUrl: pending.imageUrl,
      imageKey: pending.imageKey,
      county: form.county || undefined,
      acreage: form.acreage || undefined,
    });
  }

  function cancelPending() {
    setPending(null);
    setForm(emptyForm);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const publishedCount = items.filter((i) => i.published).length;

  return (
    <DashboardLayout
      title="Gallery"
      subtitle="Upload real job photos — published items appear on nolandearthworks.com/gallery and the homepage"
    >
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Stats */}
        <div className="flex flex-wrap gap-3 text-sm">
          <Badge variant="outline" className="border-border text-muted-foreground">
            {items.length} total
          </Badge>
          <Badge variant="outline" className="border-green-500/30 text-green-400">
            {publishedCount} live on site
          </Badge>
          <Badge variant="outline" className="border-amber-500/30 text-amber-400">
            {items.filter((i) => i.featured).length} featured on homepage
          </Badge>
        </div>

        {/* Upload */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Upload Job Photo</h2>
          </div>

          {!pending ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm">Uploading…</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImageIcon className="w-8 h-8 text-primary/70" />
                  <p className="text-sm font-medium text-foreground">Drop a photo or click to browse</p>
                  <p className="text-xs">JPEG, PNG, or WebP — max 10 MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="relative rounded-lg overflow-hidden border border-border aspect-video bg-black/40">
                <img src={pending.preview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={cancelPending}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Cedar thicket cleared — Maury County"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="What was cleared, terrain, outcome…"
                    rows={3}
                    className="mt-1 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Service</Label>
                    <Select
                      value={form.service}
                      onValueChange={(v) => setForm((f) => ({ ...f, service: v as typeof form.service }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GALLERY_SERVICES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Photo type</Label>
                    <Select
                      value={form.photoType}
                      onValueChange={(v) => setForm((f) => ({ ...f, photoType: v as typeof form.photoType }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GALLERY_PHOTO_TYPES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>County</Label>
                    <Select
                      value={form.county || "_none"}
                      onValueChange={(v) => setForm((f) => ({ ...f, county: v === "_none" ? "" : v }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Not specified</SelectItem>
                        {COUNTIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="acreage">Acreage</Label>
                    <Input
                      id="acreage"
                      value={form.acreage}
                      onChange={(e) => setForm((f) => ({ ...f, acreage: e.target.value }))}
                      placeholder="e.g. 4 acres"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="published"
                      checked={form.published}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))}
                    />
                    <Label htmlFor="published">Publish on website</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="featured"
                      checked={form.featured}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))}
                    />
                    <Label htmlFor="featured">Feature on homepage</Label>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSave} disabled={createItem.isPending}>
                    {createItem.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Add to Gallery
                  </Button>
                  <Button variant="outline" onClick={cancelPending}>Cancel</Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Existing items */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Gallery Items</h2>

          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
              No photos yet. The public site shows placeholder images until you upload real job photos.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-card border border-border rounded-xl overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-video bg-black/30">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      {!item.published && (
                        <Badge className="bg-black/70 text-white border-0 text-[10px]">Draft</Badge>
                      )}
                      {item.featured && (
                        <Badge className="bg-amber-500/90 text-black border-0 text-[10px]">
                          <Star className="w-3 h-3 mr-0.5" /> Featured
                        </Badge>
                      )}
                      <Badge className="bg-black/70 text-white border-0 text-[10px]">
                        {galleryPhotoTypeLabel(item.photoType)}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground line-clamp-1">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {galleryServiceLabel(item.service)}
                        {item.county ? ` · ${item.county} County` : ""}
                        {item.acreage ? ` · ${item.acreage}` : ""}
                      </p>
                    </div>

                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        disabled={index === 0 || moveItem.isPending}
                        onClick={() => moveItem.mutate({ id: item.id, direction: "up" })}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        disabled={index === items.length - 1 || moveItem.isPending}
                        onClick={() => moveItem.mutate({ id: item.id, direction: "down" })}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={() =>
                          updateItem.mutate({ id: item.id, published: !item.published })
                        }
                      >
                        {item.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={() =>
                          updateItem.mutate({ id: item.id, featured: !item.featured })
                        }
                      >
                        <Star className={`w-4 h-4 ${item.featured ? "fill-amber-400 text-amber-400" : ""}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-red-400 hover:text-red-300 ml-auto"
                        onClick={() => {
                          if (confirm("Remove this photo from the gallery?")) {
                            deleteItem.mutate({ id: item.id });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
