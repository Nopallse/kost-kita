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
          participantMemberIds: it.participantMemberIds,
          assignedMemberId: it.assignedMemberId,
          customAllocations: it.customAllocations,
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
    <form onSubmit={handleSubmit} className="space-y-8">
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
        <CardHeader>
          <CardTitle className="text-base font-semibold text-stone-900 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-800" />
            Informasi Transaksi
          </CardTitle>
          <CardDescription>
            Masukkan judul pembelian, tanggal nota belanja, dan catatan opsional.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="title">Judul Transaksi / Merchant</Label>
              <Input
                id="title"
                placeholder="Contoh: Belanja Bulanan Superindo"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date">Tanggal Transaksi</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Catatan Tambahan (Opsional)</Label>
            <Input
              id="notes"
              placeholder="Contoh: Termasuk deterjen dan minyak goreng promo"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-900">
              Rincian Item Belanja
            </h2>
            <p className="text-xs text-stone-500">
              Setiap barang dapat dialokasikan bersama, personal, atau nominal kustom.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            disabled={isSubmitting}
            className="text-xs border-stone-300 gap-1.5 bg-white hover:bg-stone-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Item
          </Button>
        </div>

        {items.map((item, index) => {
          const subtotal = item.quantity * item.unitPrice;

          return (
            <Card
              key={item.id}
              className="border-stone-200/80 bg-white shadow-sm overflow-hidden"
            >
              <div className="p-4 sm:p-5 space-y-4">
                {/* Item Line Top */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="h-5 w-5 rounded bg-stone-100 border border-stone-200 text-stone-600 text-[11px] font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-xs uppercase tracking-wider font-semibold text-stone-500">
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
                      className="h-7 w-7 p-0 text-stone-400 hover:text-rose-700"
                      title="Hapus Item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {/* Input Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-5 space-y-1.5">
                    <Label>Nama Barang</Label>
                    <Input
                      placeholder="Misal: Beras 5kg"
                      value={item.name}
                      onChange={(e) =>
                        handleUpdateItem(index, { name: e.target.value })
                      }
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Jumlah (Qty)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateItem(index, {
                          quantity: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1.5">
                    <Label>Harga Satuan (Rp)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="500"
                      placeholder="0"
                      value={item.unitPrice || ""}
                      onChange={(e) =>
                        handleUpdateItem(index, {
                          unitPrice: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5 flex flex-col justify-end">
                    <Label className="text-right sm:text-left">Subtotal</Label>
                    <div className="h-9 px-3 flex items-center justify-end sm:justify-start bg-stone-50 border border-stone-200/80 rounded-md font-mono tabular-nums text-xs font-semibold text-stone-900">
                      {formatIDR(subtotal)}
                    </div>
                  </div>
                </div>

                {/* Allocation Mode Selector */}
                <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateItem(index, { splitType: "SHARED" })
                      }
                      className={`text-xs px-2.5 py-1 rounded-md border font-medium flex items-center gap-1.5 transition-colors ${
                        item.splitType === "SHARED"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                          : "border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      <Users className="h-3 w-3" />
                      Shared (Patungan)
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateItem(index, { splitType: "PERSONAL" })
                      }
                      className={`text-xs px-2.5 py-1 rounded-md border font-medium flex items-center gap-1.5 transition-colors ${
                        item.splitType === "PERSONAL"
                          ? "bg-stone-100 border-stone-400 text-stone-900"
                          : "border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      <User className="h-3 w-3" />
                      Personal (Pribadi)
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateItem(index, { splitType: "CUSTOM" })
                      }
                      className={`text-xs px-2.5 py-1 rounded-md border font-medium flex items-center gap-1.5 transition-colors ${
                        item.splitType === "CUSTOM"
                          ? "bg-blue-50 border-blue-300 text-blue-800"
                          : "border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      <SlidersHorizontal className="h-3 w-3" />
                      Kustom
                    </button>
                  </div>

                  {/* Allocation Details per Type */}
                  <div className="text-xs text-stone-500">
                    {item.splitType === "SHARED" && (
                      <span>Dibagi rata secara deterministik</span>
                    )}
                    {item.splitType === "PERSONAL" && (
                      <span>100% ditanggung 1 anggota</span>
                    )}
                    {item.splitType === "CUSTOM" && (
                      <span>Nominal manual per anggota</span>
                    )}
                  </div>
                </div>

                {/* Sub-Interface for Split Details */}
                {item.splitType === "SHARED" && (
                  <div className="p-3 bg-stone-50/70 border border-stone-200/60 rounded-md space-y-2">
                    <p className="text-[11px] font-medium text-stone-600">
                      Pilih anggota yang ikut patungan barang ini:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {members.map((member) => {
                        const isChecked = item.participantMemberIds.includes(
                          member.id
                        );
                        return (
                          <label
                            key={member.id}
                            className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded border cursor-pointer select-none transition-colors ${
                              isChecked
                                ? "bg-white border-emerald-400 text-stone-900 shadow-sm"
                                : "bg-transparent border-stone-200 text-stone-400"
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
                  <div className="p-3 bg-stone-50/70 border border-stone-200/60 rounded-md space-y-2">
                    <p className="text-[11px] font-medium text-stone-600">
                      Pilih penanggung jawab penuh barang ini:
                    </p>
                    <select
                      value={item.assignedMemberId}
                      onChange={(e) =>
                        handleUpdateItem(index, {
                          assignedMemberId: e.target.value,
                        })
                      }
                      className="text-xs bg-white border border-stone-300 rounded px-2.5 py-1.5 text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-800"
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
                  <div className="p-3 bg-stone-50/70 border border-stone-200/60 rounded-md space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium text-stone-600">
                        Rincian nominal kustom (Harus berjumlah{" "}
                        <span className="font-mono font-semibold">
                          {formatIDR(subtotal)}
                        </span>
                        ):
                      </p>
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
                            className="flex items-center justify-between gap-2 p-1.5 bg-white border border-stone-200 rounded"
                          >
                            <span className="text-xs text-stone-700 truncate max-w-[120px]">
                              {m.name}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-stone-400">Rp</span>
                              <input
                                type="number"
                                min="0"
                                step="500"
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
                                className="w-24 text-right text-xs font-mono tabular-nums p-1 border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-800"
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-stone-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-800" />
                Penyetor Dana (Siapa yang Bayar di Kasir)
              </CardTitle>
              <CardDescription>
                Catat anggota yang membayarkan uang tunai/QRIS saat transaksi.
              </CardDescription>
            </div>

            {members.length > 1 && payments.length < members.length && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddPayment}
                className="text-xs text-emerald-800 hover:text-emerald-900 hover:bg-emerald-50 gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Pembayar Lain
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {payments.map((payment, pIndex) => (
            <div
              key={pIndex}
              className="flex items-center gap-3 p-3 bg-stone-50/70 border border-stone-200/70 rounded-md"
            >
              <div className="flex-1">
                <Label className="text-[10px] text-stone-500 uppercase">
                  Anggota Pembayar
                </Label>
                <select
                  value={payment.memberId}
                  onChange={(e) =>
                    handleUpdatePayment(pIndex, { memberId: e.target.value })
                  }
                  className="w-full text-xs bg-white border border-stone-300 rounded px-2.5 py-1.5 text-stone-900 mt-1"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-40 sm:w-48">
                <Label className="text-[10px] text-stone-500 uppercase">
                  Nominal Dibayar (Rp)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="500"
                  value={payment.amount || ""}
                  onChange={(e) =>
                    handleUpdatePayment(pIndex, {
                      amount: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                  className="font-mono text-xs tabular-nums text-right mt-1"
                />
              </div>

              {payments.length > 1 && (
                <div className="pt-5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePayment(pIndex)}
                    className="h-8 w-8 p-0 text-stone-400 hover:text-rose-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
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
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <Calculator className="h-4 w-4 text-stone-700" />
            Ringkasan Alokasi & Tanggung Jawab
          </CardTitle>
          <CardDescription className="text-xs">
            Pratinjau tanggung jawab finansial masing-masing anggota untuk transaksi ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                  className="p-3 bg-white border border-stone-200/80 rounded-md space-y-1"
                >
                  <div className="text-xs font-medium text-stone-900 truncate">
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
        <CardFooter className="border-t border-stone-200/70 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs">
            {isBalanced ? (
              <span className="inline-flex items-center text-emerald-800 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 mr-1.5" />
                Matematis Seimbang (Total item = Total pembayaran)
              </span>
            ) : (
              <span className="inline-flex items-center text-amber-800 font-medium">
                <AlertCircle className="h-4 w-4 text-amber-700 mr-1.5" />
                Belum Seimbang (Selisih: {formatIDR(Math.abs(totalItemsAmount - totalPaymentsAmount))})
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
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
    </form>
  );
}

