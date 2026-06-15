"use client";

import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { CaseDetailView } from "@/components/cases/CaseDetailView";
import type { CaseDetail } from "@/types";

interface CaseDetailPanelProps {
  caseId: string | null;
  onClose: () => void;
}

async function fetchCase(id: string): Promise<CaseDetail> {
  const res = await api.get(`/api/partner/cases/${id}`);
  return res.data.data;
}

export function CaseDetailPanel({ caseId, onClose }: CaseDetailPanelProps) {
  const { data: c, isLoading } = useQuery({
    queryKey: ["partner-case-detail", caseId],
    queryFn: () => fetchCase(caseId!),
    enabled: !!caseId,
  });

  if (!caseId) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-partner-xl z-50 flex flex-col overflow-hidden animate-slide-in-left">
        {isLoading || !c ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-partner-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <CaseDetailView
            caseData={c}
            caseId={caseId}
            headerActions={
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-primary-subtle text-text-soft"
              >
                <X className="w-5 h-5" />
              </button>
            }
          />
        )}
      </div>
    </>
  );
}
