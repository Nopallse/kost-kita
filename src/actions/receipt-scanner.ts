"use server";

import { GoogleGenAI } from "@google/genai";
import { requireHouseholdMember } from "@/lib/auth-guard";

export interface ScannedReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ScannedReceiptData {
  merchantName?: string;
  suggestedTitle: string;
  date?: string; // YYYY-MM-DD
  items: ScannedReceiptItem[];
  totalAmount: number;
  notes?: string;
}

export type ScanReceiptActionResult = {
  success: boolean;
  data?: ScannedReceiptData;
  error?: string;
};

const SYSTEM_INSTRUCTION = `Anda adalah asisten AI akuntansi pintar untuk aplikasi keuangan bersama KostKita.
Tugas Anda adalah membaca gambar struk belanja, nota kontan, bon, faktur, atau screenshot pembayaran (GoFood, GrabFood, Shopee, Indomaret, Alfamart, restoran, supermarket, PLN token, dll.) dalam mata uang Rupiah (IDR).

Ekstrak informasi secara teliti dan kembalikan HANYA JSON murni (valid JSON) dengan skema berikut:
{
  "merchantName": "Nama Toko / Restoran / Vendor (contoh: Indomaret, Alfamidi, Warung Makan, PLN)",
  "suggestedTitle": "Judul transaksi yang ringkas dan jelas (contoh: Belanja Bulanan Indomaret, Makan Malam)",
  "date": "YYYY-MM-DD jika tanggal tertera di struk, atau null jika tidak jelas",
  "items": [
    {
      "name": "Nama item atau barang (bersihkan dari kode SKU/barcode acak)",
      "quantity": 1,
      "unitPrice": 15000,
      "subtotal": 15000
    }
  ],
  "totalAmount": 15000,
  "notes": "Catatan ringkas jika ada info tambahan seperti nomor struk atau metode pembayaran"
}

ATURAN PENTING:
1. Pastikan setiap item memiliki 'quantity' >= 1, 'unitPrice' >= 0, dan 'subtotal' = quantity * unitPrice.
2. Jika ada diskon per item, hitung harga satuan bersih setelah diskon.
3. Jika ada pajak (PPN/PB1), biaya layanan, biaya kantong plastik, atau ongkos kirim di struk, masukkan sebagai item baris tersendiri (misal: "Pajak Restoran (PB1)", "Biaya Layanan / Kantong") agar total seluruh item sinkron dengan totalAmount.
4. Semua nilai uang harus berupa angka integer IDR (Rupiah bulat, tanpa simbol 'Rp', titik, atau koma).
5. Jangan sertakan teks markdown pembuka/penutup seperti \`\`\`json ... \`\`\`, kembalikan string JSON valid saja.`;

/**
 * Server Action to parse a receipt image using Google Gemini Multimodal Flash models.
 */
export async function scanReceiptAction(payload: {
  householdId: string;
  base64Image: string;
  mimeType: string;
}): Promise<ScanReceiptActionResult> {
  try {
    const { householdId, base64Image, mimeType } = payload;

    // 1. Authorization guard: User must be a member of this household
    await requireHouseholdMember(householdId);

    // 2. Validate API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === "" || apiKey === "your-gemini-api-key-here") {
      return {
        success: false,
        error:
          "GEMINI_API_KEY belum dikonfigurasi di file .env. Silakan tambahkan GEMINI_API_KEY (dapat diperoleh gratis di Google AI Studio) untuk mengaktifkan fitur scan struk otomatis.",
      };
    }

    // 3. Strip data URL prefix if present (e.g. data:image/jpeg;base64,...)
    const cleanBase64 = base64Image.includes(",")
      ? base64Image.split(",")[1]
      : base64Image;

    const validMimeType = mimeType || "image/jpeg";

    const ai = new GoogleGenAI({ apiKey });

    // Multi-model resilience: try active models in priority order
    const SUPPORTED_MODELS = [
      "gemini-3.5-flash-lite",
      "gemini-3.8-flash",
      "gemini-3.5-flash",
      "gemini-flash-latest",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
    ];

    let responseText: string | undefined;
    let lastError: any = null;

    for (const model of SUPPORTED_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: validMimeType,
              },
            },
            {
              text: SYSTEM_INSTRUCTION,
            },
          ],
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });

        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} failed, trying next candidate:`, err?.message || err);
      }
    }

    if (!responseText) {
      return {
        success: false,
        error:
          lastError?.message ||
          "Gemini tidak dapat memproses gambar struk. Silakan coba kembali atau gunakan foto yang lebih jelas.",
      };
    }

    // Parse JSON safely
    let cleanJsonString = responseText.trim();
    if (cleanJsonString.startsWith("```json")) {
      cleanJsonString = cleanJsonString.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanJsonString.startsWith("```")) {
      cleanJsonString = cleanJsonString.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(cleanJsonString);

    // Validate and sanitize data
    const items: ScannedReceiptItem[] = Array.isArray(parsed.items)
      ? parsed.items.map((it: any) => {
          const qty = Math.max(1, Math.round(Number(it.quantity) || 1));
          const unit = Math.max(0, Math.round(Number(it.unitPrice) || 0));
          const sub = unit > 0 ? unit * qty : Math.max(0, Math.round(Number(it.subtotal) || 0));
          return {
            name: String(it.name || "Item Belanja").trim(),
            quantity: qty,
            unitPrice: unit > 0 ? unit : Math.round(sub / qty),
            subtotal: sub,
          };
        })
      : [];

    if (items.length === 0) {
      return {
        success: false,
        error: "AI tidak dapat mendeteksi item belanja dari gambar ini. Pastikan foto struk terlihat jelas dan cukup terang.",
      };
    }

    const totalCalculated = items.reduce((acc, it) => acc + it.subtotal, 0);
    const parsedTotal = Math.round(Number(parsed.totalAmount) || 0);

    const resultData: ScannedReceiptData = {
      merchantName: parsed.merchantName || undefined,
      suggestedTitle:
        parsed.suggestedTitle ||
        (parsed.merchantName ? `Belanja di ${parsed.merchantName}` : "Transaksi Belanja Bersama"),
      date: typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
        ? parsed.date
        : undefined,
      items,
      totalAmount: parsedTotal > 0 ? parsedTotal : totalCalculated,
      notes: parsed.notes || undefined,
    };

    return {
      success: true,
      data: resultData,
    };
  } catch (err: any) {
    console.error("Receipt Scanner Server Action Error:", err);
    return {
      success: false,
      error:
        err?.message ||
        "Gagal memproses struk dengan Gemini. Silakan coba kembali dengan gambar yang lebih jelas.",
    };
  }
}

