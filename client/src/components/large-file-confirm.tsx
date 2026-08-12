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
import { formatBytes, MAX_FILE_BYTES, CONFIRM_THRESHOLD_BYTES } from "@/lib/limits";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  fileName: string;
  fileSize: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LargeFileConfirm({ open, fileName, fileSize, onConfirm, onCancel }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent data-testid="large-file-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Confirm large file upload
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 text-left">
            <p>
              <span className="font-medium text-foreground">{fileName}</span> is{" "}
              <span className="font-mono text-foreground">{formatBytes(fileSize)}</span>.
            </p>
            <p>
              Files over <strong>{formatBytes(CONFIRM_THRESHOLD_BYTES)}</strong> need your permission
              so automatic watchers cannot fill the vault indefinitely. Maximum accepted size is{" "}
              <strong>{formatBytes(MAX_FILE_BYTES)}</strong> per file.
            </p>
            <p className="text-xs text-muted-foreground">
              The original will still be quarantined, scanned, and burned after a safe copy is written.
              Large binary scans use streaming (no full in-memory load).
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} data-testid="button-cancel-large">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} data-testid="button-confirm-large">
            Yes, upload {formatBytes(fileSize)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
