"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createSettlementAction } from "@/actions/settlements";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        className="w-full sm:w-auto text-xs bg-emerald-800 hover:bg-emerald-900 text-white gap-1.5 h-9"
      >
        <HandCoins className="h-3.5 w-3.5" />
        <span>{triggerButtonText}</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <Card className="w-full sm:max-w-md bg-white border-stone-200 shadow-2xl rounded-b-none sm:rounded-xl max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            {/* Mobile Drawer Pill Handle */}
            <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mt-3 sm:hidden" />

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
                  aria-label="Tutup dialog"
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
                  <Label htmlFor="payeeId">Kirim Dana Kepada</Label>
                  <select
                    id="payeeId"
                    value={payeeId}
                    onChange={(e) => setPayeeId(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="w-full text-sm bg-white border border-stone-300 rounded-md px-3 py-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-800"
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
                    <Label htmlFor="amount">Nominal Transfer (Rp)</Label>
                    <span className="text-xs font-mono text-emerald-800 font-semibold">
                      {formatIDR(amount || 0)}
                    </span>
                  </div>
                  <Input
                    id="amount"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    placeholder="0"
                    value={amount || ""}
                    onChange={(e) =>
                      setAmount(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    required
                    disabled={isSubmitting}
                    className="font-mono text-base tabular-nums h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">Catatan / Metode Transfer</Label>
                  <Input
                    id="notes"
                    placeholder="Contoh: Transfer QRIS / BCA"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isSubmitting}
                    className="text-sm h-10"
                  />
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-md text-[11px] text-amber-800 space-y-1 leading-relaxed">
                  <div className="font-semibold flex items-center gap-1">
                    Aturan Buku Kas:
                  </div>
                  <p>
                    Status pelunasan ini akan dimulai sebagai <strong>PENDING</strong>.
                    Saldo buku kas baru akan berubah setelah penerima dana mengonfirmasi bahwa uang telah masuk ke rekening mereka.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:space-x-2 border-t border-stone-100 pt-4 pb-6 sm:pb-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto h-10 sm:h-9 text-xs"
                >
                  Batal
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || amount <= 0}
                  className="w-full sm:w-auto bg-emerald-800 hover:bg-emerald-900 text-white gap-1.5 h-10 sm:h-9 text-xs"
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
