"use server";

import { GoogleGenAI } from "@google/genai";
import { requireHouseholdMember } from "@/lib/auth-guard";

export interface DraftItem {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  splitType: "SHARED" | "PERSONAL" | "CUSTOM";
  participantMemberIds: string[];
  assignedMemberId: string;
  customAllocations: { memberId: string; amount: number }[];
}

export interface DraftPayment {
  memberId: string;
  amount: number;
}

export interface TransactionDraftState {
  title: string;
  date: string;
  notes?: string | null;
  items: DraftItem[];
  payments: DraftPayment[];
}

export interface AdjustDraftPayload {
  householdId: string;
  userPrompt: string;
  currentDraft: TransactionDraftState;
  members: { id: string; name: string }[];
  currentMemberId: string;
}

export interface AdjustDraftResult {
  success: boolean;
  data?: {
    adjustedDraft: TransactionDraftState;
    explanation: string;
  };
  error?: string;
}

/**
 * Server action to intelligently adjust a transaction draft based on natural language instructions.
 */
export async function adjustTransactionDraftAction(
  payload: AdjustDraftPayload
): Promise<AdjustDraftResult> {
  try {
    const { householdId, userPrompt, currentDraft, members, currentMemberId } = payload;

    if (!userPrompt || userPrompt.trim() === "") {
      return {
        success: false,
        error: "Instruksi prompt tidak boleh kosong.",
      };
    }

    // 1. Authorization guard
    await requireHouseholdMember(householdId);

    // 2. Validate API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === "" || apiKey === "your-gemini-api-key-here") {
      return {
        success: false,
        error:
          "GEMINI_API_KEY belum dikonfigurasi di file .env. Silakan tambahkan GEMINI_API_KEY untuk menggunakan asisten AI KostKita.",
      };
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `Anda adalah asisten AI keuangan bersama KostKita yang bertugas memodifikasi DRAFT TRANSAKSI berdasarkan perintah bahasa alami (Bahasa Indonesia).

DAFTAR ANGGOTA KOST:
${JSON.stringify(members, null, 2)}
Catatan: ID pengguna saat ini yang sedang aktif adalah "${currentMemberId}". Jika pengguna berkata "saya", "punya saya", atau "milikku", rujuklah ke ID ini.

DRAFT TRANSAKSI SAAT INI:
${JSON.stringify(currentDraft, null, 2)}

PERINTAH MODIFIKASI DARI PENGGUNA:
"${userPrompt.trim()}"

ATURAN REKAYASA KEUANGAN:
1. Pahami nama anggota yang disebut pengguna dan cocokkan dengan 'id' yang sesuai dari DAFTAR ANGGOTA.
2. Tipe Pembagian (splitType):
   - "SHARED": Dibagi rata di antara anggota yang ada di 'participantMemberIds' (array of memberId). Jika pengguna bilang "bagi ke semua", masukkan seluruh ID anggota. Jika bilang "cuma buat Budi dan Naufal", masukkan hanya ID mereka.
   - "PERSONAL": Beban 100% milik satu orang. Set 'assignedMemberId' ke ID orang tersebut.
   - "CUSTOM": Pembagian nominal spesifik. Set 'customAllocations' berupa array [{ memberId, amount }]. Pastikan jumlah nominal sama persis dengan subtotal item (quantity * unitPrice).
3. Modifikasi Item:
   - Pengguna bisa meminta mengubah harga ("ganti harga telur jadi 30rb"), menambah item ("tambah kopi 15rb"), menghapus item ("hapus kantong plastik"), atau mengubah kuantitas.
   - Setiap item wajib memiliki: name (string), quantity (integer >= 1), unitPrice (integer >= 0).
   - Pastikan setiap item memiliki 'splitType', 'participantMemberIds', 'assignedMemberId', dan 'customAllocations' yang valid untuk semua anggota.
4. Sinkronisasi Pembayaran (Payments):
   - Hitung total belanja: totalAmount = sum(item.quantity * item.unitPrice).
   - Jika pengguna mengubah siapa yang membayar (contoh: "yang bayar Andi", "Budi bayar 50rb dan Dimas sisanya"), perbarui array 'payments'.
   - Jika pengguna tidak menyebut siapa yang bayar, sesuaikan total pembayaran pada 'payments' agar jumlahnya sama persis dengan total seluruh item baru (jika hanya ada 1 pembayar, set nominal pembayar tersebut = totalAmount).
5. Output:
   Kembalikan HANYA JSON murni (valid JSON) tanpa markdown fences tambahan.
   Skema JSON:
   {
     "adjustedDraft": {
       "title": "Judul Transaksi",
       "date": "YYYY-MM-DD",
       "notes": "Catatan tambahan atau null",
       "items": [
         {
           "id": "id item",
           "name": "nama item",
           "quantity": 1,
           "unitPrice": 15000,
           "splitType": "SHARED | PERSONAL | CUSTOM",
           "participantMemberIds": ["id1", "id2"],
           "assignedMemberId": "id1",
           "customAllocations": [{"memberId": "id1", "amount": 15000}]
         }
       ],
       "payments": [
         {
           "memberId": "id1",
           "amount": 15000
         }
       ]
     },
     "explanation": "Penjelasan ringkas dalam bahasa Indonesia tentang apa saja yang telah diubah (1-2 kalimat ramah)."
   }`;

    let responseText: string | undefined;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            text: systemInstruction,
          },
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });
      responseText = response.text;
    } catch (primaryErr) {
      console.warn("Primary gemini-2.0-flash failed for adjustDraft, falling back to gemini-1.5-flash:", primaryErr);
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          {
            text: systemInstruction,
          },
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });
      responseText = fallbackResponse.text;
    }

    if (!responseText) {
      return {
        success: false,
        error: "Gemini tidak memberikan respons modifikasi draf.",
      };
    }

    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(cleanJson);

    if (!parsed.adjustedDraft || !Array.isArray(parsed.adjustedDraft.items)) {
      return {
        success: false,
        error: "Format respons AI tidak sesuai dengan skema draf transaksi.",
      };
    }

    // Sanitize items and guarantee valid member references
    const validMemberIds = new Set(members.map((m) => m.id));

    const sanitizedItems: DraftItem[] = parsed.adjustedDraft.items.map(
      (it: any, idx: number) => {
        const qty = Math.max(1, Math.round(Number(it.quantity) || 1));
        const unit = Math.max(0, Math.round(Number(it.unitPrice) || 0));

        let splitType: "SHARED" | "PERSONAL" | "CUSTOM" =
          it.splitType === "PERSONAL" || it.splitType === "CUSTOM"
            ? it.splitType
            : "SHARED";

        let participantMemberIds: string[] = Array.isArray(it.participantMemberIds)
          ? it.participantMemberIds.filter((id: string) => validMemberIds.has(id))
          : [];
        if (participantMemberIds.length === 0) {
          participantMemberIds = members.map((m) => m.id);
        }

        let assignedMemberId =
          it.assignedMemberId && validMemberIds.has(it.assignedMemberId)
            ? it.assignedMemberId
            : currentMemberId;

        let customAllocations: { memberId: string; amount: number }[] = members.map(
          (m) => {
            const existing = Array.isArray(it.customAllocations)
              ? it.customAllocations.find((c: any) => c.memberId === m.id)
              : null;
            return {
              memberId: m.id,
              amount: existing ? Math.max(0, Math.round(Number(existing.amount) || 0)) : 0,
            };
          }
        );

        return {
          id: it.id || `item-adj-${Date.now()}-${idx}`,
          name: String(it.name || "Item Belanja").trim(),
          quantity: qty,
          unitPrice: unit,
          splitType,
          participantMemberIds,
          assignedMemberId,
          customAllocations,
        };
      }
    );

    // Sanitize payments
    let sanitizedPayments: DraftPayment[] = Array.isArray(
      parsed.adjustedDraft.payments
    )
      ? parsed.adjustedDraft.payments
          .filter((p: any) => validMemberIds.has(p.memberId))
          .map((p: any) => ({
            memberId: p.memberId,
            amount: Math.max(0, Math.round(Number(p.amount) || 0)),
          }))
      : [];

    const totalCalculatedItems = sanitizedItems.reduce(
      (acc, it) => acc + it.quantity * it.unitPrice,
      0
    );

    if (sanitizedPayments.length === 0) {
      sanitizedPayments = [{ memberId: currentMemberId, amount: totalCalculatedItems }];
    } else if (sanitizedPayments.length === 1) {
      sanitizedPayments = [{ memberId: sanitizedPayments[0].memberId, amount: totalCalculatedItems }];
    }

    const adjustedDraft: TransactionDraftState = {
      title: parsed.adjustedDraft.title || currentDraft.title || "Transaksi Belanja",
      date: parsed.adjustedDraft.date || currentDraft.date,
      notes: parsed.adjustedDraft.notes !== undefined ? parsed.adjustedDraft.notes : currentDraft.notes,
      items: sanitizedItems,
      payments: sanitizedPayments,
    };

    return {
      success: true,
      data: {
        adjustedDraft,
        explanation:
          parsed.explanation ||
          "Draf transaksi telah disesuaikan berdasarkan instruksi Anda.",
      },
    };
  } catch (err: any) {
    console.error("Adjust Draft Server Action Error:", err);
    return {
      success: false,
      error:
        err?.message ||
        "Gagal menyesuaikan draf dengan AI. Pastikan instruksi jelas dan coba lagi.",
    };
  }
}
