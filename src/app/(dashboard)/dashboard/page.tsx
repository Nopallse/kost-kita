import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, UserPlus, Home, ArrowUpRight, ArrowDownRight, Wallet, Receipt } from "lucide-react";
import Link from "next/link";
import { formatIDR } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch active memberships
  const memberships = await prisma.householdMember.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    include: {
      household: true,
    },
  });

  const activeMembership = memberships[0];

  if (!activeMembership) {
    return (
      <div className="max-w-xl mx-auto py-12 space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="outline" className="text-stone-500 border-stone-300">
            Langkah Pertama
          </Badge>
          <h1 className="text-2xl font-semibold text-stone-900">
            Selamat Datang di KostKita, {session.user.name || "Teman Kost"}!
          </h1>
          <p className="text-sm text-stone-600">
            Anda belum tergabung dalam rumah tangga atau kost manapun. Buat kost baru atau minta kode undangan dari teman sekamar.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-stone-200 hover:border-emerald-700 transition-colors bg-white">
            <CardHeader className="space-y-1">
              <div className="h-8 w-8 rounded bg-emerald-50 text-emerald-800 flex items-center justify-center mb-2">
                <Home className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">Buat Rumah Tangga</CardTitle>
              <CardDescription>
                Mulai ruang kas baru untuk kost atau kontrakan Anda.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/household/new">
                <Button className="w-full text-xs gap-1.5 bg-emerald-800 hover:bg-emerald-900">
                  <PlusCircle className="h-3.5 w-3.5" />
                  Buat Sekarang
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-stone-200 hover:border-stone-400 transition-colors bg-white">
            <CardHeader className="space-y-1">
              <div className="h-8 w-8 rounded bg-stone-100 text-stone-700 flex items-center justify-center mb-2">
                <UserPlus className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">Gabung via Kode</CardTitle>
              <CardDescription>
                Punya kode undangan dari teman kost Anda? Masukkan di sini.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/household/join">
                <Button variant="outline" className="w-full text-xs gap-1.5 border-stone-300">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Masukkan Kode
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Member has active household: query counts and recent transactions
  const household = activeMembership.household;

  const [transactionCount, memberCount] = await Promise.all([
    prisma.transaction.count({
      where: { householdId: household.id },
    }),
    prisma.householdMember.count({
      where: { householdId: household.id, isActive: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase tracking-wider text-stone-500 font-semibold">
              Rumah Tangga Aktif
            </span>
            <Badge variant="outline" className="text-[11px] font-mono">
              {household.currency}
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold text-stone-900 mt-1">
            {household.name}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Kode Undangan: <span className="font-mono font-medium text-stone-800 select-all">{household.inviteCode}</span> • {memberCount} Anggota
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link href="/transactions/new">
            <Button size="sm" className="bg-emerald-800 hover:bg-emerald-900 text-white gap-1.5 text-xs">
              <PlusCircle className="h-3.5 w-3.5" />
              Catat Pengeluaran
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-stone-200/80 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-medium text-stone-500">
              Posisi Saldo Anda
            </CardDescription>
            <CardTitle className="text-2xl font-mono tabular-nums font-semibold text-stone-900">
              {formatIDR(0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500">
              Semua pengeluaran terhitung seimbang (balanced).
            </p>
          </CardContent>
        </Card>

        <Card className="border-stone-200/80 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-medium text-stone-500">
              Total Transaksi Tercatat
            </CardDescription>
            <CardTitle className="text-2xl font-mono tabular-nums font-semibold text-stone-900">
              {transactionCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500">
              Transaksi tercatat di buku kas kost.
            </p>
          </CardContent>
        </Card>

        <Card className="border-stone-200/80 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-medium text-stone-500">
              Status Settlement
            </CardDescription>
            <CardTitle className="text-2xl font-semibold text-stone-900">
              Lancar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500">
              Tidak ada pelunasan tertunda (pending).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

