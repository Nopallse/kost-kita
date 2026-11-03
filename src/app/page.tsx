import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, ShieldCheck, Calculator, Split } from "lucide-react";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF9F5] text-stone-900">
      {/* Editorial Navigation */}
      <header className="border-b border-stone-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-6 w-6 rounded bg-emerald-800 flex items-center justify-center text-white text-xs font-bold tracking-wider">
              K
            </div>
            <span className="font-semibold tracking-tight text-stone-900 text-lg">KostKita</span>
            <Badge variant="outline" className="text-[10px] text-stone-500 border-stone-300">
              Editorial Ledger
            </Badge>
          </div>

          <div className="flex items-center space-x-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-stone-700 hover:text-stone-950">
                Masuk
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium">
                Mulai Sekarang
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-20">
        <div className="max-w-2xl space-y-6">
          <Badge variant="shared" className="text-xs">
            Sistem Manajemen Finansial Bersama
          </Badge>

          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.15] text-stone-950">
            Kejelasan finansial untuk tempat tinggal bersama.
          </h1>

          <p className="text-lg text-stone-600 leading-relaxed font-normal">
            KostKita membedakan secara tegas antara <strong>apa yang dibeli</strong>,{" "}
            <strong>siapa yang bertanggung jawab</strong>, dan <strong>siapa yang membayar</strong>.
            Kalkulasi berbasis integer Rupiah presisi tanpa pembulatan mengambang.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto bg-emerald-800 hover:bg-emerald-900 text-white gap-2 font-medium">
                Daftar Akun Instan
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-stone-300 bg-white hover:bg-stone-50">
                Masuk ke Akun
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Pilar Arsitektur Finansial */}
        <section className="mt-24 pt-12 border-t border-stone-200">
          <p className="text-xs uppercase tracking-widest text-stone-500 font-semibold mb-6">
            Pilar Integritas Buku Kas
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border border-stone-200/80 space-y-3">
              <div className="h-9 w-9 rounded-md bg-stone-100 flex items-center justify-center text-stone-700">
                <Split className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-stone-900">1. Alokasi Item Campuran</h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Satu struk belanja dapat memuat belanja bersama (sabun, detergen) dan barang personal (snack pribadi) secara sekaligus.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-stone-200/80 space-y-3">
              <div className="h-9 w-9 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-800">
                <Calculator className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-stone-900">2. Saldo Nol (Zero-Sum Invariant)</h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Total piutang seluruh anggota rumah tangga harus selalu persis mengimbangi total utang:{" "}
                <span className="font-mono text-xs bg-stone-100 px-1 py-0.5 rounded">Σ Saldo Bersih = Rp0</span>.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-stone-200/80 space-y-3">
              <div className="h-9 w-9 rounded-md bg-stone-100 flex items-center justify-center text-stone-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-stone-900">3. Settlement Idempoten</h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Pelunasan reimbursement hanya mengubah saldo setelah dikonfirmasi oleh penerima dana, mencegah dobel klaim.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        KostKita Ledger &copy; 2026. Built with Next.js App Router, Prisma & Neon PostgreSQL.
      </footer>
    </div>
  );
}

