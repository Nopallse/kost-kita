"use client";

import * as React from "react";
import { scanReceiptAction, type ScannedReceiptData } from "@/actions/receipt-scanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  UploadCloud,
  Camera,
  FileImage,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { formatIDR } from "@/lib/utils";

interface ReceiptScannerDropzoneProps {
  householdId: string;
  onReceiptScanned: (data: ScannedReceiptData, imagePreviewUrl?: string) => void;
}

export function ReceiptScannerDropzone({
  householdId,
  onReceiptScanned,
}: ReceiptScannerDropzoneProps) {
  const [isScanning, setIsScanning] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successInfo, setSuccessInfo] = React.useState<string | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [showPreview, setShowPreview] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Format file tidak didukung. Harap unggah gambar struk (JPG, PNG, atau WEBP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Ukuran gambar terlalu besar (maksimal 10MB).");
      return;
    }

    setErrorMessage(null);
    setSuccessInfo(null);
    setIsScanning(true);

    try {
      // 1. Convert file to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<{ base64: string; preview: string }>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve({ base64: result, preview: result });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { base64, preview } = await base64Promise;
      setImagePreview(preview);
      setShowPreview(true);

      // 2. Call Server Action
      const res = await scanReceiptAction({
        householdId,
        base64Image: base64,
        mimeType: file.type,
      });

      if (!res.success || !res.data) {
        setErrorMessage(res.error || "Gagal memproses struk belanja.");
        return;
      }

      // 3. Notify parent form
      setSuccessInfo(
        `Berhasil mengekstrak ${res.data.items.length} item (${formatIDR(
          res.data.totalAmount
        )}). Data telah dimasukkan ke formulir di bawah.`
      );
      onReceiptScanned(res.data, preview);
    } catch (err: any) {
      setErrorMessage(err?.message || "Terjadi kesalahan saat memproses gambar.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleProcessFile(files[0]);
    }
  };

  // Support Ctrl+V paste on the dropzone
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            handleProcessFile(file);
            break;
          }
        }
      }
    }
  };

  const handleClearImage = () => {
    setImagePreview(null);
    setShowPreview(false);
    setSuccessInfo(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div
      tabIndex={0}
      onPaste={handlePaste}
      className="outline-none"
      aria-label="Zona Scan Struk AI"
    >
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 ${
          isDragging
            ? "border-stone-800 bg-stone-100/80 scale-[1.005]"
            : "border-stone-300/80 bg-[#FAF9F5]/70 hover:bg-[#FAF9F5] hover:border-stone-400"
        }`}
      >
        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) handleProcessFile(files[0]);
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) handleProcessFile(files[0]);
          }}
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-lg bg-amber-100/70 border border-amber-200/80 flex items-center justify-center shrink-0 text-amber-800">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-medium text-stone-900 tracking-tight text-base">
                  Scan Struk Otomatis (Gemini Vision)
                </span>
                <Badge
                  variant="outline"
                  className="bg-stone-100/90 text-stone-700 border-stone-200 text-[11px] font-mono px-2 py-0"
                >
                  AI Draft
                </Badge>
              </div>
              <p className="text-xs text-stone-600 mt-1 max-w-xl">
                Upload foto atau screenshot struk belanja (Indomaret, Alfamart, restoran, nota warung). AI akan otomatis mengekstrak daftar barang, harga, dan nominal ke form draft.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isScanning}
              onClick={() => cameraInputRef.current?.click()}
              className="text-xs border-stone-300 text-stone-700 hover:bg-stone-100 flex-1 sm:flex-initial"
            >
              <Camera className="h-3.5 w-3.5 mr-1.5" />
              Foto Kamera
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isScanning}
              onClick={() => fileInputRef.current?.click()}
              className="text-xs bg-stone-900 text-stone-50 hover:bg-stone-800 flex-1 sm:flex-initial"
            >
              <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
              Pilih Gambar
            </Button>
          </div>
        </div>

        {/* Drag & Paste Hint */}
        <div className="mt-3 text-[11px] text-stone-500 flex items-center justify-between border-t border-stone-200/70 pt-2.5">
          <span>Tips: Anda juga bisa <strong>drag & drop</strong> gambar ke kotak ini atau tekan <strong>Ctrl + V</strong> untuk paste screenshot.</span>
          {imagePreview && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-stone-700 hover:text-stone-950 underline flex items-center gap-1 font-medium"
              >
                {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showPreview ? "Sembunyikan Struk" : "Lihat Foto Struk"}
              </button>
              <button
                type="button"
                onClick={handleClearImage}
                className="text-stone-500 hover:text-rose-600 flex items-center gap-0.5 ml-2"
                title="Hapus foto"
              >
                <X className="h-3 w-3" />
                Hapus
              </button>
            </div>
          )}
        </div>

        {/* Loading Spinner */}
        {isScanning && (
          <div className="mt-4 p-4 rounded-lg bg-stone-100/90 border border-stone-200 flex items-center gap-3 animate-pulse">
            <Loader2 className="h-5 w-5 text-amber-700 animate-spin shrink-0" />
            <div className="text-xs text-stone-800">
              <p className="font-medium">Sedang memproses struk dengan Gemini Vision...</p>
              <p className="text-stone-500 text-[11px]">Mengekstrak nama toko, tanggal, item barang, kuantitas, dan rincian harga.</p>
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <div className="mt-4 p-3.5 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Gagal memindai struk</p>
              <p className="mt-0.5 text-rose-700">{errorMessage}</p>
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

        {/* Success Feedback */}
        {successInfo && (
          <div className="mt-4 p-3.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Struk berhasil dipindai!</p>
              <p className="mt-0.5 text-emerald-700">{successInfo}</p>
            </div>
            <button
              type="button"
              onClick={() => setSuccessInfo(null)}
              className="text-emerald-500 hover:text-emerald-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Image Preview Drawer */}
        {imagePreview && showPreview && (
          <div className="mt-4 p-3 bg-white border border-stone-200 rounded-lg">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100 text-xs font-medium text-stone-700">
              <span className="flex items-center gap-1.5">
                <FileImage className="h-3.5 w-3.5 text-stone-500" />
                Pratinjau Foto Struk
              </span>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="max-h-72 overflow-auto rounded bg-stone-50 flex items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Foto struk belanja"
                className="max-h-64 object-contain rounded shadow-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

