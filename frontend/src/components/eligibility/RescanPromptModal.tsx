"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { dismissRescanPrompt } from "@/lib/profile-sync";

interface RescanPromptModalProps {
  open: boolean;
  onClose: () => void;
  /** Called when the user clicks "Rescan Now". Defaults to closing the modal. */
  onRescanNow?: () => void;
}

export function RescanPromptModal({ open, onClose, onRescanNow }: RescanPromptModalProps) {
  if (!open) return null;

  const handleLater = () => {
    dismissRescanPrompt();
    onClose();
  };

  const handleRescanNow = () => {
    onClose();
    onRescanNow?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleLater}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rescan-prompt-title"
        className="relative w-full max-w-md rounded-2xl border border-outline-variant/30 bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
        <h2 id="rescan-prompt-title" className="font-display text-xl font-bold text-on-surface">
          Refresh your benefit recommendations?
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Your profile information has changed since your last eligibility scan. Would you like to
          run a new scan to refresh your benefit recommendations?
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={handleLater}>
            Later
          </Button>
          <Button onClick={handleRescanNow}>Rescan Now</Button>
        </div>
      </div>
    </div>
  );
}
