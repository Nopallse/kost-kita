"use client";

import * as React from "react";
import { confirmSettlementAction, rejectSettlementAction } from "@/actions/settlements";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface SettlementActionButtonsProps {
  householdId: string;
  settlementId: string;
  amountFormatted: string;
  payerName: string;
}

export function SettlementActionButtons({
  householdId,
  settlementId,
  amountFormatted,
  payerName,
}: SettlementActionButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleConfirm = () => {
    const ok = confirm(
      `Konfirmasi bahwa Anda telah menerima dana sebesar ${amountFormatted} dari ${payerName}?`
    );
    if (!ok) return;

    setErrorMsg(null);
    startTransition(async () => {
      const res = await confirmSettlementAction({
        householdId,
        settlementId,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Gagal mengonfirmasi");
      } else {
        router.refresh();
      }
    });
  };

  const handleReject = () => {
    const reason = prompt(
      `Tolak klaim transfer ini? Masukkan alasan penolakan (misal: dana belum masuk rekening):`
    );
    if (reason === null) return; // user cancelled

    setErrorMsg(null);
    startTransition(async () => {
      const res = await rejectSettlementAction({
        householdId,
        settlementId,
        reason: reason.trim() || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Gagal menolak");
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="w-full sm:w-auto flex flex-col sm:items-end space-y-1">
      <div className="flex items-center space-x-2 w-full sm:w-auto">
        <Button
          size="sm"
          disabled={isPending}
          onClick={handleConfirm}
          className="flex-1 sm:flex-initial h-9 sm:h-8 px-3 text-xs bg-emerald-800 hover:bg-emerald-900 text-white gap-1.5"
          title="Konfirmasi Penerimaan Dana"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Konfirmasi Masuk</span>
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={handleReject}
          className="flex-1 sm:flex-initial h-9 sm:h-8 px-3 text-xs text-rose-700 hover:text-rose-800 border-rose-200 hover:bg-rose-50 gap-1.5"
          title="Tolak Klaim"
        >
          <X className="h-3.5 w-3.5" />
          <span>Tolak</span>
        </Button>
      </div>

      {errorMsg && (
        <p className="text-[11px] text-rose-600 font-medium">{errorMsg}</p>
      )}
    </div>
  );
}
