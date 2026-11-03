"use client";

import * as React from "react";
import {
  adjustTransactionDraftAction,
  type TransactionDraftState,
  type DraftItem,
  type DraftPayment,
} from "@/actions/draft-adjuster";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  CornerDownLeft,
  X,
  History,
} from "lucide-react";

interface AiDraftChatPromptProps {
  householdId: string;
  currentMemberId: string;
  members: { id: string; name: string }[];
  currentDraft: TransactionDraftState;
  onDraftAdjusted: (newDraft: TransactionDraftState) => void;
}

export function AiDraftChatPrompt({
  householdId,
  currentMemberId,
  members,
  currentDraft,
  onDraftAdjusted,
}: AiDraftChatPromptProps) {
  const [prompt, setPrompt] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [lastExplanation, setLastExplanation] = React.useState<string | null>(null);

  // Quick prompt suggestions
  const suggestions = [
    "Bagi rata semua item ke seluruh anggota",
    "Jadikan item terakhir pengeluaran personal saya",
    "Ubah pembayar jadi saya 100%",
  ];

  const handleSubmit = async (promptText?: string) => {
    const textToSend = (promptText || prompt).trim();
    if (!textToSend || isLoading) return;

    setErrorMessage(null);
    setLastExplanation(null);
    setIsLoading(true);

    try {
      const res = await adjustTransactionDraftAction({
        householdId,
        userPrompt: textToSend,
        currentDraft,
        members,
        currentMemberId,
      });

      if (!res.success || !res.data) {
        setErrorMessage(res.error || "Gagal menyesuaikan draf transaksi.");
        return;
      }

      onDraftAdjusted(res.data.adjustedDraft);
      setLastExplanation(res.data.explanation);
      setPrompt("");
    } catch (err: any) {
      setErrorMessage(err?.message || "Terjadi kesalahan saat memproses perintah AI.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-stone-50/80 border border-stone-200/90 rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-stone-900 text-stone-100 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold text-stone-900 tracking-tight">
            AI Copilot Modifikasi Draf
          </span>
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-1.5 text-stone-600 bg-white border-stone-200"
          >
            Gemini Flash
          </Badge>
        </div>
        <span className="text-[11px] text-stone-500 hidden sm:inline">
          Ketik instruksi bahasa Indonesia untuk ubah harga, alokasi split, atau pembayar
        </span>
      </div>

      {/* Input Form Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Contoh: 'Bagi kopi cuma buat Budi dan Andi', 'Ganti harga telur jadi 30rb'..."
            className="w-full text-xs bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 disabled:opacity-50"
          />
        </div>
        <Button
          type="button"
          size="sm"
          disabled={isLoading || !prompt.trim()}
          onClick={() => handleSubmit()}
          className="bg-stone-900 text-stone-50 hover:bg-stone-800 text-xs px-3.5 h-8 shrink-0"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <Send className="h-3.5 w-3.5 mr-1" />
          )}
          Terapkan
        </Button>
      </div>

      {/* Quick Suggestion Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[11px] text-stone-500 flex items-center gap-1 mr-1">
          <CornerDownLeft className="h-3 w-3" /> Coba cepat:
        </span>
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => {
              setPrompt(s);
              handleSubmit(s);
            }}
            className="text-[11px] bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/80 rounded-md px-2 py-0.5 transition-colors disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* AI Explanation / Result Toast */}
      {lastExplanation && (
        <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-2.5 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-emerald-900">Perubahan Draf Berhasil Diterapkan:</p>
              <p className="text-emerald-700 mt-0.5">{lastExplanation}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLastExplanation(null)}
            className="text-emerald-500 hover:text-emerald-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Error Feedback */}
      {errorMessage && (
        <div className="text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-2.5 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-rose-900">Gagal Memodifikasi Draf:</p>
              <p className="text-rose-700 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

