import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getHouseholdBalanceSummary } from "@/lib/balance-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/utils";
import {
  BarChart3,
  Download,
  Receipt,
  CreditCard,
  PieChart,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { TransactionStatus, SplitType } from "@prisma/client";

export default async function ReportsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get active membership
  const membership = await prisma.householdMember.findFirst({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    include: {
      household: true,
    },
  });

  if (!membership) {
    redirect("/dashboard");
  }

  const { household } = membership;

  // 1. Balance Summary
  const balanceData = await getHouseholdBalanceSummary(household.id, session.user.id);

  // 2. Fetch all confirmed items with split types
  const items = await prisma.transactionItem.findMany({
    where: {
      transaction: {
        householdId: household.id,
        status: TransactionStatus.CONFIRMED,
      },
    },
    include: {
      transaction: true,
    },
  });

  const transactionCount = await prisma.transaction.count({
    where: {
      householdId: household.id,
      status: TransactionStatus.CONFIRMED,
    },
  });

  let totalShared = 0n;
  let totalPersonal = 0n;
  let totalCustom = 0n;

  for (const item of items) {
    if (item.splitType === SplitType.SHARED) totalShared += item.subtotal;
    else if (item.splitType === SplitType.PERSONAL) totalPersonal += item.subtotal;
    else if (item.splitType === SplitType.CUSTOM) totalCustom += item.subtotal;
  }

  const totalExpense = totalShared + totalPersonal + totalCustom;
  const avgPerTx = transactionCount > 0 ? totalExpense / BigInt(transactionCount) : 0n;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase tracking-wider text-stone-500 font-semibold">
              Analisis & Ekspor Data
            </span>
            <Badge variant="outline" className="text-[11px] font-mono">
              Buku Kas
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold text-stone-900 mt-1">
            Laporan Finansial Rumah Tangga
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Rumah Tangga: <span className="font-medium text-stone-800">{household.name}</span> • Data komprehensif buku kas
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <a href="/api/export" download>
            <Button size="sm" className="bg-emerald-800 hover:bg-emerald-900 text-white gap-2 text-xs">
              <Download className="h-3.5 w-3.5" />
              Ekspor Buku Kas (.CSV)
            </Button>
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-stone-200/80 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-medium text-stone-500">
              Total Pengeluaran Kas
            </CardDescription>
            <CardTitle className="text-2xl font-mono tabular-nums font-semibold text-stone-900">
              {formatIDR(totalExpense)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-stone-500">
              Dari {transactionCount} transaksi terkonfirmasi
            </p>
          </CardContent>
        </Card>

        <Card className="border-stone-200/80 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-medium text-stone-500">
              Rata-Rata per Transaksi
            </CardDescription>
            <CardTitle className="text-2xl font-mono tabular-nums font-semibold text-stone-900">
              {formatIDR(avgPerTx)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-stone-500">
              Rata-rata nominal setiap kali belanja
            </p>
          </CardContent>
        </Card>

        <Card className="border-stone-200/80 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-medium text-stone-500">
              Total Belanja Bersama
            </CardDescription>
            <CardTitle className="text-2xl font-mono tabular-nums font-semibold text-emerald-800">
              {formatIDR(totalShared)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-stone-500">
              {totalExpense > 0n
                ? `${Math.round(Number((totalShared * 100n) / totalExpense))}% dari seluruh belanjaan`
                : "0%"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-stone-200/80 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-medium text-stone-500">
              Total Item Tercatat
            </CardDescription>
            <CardTitle className="text-2xl font-semibold text-stone-900">
              {items.length} Barang
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-stone-500">
              Item belanja berbutir dalam pembukuan
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown per Member */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kontribusi Setor Kasir */}
        <Card className="border-stone-200/80 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-stone-100">
            <CardTitle className="text-base font-semibold text-stone-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-800" />
              Kontribusi Setoran Kasir (Uang Keluar)
            </CardTitle>
            <CardDescription className="text-xs">
              Anggota yang paling sering menalangi pembayaran di kasir.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {balanceData.enrichedPositions.map((pos) => {
              const pct =
                totalExpense > 0n
                  ? Math.round(Number((pos.totalPaid * 100n) / totalExpense))
                  : 0;

              return (
                <div key={pos.memberId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-stone-900">
                      {pos.name} {pos.isCurrentUser && "(Anda)"}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-stone-800">
                      {formatIDR(pos.totalPaid)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-700 rounded-full transition-all"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Beban Tanggung Jawab */}
        <Card className="border-stone-200/80 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-stone-100">
            <CardTitle className="text-base font-semibold text-stone-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-stone-700" />
              Beban Konsumsi & Tanggung Jawab
            </CardTitle>
            <CardDescription className="text-xs">
              Akumulasi nilai barang dan kebutuhan yang dinikmati setiap anggota.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {balanceData.enrichedPositions.map((pos) => {
              const pct =
                totalExpense > 0n
                  ? Math.round(
                      Number((pos.totalResponsibility * 100n) / totalExpense)
                    )
                  : 0;

              return (
                <div key={pos.memberId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-stone-900">
                      {pos.name} {pos.isCurrentUser && "(Anda)"}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-stone-800">
                      {formatIDR(pos.totalResponsibility)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-stone-700 rounded-full transition-all"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* CSV Export Information Box */}
      <Card className="border-stone-200/80 bg-stone-50/70 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-stone-900 text-sm">
                Pusat Unduhan Laporan Kas (.CSV)
              </h3>
              <p className="text-xs text-stone-600 max-w-xl leading-relaxed">
                Berkas CSV berisi rincian item transaksi, harga satuan, subtotal, tipe pembagian (Shared / Personal / Custom), dan nama penyetor dana. Kompatibel penuh dengan Microsoft Excel, Google Sheets, dan Apple Numbers dengan format UTF-8.
              </p>
            </div>
          </div>

          <a href="/api/export" download className="shrink-0">
            <Button size="sm" className="bg-emerald-800 hover:bg-emerald-900 text-white gap-2 text-xs">
              <Download className="h-3.5 w-3.5" />
              Unduh CSV
            </Button>
          </a>
        </div>
      </Card>
    </div>
  );
}

