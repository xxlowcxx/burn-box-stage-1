import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, ShieldCheck, ShieldAlert, Upload, FileText, FileCode, FileImage,
  FileSpreadsheet, File, Download, Eye, Trash2, Lock, Loader2, ScanLine,
  FolderOpen, AlertTriangle, CheckCircle2, XCircle, Clock, HardDrive,
  Activity, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface FileRecord {
  id: number;
  originalName: string;
  safeName: string;
  mimeType: string;
  fileSize: number;
  safeSize: number;
  scanStatus: "scanning" | "safe" | "blocked";
  scanSummary: string;
  threatsDetected: string | null;
  safeCopyPath: string;
  createdAt: number;
  scannedAt: number | null;
}

interface Stats {
  totalFiles: number;
  safeFiles: number;
  blockedFiles: number;
  scanningFiles: number;
  totalSize: number;
  threatsNeutralized: number;
  originalsDeleted: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(mimeType: string, name: string) {
  if (mimeType.startsWith("image/") || name.endsWith(".svg")) return FileImage;
  if (mimeType.includes("json") || mimeType.includes("javascript") || mimeType.includes("typescript") ||
      /\.(js|ts|jsx|tsx|py|rb|php|java|c|cpp|go|rs|sh|bat|ps1)$/.test(name)) return FileCode;
  if (mimeType.includes("csv") || mimeType.includes("spreadsheet") || name.endsWith(".csv")) return FileSpreadsheet;
  return FileText;
}

function formatDate(ts: number): string {
  return format(new Date(ts * 1000), "MMM d, yyyy 'at' h:mm a");
}

// ============ LOGO ============
function SafeDriveLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="text-primary shrink-0">
        <path d="M16 4L4 9v7c0 6.5 5 11.5 12 12 7-.5 12-5.5 12-12V9L16 4z"
          stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
        <path d="M11 16l3.5 3.5L21 13" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-bold text-xl tracking-tight" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
        SafeDrive
      </span>
    </div>
  );
}

// ============ UPLOAD ZONE ============
function UploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";
      const res = await fetch(`${API_BASE}/api/files/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data: FileRecord) => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      if (data.scanStatus === "safe") {
        toast({
          title: "File scanned and secured",
          description: `"${data.originalName}" passed safety scan. Original deleted, safe copy created.`,
        });
      } else if (data.scanStatus === "blocked") {
        toast({
          title: "File blocked",
          description: `"${data.originalName}" was blocked by safety scan.`,
          variant: "destructive",
        });
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleFile = useCallback((file: File) => {
    uploadMutation.mutate(file);
  }, [uploadMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(handleFile);
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(handleFile);
  }, [handleFile]);

  return (
    <Card
      data-testid="upload-zone"
      className={`border-2 border-dashed transition-all cursor-pointer p-8 sm:p-12 ${
        isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleChange}
        data-testid="input-file-upload"
      />
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          {uploadMutation.isPending ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" data-testid="icon-uploading" />
          ) : (
            <Upload className="w-8 h-8 text-primary" />
          )}
        </div>
        <div>
          <p className="text-base font-semibold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            {uploadMutation.isPending ? "Scanning in progress..." : "Drop files here to scan"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Files are pattern-scanned, originals deleted, safe copies kept read-only
          </p>
        </div>
        <Badge variant="secondary" className="gap-1 mt-1">
          <Lock className="w-3 h-3" /> Read-only vault
        </Badge>
      </div>
    </Card>
  );
}

// ============ STATS BAR ============
function StatsBar({ stats }: { stats?: Stats }) {
  const items = [
    { label: "Total Files", value: stats?.totalFiles ?? 0, icon: FolderOpen, color: "text-primary" },
    { label: "Safe", value: stats?.safeFiles ?? 0, icon: ShieldCheck, color: "text-emerald-500" },
    { label: "Threats Stopped", value: stats?.threatsNeutralized ?? 0, icon: ShieldAlert, color: "text-amber-500" },
    { label: "Originals Deleted", value: stats?.originalsDeleted ?? 0, icon: Trash2, color: "text-muted-foreground" },
    { label: "Drive Size", value: formatBytes(stats?.totalSize ?? 0), icon: HardDrive, color: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="p-4 flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-muted ${item.color}`}>
            <item.icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold tabular-nums" data-testid={`text-stat-${item.label.toLowerCase().replace(/\s/g, "-")}`}>
              {item.value}
            </p>
            <p className="text-xs text-muted-foreground truncate">{item.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ============ FILE CARD ============
function FileCard({ file, onView }: { file: FileRecord; onView: (f: FileRecord) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const Icon = getFileIcon(file.mimeType, file.originalName);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/files/${file.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "File deleted", description: `"${file.originalName}" removed from drive.` });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";
      window.open(`${API_BASE}/api/files/${file.id}/download`, "_blank");
    },
  });

  const isScanning = file.scanStatus === "scanning";
  const isBlocked = file.scanStatus === "blocked";

  return (
    <Card className="p-4 flex flex-col gap-3 group hover:border-primary/30 transition-colors" data-testid={`card-file-${file.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`p-2.5 rounded-lg shrink-0 ${
            isScanning ? "bg-amber-500/10 text-amber-500" :
            isBlocked ? "bg-red-500/10 text-red-500" :
            "bg-primary/10 text-primary"
          }`}>
            {isScanning ? <ScanLine className="w-5 h-5 animate-pulse" /> :
             isBlocked ? <XCircle className="w-5 h-5" /> :
             <Icon className="w-5 h-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate" title={file.originalName} data-testid={`text-filename-${file.id}`}>
              {file.originalName}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {formatBytes(file.fileSize)} {file.mimeType}
            </p>
          </div>
        </div>
        <Badge variant={isScanning ? "secondary" : isBlocked ? "destructive" : "secondary"}
          className={`shrink-0 gap-1 ${
            isScanning ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
            isBlocked ? "" :
            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          }`}>
          {isScanning ? <><Loader2 className="w-3 h-3 animate-spin" /> Scanning</> :
           isBlocked ? <><XCircle className="w-3 h-3" /> Blocked</> :
           <><Lock className="w-3 h-3" /> Read-only</>}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed" data-testid={`text-scan-summary-${file.id}`}>
        {file.scanSummary}
      </p>

      {file.threatsDetected && (
        <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="line-clamp-2">{JSON.parse(file.threatsDetected).join("; ")}</span>
        </div>
      )}

      <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border/50">
        <span className="text-xs text-muted-foreground font-mono">
          {file.scannedAt ? formatDate(file.scannedAt) : formatDate(file.createdAt)}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {!isScanning && !isBlocked && (
            <>
              <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" onClick={() => onView(file)}
                data-testid={`button-view-${file.id}`}>
                <Eye className="w-3.5 h-3.5" />
                <span className="text-xs">View</span>
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" onClick={() => downloadMutation.mutate()}
                data-testid={`button-download-${file.id}`}>
                <Download className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-destructive"
            onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}
            data-testid={`button-delete-${file.id}`}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ============ FILE VIEWER DIALOG ============
function FileViewer({ file, onClose }: { file: FileRecord | null; onClose: () => void }) {
  const { data: fileContent, isLoading } = useQuery<{ content: string; fileName: string; scanSummary: string }>({
    queryKey: ["/api/files", file?.id, "view"],
    queryFn: async () => {
      if (!file) throw new Error("No file");
      const res = await apiRequest("GET", `/api/files/${file.id}/view`);
      return res.json();
    },
    enabled: !!file,
  });

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            {file?.originalName}
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 pb-2">
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1">
            <CheckCircle2 className="w-3 h-3" /> Scan Verified Safe
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Lock className="w-3 h-3" /> Read-only
          </Badge>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="flex-1 max-h-[55vh] rounded-lg border border-border bg-muted/30">
            <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words leading-relaxed" data-testid="text-file-content">
              {fileContent?.content}
            </pre>
          </ScrollArea>
        )}
        {fileContent?.scanSummary && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{fileContent.scanSummary}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============ EMPTY STATE ============
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
        <FolderOpen className="w-10 h-10 text-muted-foreground" />
      </div>
      <div>
        <p className="text-lg font-semibold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Your vault is empty
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Upload files above — they will be scanned, originals deleted, and safe read-only copies kept
        </p>
      </div>
    </div>
  );
}

// ============ MAIN DRIVE PAGE ============
export default function DrivePage() {
  const [viewingFile, setViewingFile] = useState<FileRecord | null>(null);
  const [filter, setFilter] = useState<"all" | "safe" | "blocked">("all");

  const { data: filesData, isLoading: filesLoading } = useQuery<FileRecord[]>({
    queryKey: ["/api/files"],
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const filteredFiles = (filesData || []).filter((f) => {
    if (filter === "all") return true;
    if (filter === "safe") return f.scanStatus === "safe";
    if (filter === "blocked") return f.scanStatus === "blocked";
    return true;
  });

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            My Safe Drive
          </h1>
          <p className="text-sm text-muted-foreground">
            Pattern-scanned files — originals deleted, only safe copies remain
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <Shield className="w-3.5 h-3.5 text-primary" /> Safety Scan Active
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Upload Zone */}
      <UploadZone />

      {/* Filter + File Grid */}
      <div className="flex items-center gap-2">
        {(["all", "safe", "blocked"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "secondary"}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize gap-1.5"
            data-testid={`button-filter-${f}`}
          >
            {f === "safe" && <ShieldCheck className="w-3.5 h-3.5" />}
            {f === "blocked" && <XCircle className="w-3.5 h-3.5" />}
            {f === "all" ? "All Files" : f}
          </Button>
        ))}
      </div>

      {filesLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredFiles.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => (
            <FileCard key={file.id} file={file} onView={setViewingFile} />
          ))}
        </div>
      )}

      <FileViewer file={viewingFile} onClose={() => setViewingFile(null)} />
    </div>
  );
}
