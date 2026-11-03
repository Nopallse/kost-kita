import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-[#FAF9F5]">
      <p className="text-xs font-mono font-medium uppercase tracking-widest text-stone-500">
        404 — Halaman Tidak Ditemukan
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
        Buku kas tidak menemukan entri ini
      </h2>
      <p className="mt-2 max-w-sm text-sm text-stone-600">
        Tautan yang Anda tuju mungkin salah ketik atau telah dipindahkan ke halaman lain.
      </p>
      <div className="mt-6">
        <Link href="/">
          <Button variant="outline" className="border-stone-300">
            Kembali ke Beranda
          </Button>
        </Link>
      </div>
    </div>
  );
}

