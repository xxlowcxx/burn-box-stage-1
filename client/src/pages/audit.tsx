import { useQuery } from "@tanstack/react-query";
import {
  Activity, Upload, ScanLine, CheckCircle2, Trash2, Download,
  Eye, FileWarning, Shield, Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface AuditLog {
  id: number;
  fileId: number | null;
  action: string;
  detail: string;
  timestamp: number;
}

const ACTION_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  upload: { icon: Upload, color: "text-blue-500", label: "Upload" },
  scan_start: { icon: ScanLine, color: "text-amber-500", label: "Scan Start" },
  scan_complete: { icon: CheckCircle2, color: "text-primary", label: "Scan Complete" },
  original_deleted: { icon: Trash2, color: "text-red-500", label: "Original Deleted" },
  safe_copy_created: { icon: Shield, color: "text-emerald-500", label: "Safe Copy Created" },
  downloaded: { icon: Download, color: "text-muted-foreground", label: "Downloaded" },
  viewed: { icon: Eye, color: "text-muted-foreground", label: "Viewed" },
  deleted: { icon: Trash2, color: "text-red-500", label: "Deleted" },
};

export default function AuditPage() {
  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit"],
  });

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2"
          style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          <Activity className="w-5 h-5 text-primary" />
          Audit Log
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete history of all safety scans, file operations, and security events
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading audit trail...</div>
      ) : !logs || logs.length === 0 ? (
        <Card className="p-8 text-center">
          <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No audit entries yet. Upload a file to get started.</p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <ScrollArea className="h-[70vh]">
            <div className="divide-y divide-border">
              {logs.map((log) => {
                const config = ACTION_CONFIG[log.action] || {
                  icon: FileWarning, color: "text-muted-foreground", label: log.action,
                };
                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 sm:p-4 hover:bg-muted/30 transition-colors"
                    data-testid={`row-audit-${log.id}`}>
                    <div className={`p-2 rounded-lg bg-muted shrink-0 ${config.color}`}>
                      <config.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">{config.label}</Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          {format(new Date(log.timestamp * 1000), "MMM d, h:mm:ss a")}
                        </span>
                      </div>
                      <p className="text-sm mt-1 leading-relaxed">{log.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
