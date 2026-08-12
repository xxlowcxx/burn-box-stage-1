/**
 * Large-file ritual (>1 GB): box lights on fire → pop/snap → shiny new box → drive.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatBytes } from "@shared/limits";

export type BurnAnimPhase = "fire" | "snap" | "shiny" | "done";

interface Props {
  open: boolean;
  fileName: string;
  fileSize: number;
  onComplete: () => void;
}

export function BurnDropAnimation({ open, fileName, fileSize, onComplete }: Props) {
  const [phase, setPhase] = useState<BurnAnimPhase>("fire");

  useEffect(() => {
    if (!open) {
      setPhase("fire");
      return;
    }
    setPhase("fire");
    const t1 = setTimeout(() => setPhase("snap"), 1400);
    const t2 = setTimeout(() => setPhase("shiny"), 2000);
    const t3 = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [open, fileName, fileSize]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {open && phase !== "done" && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="burn-drop-animation"
        >
          <div className="flex flex-col items-center gap-6 px-6 text-center max-w-md">
            <div className="relative w-40 h-40 flex items-center justify-center">
              {phase === "fire" && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.05, 1], opacity: 1 }}
                  transition={{ duration: 0.4, repeat: 2 }}
                  className="relative"
                >
                  <BoxIcon className="text-amber-600" />
                  <motion.div
                    className="absolute -top-6 left-1/2 -translate-x-1/2 text-4xl"
                    animate={{ y: [-2, -14, -4], opacity: [0.7, 1, 0.6], scale: [1, 1.2, 0.9] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    🔥
                  </motion.div>
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-orange-500/30 blur-xl"
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 0.45, repeat: Infinity }}
                  />
                </motion.div>
              )}

              {phase === "snap" && (
                <motion.div
                  initial={{ scale: 1.2, opacity: 1 }}
                  animate={{ scale: 0, opacity: 0, rotate: 25 }}
                  transition={{ duration: 0.35, ease: "easeIn" }}
                  className="text-6xl"
                >
                  🫰
                </motion.div>
              )}

              {phase === "shiny" && (
                <motion.div
                  initial={{ scale: 0, opacity: 0, rotate: -20 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 16 }}
                  className="relative"
                >
                  <BoxIcon className="text-emerald-400 drop-shadow-[0_0_18px_rgba(52,211,153,0.8)]" />
                  <motion.div
                    className="absolute -inset-4 rounded-2xl bg-emerald-400/20 blur-lg"
                    animate={{ opacity: [0.4, 0.9, 0.4] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                  <motion.span
                    className="absolute -top-3 -right-3 text-2xl"
                    animate={{ rotate: [0, 20, -10, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.7, repeat: Infinity }}
                  >
                    ✨
                  </motion.span>
                </motion.div>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-lg font-semibold text-white" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                {phase === "fire" && "Burning the box…"}
                {phase === "snap" && "Snap."}
                {phase === "shiny" && "New vault box ready"}
              </p>
              <p className="text-sm text-white/70 truncate max-w-xs mx-auto" title={fileName}>
                {fileName}
              </p>
              <p className="text-xs text-white/50 font-mono">{formatBytes(fileSize)}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg width="96" height="96" viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M16 4L4 9v7c0 6.5 5 11.5 12 12 7-.5 12-5.5 12-12V9L16 4z"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.15"
        strokeLinejoin="round"
      />
      <path
        d="M4 9l12 5 12-5M16 14v14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
}
