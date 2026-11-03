"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createSettlementAction } from "@/actions/settlements";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/utils";
import { HandCoins, Loader2, Send, X, AlertCircle } from "lucide-react";

interface MemberOption {
  id: string;
  name: string;
}

interface SettlementDialogProps {
  householdId: string;
  currentMemberId: string;
  members: MemberOption[];
  prefilledPayeeId?: string;
  prefilledAmount?: number;
  triggerButtonText?: string;
}

export function SettlementDialog({
  householdId,
  currentMemberId,
  members,
  prefilledPayeeId,
  prefilledAmount,
  triggerButtonText = "Catat Pelunasan",
}: SettlementDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Available payees: all members except self
  const eligiblePayees = members.filter((m) => m.id !== currentMemberId);

  const [payeeId, setPayeeId] = React.useState(
    prefilledPayeeId || eligiblePayees[0]?.id || ""
  );
  const [amount, setAmount] = React.useState(prefilledAmount || 0);
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (prefilledPayeeId) setPayeeId(prefilledPayeeId);
    if (prefilledAmount) setAmount(prefilledAmount);
  }, [prefilledPayeeId, prefilledAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!payeeId) {
      setErrorMessage("Pilih anggota penerima transfer dana.");
      return;
    }

    if (amount <= 0) {
      setErrorMessage("Nominal transfer pelunasan harus lebih besar dari Rp0.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await createSettlementAction({
        householdId,
        payeeMemberId: payeeId,
        amount,
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Gagal mencatat pelunasan");
      } else {
        setIsOpen(false);
        router.refresh();
      }
    } catch {
      setErrorMessage("Terjadi kesalahan teknis saat menyimpan pelunasan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-xs bg-emerald-800 hover:bg-emerald-900 text-white gap-1.5"
      >
        <HandCoins className="h-3.5 w-3.5" />
        {triggerButtonText}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-white border-stone-200 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150">
            <form onSubmit={handleSubmit}>
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-semibold text-stone-900 flex items-center gap-2">
                    <HandCoins className="h-4 w-4 text-emerald-800" />
                    Catat Transfer Pelunasan
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Klaim transfer reimbursement yang telah Anda kirimkan.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0 text-stone-400 hover:text-stone-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent className="space-y-4">
                {errorMessage && (
                  <div className="p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Kirim Dana Kepada</Label>
                  <select
                    value={payeeId}
                    onChange={(e) => setPayeeId(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="w-full text-xs bg-white border border-stone-300 rounded px-2.5 py-2 text-stone-900"
                  >
                    {eligiblePayees.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Nominal Transfer (Rp)</Label>
                    <span className="text-[11px] font-mono text-emerald-800 font-semibold">
                      {formatIDR(amount || 0)}
                    </span>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    step="500"
                    placeholder="0"
                    value={amount || ""}
                    onChange={(e) =>
                      setAmount(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    required
                    disabled={isSubmitting}
                    className="font-mono text-sm tabular-nums"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Catatan / Metode Transfer</Label>
                  <Input
                    placeholder="Contoh: Transfer QRIS / BCA"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-md text-[11px] text-amber-800 space-y-1">
                  <div className="font-semibold flex items-center gap-1">
                    Aturan Buku Kas:
                  </div>
                  <p>
                    Status pelunasan ini akan dimulai sebagai <strong>PENDING</strong>.
                    Saldo buku kas baru akan berubah setelah penerima dana mengonfirmasi bahwa uang telah masuk ke rekening mereka.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-end space-x-2 border-t border-stone-100 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || amount <= 0}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Mencatat...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Ajukan Pelunasan
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}

