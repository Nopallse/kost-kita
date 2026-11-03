"use client";

import * as React from "react";
import { voidTransactionAction } from "@/actions/transactions";
import { Button } from "@/components/ui/button";
import { Ban, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface VoidTransactionButtonProps {
  householdId: string;
  transactionId: string;
  transactionTitle: string;
}

export function VoidTransactionButton({
  householdId,
  transactionId,
  transactionTitle,
}: VoidTransactionButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleVoid = () => {
    const confirmed = confirm(
      `Apakah Anda yakin ingin membatalkan transaksi "${transactionTitle}"?\n\nTransaksi yang dibatalkan tidak akan dihitung dalam saldo kas, namun riwayat audit akan tetap dicatat permanen.`
    );

    if (!confirmed) return;

    setErrorMsg(null);
    startTransition(async () => {
      const res = await voidTransactionAction(
        householdId,
        transactionId,
        "Dibatalkan oleh anggota via halaman detail"
      );

      if (!res.success) {
        setErrorMsg(res.error || "Gagal membatalkan transaksi");
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col items-end space-y-1">
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={handleVoid}
        className="text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200 gap-1.5"
      >
        {isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Membatalkan...
          </>
        ) : (
          <>
            <Ban className="h-3.5 w-3.5" />
            Batalkan Transaksi (Void)
          </>
        )}
      </Button>

      {errorMsg && (
        <span className="text-[11px] text-rose-700 font-medium">
          {errorMsg}
        </span>
      )}
    </div>
  );
}
