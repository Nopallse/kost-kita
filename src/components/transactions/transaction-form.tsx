"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createTransactionAction } from "@/actions/transactions";
import { ReceiptScannerDropzone } from "@/components/transactions/receipt-scanner-dropzone";
import type { ScannedReceiptData } from "@/actions/receipt-scanner";
import { AiDraftChatPrompt } from "@/components/transactions/ai-draft-chat-prompt";
import type { TransactionDraftState } from "@/actions/draft-adjuster";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Receipt,
  Users,
  User,
  SlidersHorizontal,
  CreditCard,
  Calculator,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Equal,
} from "lucide-react";

interface MemberOption {
  id: string;
  name: string;
}

interface TransactionFormProps {
  householdId: string;
  currentMemberId: string;
  members: MemberOption[];
}

interface FormItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  splitType: "SHARED" | "PERSONAL" | "CUSTOM";
  participantMemberIds: string[];
  assignedMemberId: string;
  customAllocations: { memberId: string; amount: number }[];
}

interface FormPayment {
  memberId: string;
  amount: number;
}

export function TransactionForm({
  householdId,
  currentMemberId,
  members,
}: TransactionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Form Header State
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = React.useState("");

  // Items State (default with 1 initial item)
  const [items, setItems] = React.useState<FormItem[]>([
    {
      id: "item-1",
      name: "",
      quantity: 1,
      unitPrice: 0,
      splitType: "SHARED",
      participantMemberIds: members.map((m) => m.id),
      assignedMemberId: currentMemberId,
      customAllocations: members.map((m) => ({ memberId: m.id, amount: 0 })),
    },
  ]);

  // Payments State (default: current member pays 100%)
  const [payments, setPayments] = React.useState<FormPayment[]>([
    {
      memberId: currentMemberId,
      amount: 0,
    },
  ]);

  // Derived Calculations
  const totalItemsAmount = React.useMemo(() => {
    return items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  }, [items]);

  const totalPaymentsAmount = React.useMemo(() => {
    return payments.reduce((acc, payment) => acc + payment.amount, 0);
  }, [payments]);

  // Sync default single payment amount when total changes (convenience helper)
  React.useEffect(() => {
    if (payments.length === 1) {
      setPayments([{ memberId: payments[0].memberId, amount: totalItemsAmount }]);
    }
  }, [totalItemsAmount]);

  // Preview Responsibility Per Member
  const responsibilityPreview = React.useMemo(() => {
    const map: Record<string, number> = {};
    members.forEach((m) => (map[m.id] = 0));

    items.forEach((item) => {
      const subtotal = item.quantity * item.unitPrice;
      if (subtotal <= 0) return;

      if (item.splitType === "SHARED") {
        const parts = item.participantMemberIds;
        if (parts.length > 0) {
          const base = Math.floor(subtotal / parts.length);
          const rem = subtotal % parts.length;
          // Sort deterministically
          const sorted = [...parts].sort();
          sorted.forEach((mId, idx) => {
            map[mId] = (map[mId] || 0) + base + (idx < rem ? 1 : 0);
          });
        }
      } else if (item.splitType === "PERSONAL") {
        if (item.assignedMemberId) {
          map[item.assignedMemberId] =
            (map[item.assignedMemberId] || 0) + subtotal;
        }
      } else if (item.splitType === "CUSTOM") {
        item.customAllocations.forEach((alloc) => {
          map[alloc.memberId] = (map[alloc.memberId] || 0) + alloc.amount;
        });
      }
    });

    return map;
  }, [items, members]);

  // AI Receipt Scanner Handler
  const handleReceiptScanned = (scannedData: ScannedReceiptData) => {
    if (scannedData.suggestedTitle) {
      setTitle(scannedData.suggestedTitle);
    }
    if (scannedData.date) {
      setDate(scannedData.date);
    }
    if (scannedData.notes) {
      setNotes((prev) => (prev ? `${prev} | ${scannedData.notes}` : scannedData.notes!));
    }
    if (scannedData.items && scannedData.items.length > 0) {
      const newItems: FormItem[] = scannedData.items.map((it, idx) => ({
        id: `item-scanned-${Date.now()}-${idx}`,
        name: it.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        splitType: "SHARED",
        participantMemberIds: members.map((m) => m.id),
        assignedMemberId: currentMemberId,
        customAllocations: members.map((m) => ({ memberId: m.id, amount: 0 })),
      }));
      setItems(newItems);

      const totalScanned =
        scannedData.totalAmount ||
        newItems.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);
      setPayments([{ memberId: currentMemberId, amount: totalScanned }]);
    }
  };

  // Current draft state snapshot for AI Copilot
  const currentDraftState: TransactionDraftState = React.useMemo(
    () => ({
      title,
      date,
      notes,
      items: items.map((it) => ({
        id: it.id,
        name: it.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        splitType: it.splitType,
        participantMemberIds: it.participantMemberIds,
        assignedMemberId: it.assignedMemberId,
        customAllocations: it.customAllocations,
      })),
      payments: payments.map((p) => ({
        memberId: p.memberId,
        amount: p.amount,
      })),
    }),
    [title, date, notes, items, payments]
  );

  const handleDraftAdjusted = (newDraft: TransactionDraftState) => {
    if (newDraft.title) setTitle(newDraft.title);
    if (newDraft.date) setDate(newDraft.date);
    if (newDraft.notes !== undefined) setNotes(newDraft.notes || "");
    if (newDraft.items && newDraft.items.length > 0) {
      setItems(
        newDraft.items.map((it, idx) => ({
          id: it.id || `item-adj-${Date.now()}-${idx}`,
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          splitType: it.splitType,
          participantMemberIds: it.participantMemberIds,
          assignedMemberId: it.assignedMemberId || currentMemberId,
          customAllocations:
            it.customAllocations && it.customAllocations.length > 0
              ? it.customAllocations
              : members.map((m) => ({ memberId: m.id, amount: 0 })),
        }))
      );
    }
    if (newDraft.payments && newDraft.payments.length > 0) {
      setPayments(newDraft.payments);
    }
  };

  // Item Management Handlers
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: "",
        quantity: 1,
        unitPrice: 0,
        splitType: "SHARED",
        participantMemberIds: members.map((m) => m.id),
        assignedMemberId: currentMemberId,
        customAllocations: members.map((m) => ({ memberId: m.id, amount: 0 })),
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (
    index: number,
    fields: Partial<FormItem>
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...fields } : item))
    );
  };

  // Mobile convenience: auto split custom allocations equally
  const handleCustomSplitEqually = (index: number) => {
    const item = items[index];
    const subtotal = item.quantity * item.unitPrice;
    if (subtotal <= 0 || members.length === 0) return;

    const base = Math.floor(subtotal / members.length);
    const rem = subtotal % members.length;
    const sorted = [...members].sort((a, b) => a.id.localeCompare(b.id));

    const newAllocs = sorted.map((m, idx) => ({
      memberId: m.id,
      amount: base + (idx < rem ? 1 : 0),
    }));

    handleUpdateItem(index, { customAllocations: newAllocs });
  };

  const handleSelectAllParticipants = (index: number) => {
    handleUpdateItem(index, { participantMemberIds: members.map((m) => m.id) });
  };

  const handleSelectOnlyMe = (index: number) => {
    handleUpdateItem(index, { participantMemberIds: [currentMemberId] });
  };

  // Payment Management Handlers
  const handleAddPayment = () => {
    const unusedMember =
      members.find((m) => !payments.some((p) => p.memberId === m.id)) ||
      members[0];
    setPayments((prev) => [...prev, { memberId: unusedMember.id, amount: 0 }]);
  };

  const handleRemovePayment = (index: number) => {
    if (payments.length === 1) return;
    setPayments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdatePayment = (
    index: number,
    fields: Partial<FormPayment>
  ) => {
    setPayments((prev) =>
      prev.map((payment, i) =>
        i === index ? { ...payment, ...fields } : payment
      )
    );
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation checks
    if (!title.trim()) {
      setErrorMessage("Judul transaksi wajib diisi.");
      return;
    }

    if (totalItemsAmount <= 0) {
      setErrorMessage("Total transaksi belanja harus lebih besar dari Rp0.");
      return;
    }

    if (totalItemsAmount !== totalPaymentsAmount) {
      setErrorMessage(
        `Total pembayaran (${formatIDR(
          totalPaymentsAmount
        )}) tidak sama dengan total belanja item (${formatIDR(totalItemsAmount)}).`
      );
      return;
    }

    // Check individual items
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.name.trim()) {
        setErrorMessage(`Nama barang pada item #${i + 1} wajib diisi.`);
        return;
      }
      if (it.unitPrice <= 0) {
        setErrorMessage(`Harga satuan pada item #${i + 1} harus lebih dari 0.`);
        return;
      }
      if (it.splitType === "SHARED" && it.participantMemberIds.length === 0) {
        setErrorMessage(
          `Pilih minimal satu penanggung jawab pada item #${i + 1}.`
        );
        return;
      }
      if (it.splitType === "CUSTOM") {
        const customSum = it.customAllocations.reduce((a, b) => a + b.amount, 0);
        const subtotal = it.quantity * it.unitPrice;
        if (customSum !== subtotal) {
          setErrorMessage(
            `Alokasi kustom pada item #${i + 1} (${formatIDR(
              customSum
            )}) tidak sama dengan subtotal (${formatIDR(subtotal)}).`
          );
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const res = await createTransactionAction({
        householdId,
        title: title.trim(),
        date: new Date(date),
        notes: notes.trim() || undefined,
        items: items.map((it) => ({
          name: it.name.trim(),
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          splitType: it.splitType,
          participantMemberIds:
            it.splitType === "SHARED" ? it.participantMemberIds : [],
          assignedMemberId:
            it.splitType === "PERSONAL" ? it.assignedMemberId : undefined,
          customAllocations:
            it.splitType === "CUSTOM"
              ? it.customAllocations.filter((a) => a.amount > 0)
              : [],
        })),
        payments: payments.map((p) => ({
          memberId: p.memberId,
          amount: p.amount,
        })),
      });

      if (!res.success) {
        setErrorMessage(res.error || "Gagal mencatat transaksi");
      } else {
        router.push("/transactions");
        router.refresh();
      }
    } catch {
      setErrorMessage("Terjadi kesalahan teknis saat menyimpan transaksi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBalanced = totalItemsAmount > 0 && totalItemsAmount === totalPaymentsAmount;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 pb-28 sm:pb-8">
      {errorMessage && (
        <div className="p-4 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* AI Receipt Scanner Dropzone */}
      <ReceiptScannerDropzone
        householdId={householdId}
        onReceiptScanned={handleReceiptScanned}
      />

      {/* 1. Header Information */}
      <Card className="border-stone-200/80 bg-white shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-base font-semibold text-stone-900 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-800" />
            Informasi Transaksi
          </CardTitle>
          <CardDescription className="text-xs">
            Masukkan judul pembelian, tanggal nota belanja, dan catatan opsional.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="title" className="text-xs font-medium">Judul Transaksi / Merchant</Label>
              <Input
                id="title"
                placeholder="Contoh: Belanja Bulanan Superindo"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isSubmitting}
                className="text-base sm:text-sm h-11 sm:h-9"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-xs font-medium">Tanggal Transaksi</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={isSubmitting}
                className="text-base sm:text-sm h-11 sm:h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-medium">Catatan Tambahan (Opsional)</Label>
            <Input
              id="notes"
              placeholder="Contoh: Termasuk deterjen dan minyak goreng promo"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="text-base sm:text-sm h-11 sm:h-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Draft Chat Prompt Copilot */}
      <AiDraftChatPrompt
        householdId={householdId}
        currentMemberId={currentMemberId}
        members={members}
        currentDraft={currentDraftState}
        onDraftAdjusted={handleDraftAdjusted}
      />

      {/* 2. Itemized Breakdown */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-stone-900">
              Rincian Item Belanja ({items.length})
            </h2>
            <p className="text-[11px] sm:text-xs text-stone-500">
              Setiap barang dapat dialokasikan bersama, personal, atau nominal kustom.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            disabled={isSubmitting}
            className="text-xs border-stone-300 gap-1.5 bg-white hover:bg-stone-50 h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Item</span>
          </Button>
        </div>

        {items.map((item, index) => {
          const subtotal = item.quantity * item.unitPrice;

          return (
            <Card
              key={item.id}
              className="border-stone-200/80 bg-white shadow-sm overflow-hidden"
            >
              <div className="p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
                {/* Item Line Top */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="h-5 w-5 rounded bg-stone-100 border border-stone-200 text-stone-700 text-[11px] font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-xs uppercase tracking-wider font-semibold text-stone-600">
                      Item #{index + 1}
                    </span>
                  </div>

                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      disabled={isSubmitting}
                      className="h-7 w-7 p-0 text-stone-400 hover:text-rose-700 hover:bg-rose-50"
                      title="Hapus Item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {/* Input Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3">
                  <div className="sm:col-span-5 space-y-1">
                    <Label className="text-xs">Nama Barang</Label>
                    <Input
                      placeholder="Misal: Beras 5kg"
                      value={item.name}
                      onChange={(e) =>
                        handleUpdateItem(index, { name: e.target.value })
                      }
                      required
                      disabled={isSubmitting}
                      className="text-base sm:text-sm h-10 sm:h-9"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:contents gap-2">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs">Kuantitas (Qty)</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItem(index, {
                            quantity: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        required
                        disabled={isSubmitting}
                        className="text-base sm:text-sm h-10 sm:h-9"
                      />
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <Label className="text-xs">Harga Satuan (Rp)</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="100"
                        placeholder="0"
                        value={item.unitPrice || ""}
                        onChange={(e) =>
                          handleUpdateItem(index, {
                            unitPrice: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        required
                        disabled={isSubmitting}
                        className="font-mono text-base sm:text-sm tabular-nums h-10 sm:h-9"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-1 flex flex-col justify-end">
                    <div className="flex items-center justify-between sm:justify-start">
                      <Label className="text-xs text-stone-500">Subtotal Item:</Label>
                      <div className="sm:hidden font-mono font-bold text-sm text-stone-900 tabular-nums">
                        {formatIDR(subtotal)}
                      </div>
                    </div>
                    <div className="hidden sm:flex h-9 px-3 items-center justify-start bg-stone-50 border border-stone-200/80 rounded-md font-mono tabular-nums text-xs font-semibold text-stone-900">
                      {formatIDR(subtotal)}
                    </div>
                  </div>
                </div>

                {/* Allocation Mode Selector: Touch-Friendly 3-Column Tabs on Mobile */}
                <div className="pt-2 border-t border-stone-100 space-y-2">
                  <div className="text-[11px] font-medium text-stone-500">
                    Tipe Pembagian Tanggung Jawab:
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:space-x-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateItem(index, { splitType: "SHARED" })
                      }
                      className={`text-xs px-2 sm:px-3 py-2 sm:py-1 rounded-lg sm:rounded-md border font-medium flex items-center justify-center gap-1.5 transition-colors touch-manipulation ${
                        item.splitType === "SHARED"
                          ? "bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold shadow-xs"
                          : "border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span>Patungan</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateItem(index, { splitType: "PERSONAL" })
                      }
                      className={`text-xs px-2 sm:px-3 py-2 sm:py-1 rounded-lg sm:rounded-md border font-medium flex items-center justify-center gap-1.5 transition-colors touch-manipulation ${
                        item.splitType === "PERSONAL"
                          ? "bg-stone-100 border-stone-400 text-stone-900 font-semibold shadow-xs"
                          : "border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <span>Pribadi</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateItem(index, { splitType: "CUSTOM" })
                      }
                      className={`text-xs px-2 sm:px-3 py-2 sm:py-1 rounded-lg sm:rounded-md border font-medium flex items-center justify-center gap-1.5 transition-colors touch-manipulation ${
                        item.splitType === "CUSTOM"
                          ? "bg-blue-50 border-blue-400 text-blue-900 font-semibold shadow-xs"
                          : "border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                      <span>Kustom</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Interface for Split Details */}
                {item.splitType === "SHARED" && (
                  <div className="p-3 bg-stone-50/80 border border-stone-200/70 rounded-lg space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium text-stone-700">
                        Pilih anggota yang ikut patungan:
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleSelectAllParticipants(index)}
                          className="text-emerald-800 hover:underline font-medium px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200"
                        >
                          Semua
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectOnlyMe(index)}
                          className="text-stone-600 hover:underline font-medium px-1.5 py-0.5 rounded bg-white border border-stone-200"
                        >
                          Hanya Saya
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {members.map((member) => {
                        const isChecked = item.participantMemberIds.includes(
                          member.id
                        );
                        return (
                          <label
                            key={member.id}
                            className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-md border cursor-pointer select-none transition-colors touch-manipulation ${
                              isChecked
                                ? "bg-white border-emerald-500 text-emerald-950 font-medium shadow-xs"
                                : "bg-transparent border-stone-200 text-stone-500 hover:bg-stone-100/50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...item.participantMemberIds, member.id]
                                  : item.participantMemberIds.filter(
                                      (id) => id !== member.id
                                    );
                                handleUpdateItem(index, {
                                  participantMemberIds: next,
                                });
                              }}
                              className="sr-only"
                            />
                            <span>{member.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {item.splitType === "PERSONAL" && (
                  <div className="p-3 bg-stone-50/80 border border-stone-200/70 rounded-lg space-y-2">
                    <p className="text-[11px] font-medium text-stone-700">
                      Pilih penanggung jawab penuh barang ini:
                    </p>
                    <select
                      value={item.assignedMemberId}
                      onChange={(e) =>
                        handleUpdateItem(index, {
                          assignedMemberId: e.target.value,
                        })
                      }
                      className="w-full sm:w-auto text-sm sm:text-xs bg-white border border-stone-300 rounded-md px-3 py-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-800"
                    >
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {item.splitType === "CUSTOM" && (
                  <div className="p-3 bg-stone-50/80 border border-stone-200/70 rounded-lg space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                      <div className="text-stone-700 font-medium">
                        Nominal Kustom (Target Subtotal:{" "}
                        <span className="font-mono font-bold text-stone-900">
                          {formatIDR(subtotal)}
                        </span>
                        )
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCustomSplitEqually(index)}
                        className="self-start sm:self-auto text-[11px] text-blue-800 font-medium bg-blue-50 border border-blue-200 rounded px-2 py-0.5 hover:bg-blue-100 transition-colors"
                      >
                        Bagi Rata Otomatis
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {members.map((m) => {
                        const curAlloc =
                          item.customAllocations.find(
                            (a) => a.memberId === m.id
                          )?.amount || 0;

                        return (
                          <div
                            key={m.id}
                            className="flex items-center justify-between gap-2 p-2 bg-white border border-stone-200 rounded-md"
                          >
                            <span className="text-xs text-stone-800 font-medium truncate max-w-[120px]">
                              {m.name}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-stone-400">Rp</span>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                step="100"
                                value={curAlloc || ""}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = Math.max(
                                    0,
                                    parseInt(e.target.value) || 0
                                  );
                                  const nextAllocs = members.map((mem) => {
                                    if (mem.id === m.id) {
                                      return { memberId: mem.id, amount: val };
                                    }
                                    const existing = item.customAllocations.find(
                                      (a) => a.memberId === mem.id
                                    );
                                    return {
                                      memberId: mem.id,
                                      amount: existing?.amount || 0,
                                    };
                                  });
                                  handleUpdateItem(index, {
                                    customAllocations: nextAllocs,
                                  });
                                }}
                                className="w-24 text-right text-sm sm:text-xs font-mono tabular-nums p-1 border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-800"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* 3. Payment Side (Who actually paid the cash) */}
      <Card className="border-stone-200/80 bg-white shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold text-stone-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-800" />
                Penyetor Dana (Siapa yang Bayar di Kasir)
              </CardTitle>
              <CardDescription className="text-xs">
                Catat anggota yang membayarkan uang tunai/QRIS saat transaksi.
              </CardDescription>
            </div>

            {members.length > 1 && payments.length < members.length && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddPayment}
                className="self-start sm:self-auto text-xs text-emerald-800 hover:text-emerald-900 hover:bg-emerald-50 gap-1 h-8 px-2"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Pembayar Lain</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3">
          {payments.map((payment, pIndex) => (
            <div
              key={pIndex}
              className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 p-3 bg-stone-50/80 border border-stone-200/80 rounded-lg"
            >
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] text-stone-500 uppercase font-semibold">
                  Anggota Pembayar
                </Label>
                <select
                  value={payment.memberId}
                  onChange={(e) =>
                    handleUpdatePayment(pIndex, { memberId: e.target.value })
                  }
                  className="w-full text-sm sm:text-xs bg-white border border-stone-300 rounded-md px-3 py-2 text-stone-900"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 sm:w-48 space-y-1">
                  <Label className="text-[10px] text-stone-500 uppercase font-semibold">
                    Nominal Dibayar (Rp)
                  </Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="100"
                    value={payment.amount || ""}
                    onChange={(e) =>
                      handleUpdatePayment(pIndex, {
                        amount: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="font-mono text-base sm:text-xs tabular-nums text-right h-10 sm:h-9"
                  />
                </div>

                {payments.length > 1 && (
                  <div className="pt-5 sm:pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePayment(pIndex)}
                      className="h-9 w-9 p-0 text-stone-400 hover:text-rose-700 hover:bg-rose-50"
                      title="Hapus Pembayar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="pt-2 flex items-center justify-between text-xs">
            <span className="text-stone-500">Total Dana Disetor:</span>
            <span
              className={`font-mono font-semibold tabular-nums ${
                isBalanced ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {formatIDR(totalPaymentsAmount)} / {formatIDR(totalItemsAmount)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Live Calculation Summary Card */}
      <Card className="border-stone-200/80 bg-stone-50/60 shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-3">
          <CardTitle className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <Calculator className="h-4 w-4 text-stone-700" />
            Ringkasan Alokasi & Tanggung Jawab
          </CardTitle>
          <CardDescription className="text-xs">
            Pratinjau tanggung jawab finansial masing-masing anggota untuk transaksi ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            {members.map((m) => {
              const resp = responsibilityPreview[m.id] || 0;
              const paid =
                payments
                  .filter((p) => p.memberId === m.id)
                  .reduce((a, b) => a + b.amount, 0) || 0;
              const net = paid - resp;

              return (
                <div
                  key={m.id}
                  className="p-2.5 sm:p-3 bg-white border border-stone-200/80 rounded-lg space-y-1"
                >
                  <div className="text-xs font-semibold text-stone-900 truncate">
                    {m.name}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Beban:{" "}
                    <span className="font-mono text-stone-700 font-semibold">
                      {formatIDR(resp)}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Bayar:{" "}
                    <span className="font-mono text-stone-700 font-semibold">
                      {formatIDR(paid)}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-stone-100 flex items-center justify-between text-[11px]">
                    <span className="text-stone-500">Net:</span>
                    <span
                      className={`font-mono font-semibold ${
                        net > 0
                          ? "text-emerald-700"
                          : net < 0
                          ? "text-rose-700"
                          : "text-stone-500"
                      }`}
                    >
                      {net > 0 ? `+${formatIDR(net)}` : formatIDR(net)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="border-t border-stone-200/70 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
            {isBalanced ? (
              <span className="inline-flex items-center text-emerald-800 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 mr-1.5 shrink-0" />
                Matematis Seimbang (Total item = Total pembayaran)
              </span>
            ) : (
              <span className="inline-flex items-center text-amber-800 font-medium">
                <AlertCircle className="h-4 w-4 text-amber-700 mr-1.5 shrink-0" />
                Belum Seimbang (Selisih: {formatIDR(Math.abs(totalItemsAmount - totalPaymentsAmount))})
              </span>
            )}
          </div>

          <div className="hidden sm:flex items-center space-x-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Batal
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !isBalanced}
              className="w-full sm:w-auto bg-emerald-800 hover:bg-emerald-900 text-white gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Menyimpan Transaksi...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Simpan Transaksi
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Sticky Bottom Bar for Mobile Devices */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 p-3 sm:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between gap-2.5">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-stone-500 uppercase tracking-wider">
                Total
              </span>
              {isBalanced ? (
                <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1 rounded">
                  Pas
                </span>
              ) : (
                <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-1 rounded">
                  Selisih {formatIDR(Math.abs(totalItemsAmount - totalPaymentsAmount))}
                </span>
              )}
            </div>
            <div className="font-mono font-bold text-sm text-stone-900 tabular-nums truncate">
              {formatIDR(totalItemsAmount)}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="h-10 text-xs px-3 border-stone-300"
            >
              Batal
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !isBalanced}
              className="h-10 text-xs bg-emerald-800 hover:bg-emerald-900 text-white gap-1.5 px-4 font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Simpan</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Simpan</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
