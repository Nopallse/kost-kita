import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatIDR, formatNetBalance } from "@/lib/utils";
import { getHouseholdBalanceSummary } from "@/lib/balance-service";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { SharedVsPersonalChart } from "@/components/dashboard/shared-vs-personal-chart";
import { SettlementDialog } from "@/components/settlements/settlement-dialog";
import {
  PlusCircle,
  UserPlus,
  Home,
  Scale,
  Receipt,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  BarChart3,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { TransactionStatus, SplitType } from "@prisma/client";

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
      household: {
        include: {
          members: {
            where: { isActive: true },
            include: {
              user: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
  });

  const activeMembership = memberships[0];

  if (!activeMembership) {
    return (
      <div className="max-w-xl mx-auto py-8 sm:py-12 space-y-6 px-2">
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
              <Link href="/household/new" className="block">
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
              <Link href="/household/join" className="block">
                <Button variant="outline" className="w-full text-xs gap-1.5 border-stone-300">
                  <ArrowRight className="h-3.5 w-3.5" />
                  Masukkan Kode
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { household } = activeMembership;

  // 1. Fetch balance data
  const balanceData = await getHouseholdBalanceSummary(
    household.id,
    session.user.id
  );

  const currentUserPosition = balanceData.enrichedPositions.find(
    (p) => p.isCurrentUser
  );

  const userNet = currentUserPosition
    ? formatNetBalance(currentUserPosition.netBalance)
    : { formatted: formatIDR(0), isPositive: false, isNegative: false, isZero: true };

  // 2. Fetch Recent Transactions & Split Proportions
  const recentTransactions = await prisma.transaction.findMany({
    where: {
      householdId: household.id,
    },
    include: {
      creator: {
        include: { user: { select: { name: true } } },
      },
      items: true,
      payments: {
        include: {
          member: {
            include: { user: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { date: "desc" },
    take: 5,
  });

  // Calculate Proportion of Shared vs Personal vs Custom
  const allItems = await prisma.transactionItem.findMany({
    where: {
      transaction: {
        householdId: household.id,
        status: TransactionStatus.CONFIRMED,
      },
    },
    select: {
      splitType: true,
      subtotal: true,
    },
  });

  let sharedTotal = 0;
  let personalTotal = 0;
  let customTotal = 0;

  for (const item of allItems) {
    const amt = Number(item.subtotal);
    if (item.splitType === SplitType.SHARED) sharedTotal += amt;
    else if (item.splitType === SplitType.PERSONAL) personalTotal += amt;
    else if (item.splitType === SplitType.CUSTOM) customTotal += amt;
  }

  // Monthly Spending Trend Data for Chart
  const spendingTrendData = recentTransactions
    .filter((tx) => tx.status === TransactionStatus.CONFIRMED)
    .slice(0, 6)
    .reverse()
    .map((tx) => ({
      date: new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
      }).format(new Date(tx.date)),
      amount: Number(tx.totalAmount),
    }));

  const memberOptions = household.members.map((m) => ({
    id: m.id,
    name: m.nickname || m.user.name || m.user.email?.split("@")[0] || "Anggota",
  }));

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200/80 pb-4 sm:pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
              Ikhtisar Rumah Tangga
            </span>
            <Badge variant="outline" className="text-[10px] font-mono">
              {household.currency}
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-stone-900 mt-1">
            {household.name}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Kode Undangan: <span className="font-mono font-medium text-stone-800 select-all">{household.inviteCode}</span> • {household.members.length} Anggota
          </p>
        </div>

        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          <Link href="/transactions/new" className="w-full sm:w-auto">
            <Button size="sm" className="w-full sm:w-auto bg-emerald-800 hover:bg-emerald-900 text-white gap-1.5 text-xs h-9">
              <PlusCircle className="h-3.5 w-3.5" />
              Catat Pengeluaran
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Primary KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Your Net Position (Hero Card on mobile) */}
        <Card
          className={`border-stone-200/80 bg-white shadow-sm transition-all sm:col-span-2 lg:col-span-1 ${
            userNet.isPositive
              ? "border-emerald-300/80 bg-gradient-to-br from-emerald-50/40 to-white"
              : userNet.isNegative
              ? "border-rose-300/80 bg-gradient-to-br from-rose-50/40 to-white"
              : ""
          }`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs uppercase tracking-wider font-medium text-stone-500">
                Posisi Saldo Anda
              </CardDescription>
              {userNet.isPositive && (
                <Badge variant="shared" className="text-[10px] gap-1 py-0.2">
                  <ArrowUpRight className="h-2.5 w-2.5 text-emerald-700" />
                  Piutang
                </Badge>
              )}
              {userNet.isNegative && (
                <Badge variant="destructive" className="text-[10px] gap-1 py-0.2 bg-rose-50 text-rose-800 border-rose-200">
                  <ArrowDownLeft className="h-2.5 w-2.5 text-rose-700" />
                  Utang
                </Badge>
              )}
              {userNet.isZero && (
                <Badge variant="secondary" className="text-[10px] gap-1 py-0.2">
                  <CheckCircle2 className="h-2.5 w-2.5 text-stone-600" />
                  Lunas
                </Badge>
              )}
            </div>

            <CardTitle
              className={`text-2xl sm:text-3xl font-mono tabular-nums font-bold tracking-tight ${
                userNet.isPositive
                  ? "text-emerald-800"
                  : userNet.isNegative
                  ? "text-rose-800"
                  : "text-stone-800"
              }`}
            >
              {userNet.formatted}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-stone-500 leading-relaxed">
              {userNet.isPositive && "Teman kost berutang ke Anda (berhak menerima transfer)."}
              {userNet.isNegative && "Anda perlu mentransfer pelunasan ke teman kost yang menalangi."}
              {userNet.isZero && "Semua pengeluaran Anda saat ini seimbang sempurna."}
            </p>

            {userNet.isNegative && (
              <div className="pt-1">
                <Link href="/balances" className="inline-flex items-center text-xs text-rose-800 font-semibold hover:underline gap-1">
                  <span>Lihat siapa yang harus dibayar</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Expense */}
        <Card className="border-stone-200/80 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-medium text-stone-500">
              Total Pengeluaran Kas
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-mono tabular-nums font-semibold text-stone-900">
              {formatIDR(balanceData.report.totalHouseholdExpense)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-stone-500">
              Akumulasi belanja seluruh anggota kost
            </p>
          </CardContent>
        </Card>

        {/* Shared vs Personal */}
        <Card className="border-stone-200/80 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-medium text-stone-500">
              Belanja Bersama (Patungan)
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-mono tabular-nums font-semibold text-emerald-800">
              {formatIDR(sharedTotal)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-stone-500">
              Pribadi: {formatIDR(personalTotal)}
            </p>
          </CardContent>
        </Card>

        {/* Rute Pelunasan Utang */}
        <Card className="border-stone-200/80 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-medium text-stone-500">
              Rute Pelunasan Utang
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-mono tabular-nums font-semibold text-stone-900">
              {balanceData.simplifiedDebts.length} Rute
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/balances"
              className="text-[11px] text-emerald-800 font-medium hover:underline flex items-center gap-1"
            >
              Bayar langsung di sini
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left: Spending Trend Chart */}
        <Card className="lg:col-span-2 border-stone-200/80 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold text-stone-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-800" />
                Tren Pengeluaran Transaksi Terbaru
              </CardTitle>
              <CardDescription className="text-xs">
                Nominal transaksi terkonfirmasi per tanggal belanja.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2 sm:pt-4">
            <SpendingChart data={spendingTrendData} />
          </CardContent>
        </Card>

        {/* Right: Shared vs Personal Proportion */}
        <Card className="border-stone-200/80 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base font-semibold text-stone-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-stone-700" />
              Proporsi Pengeluaran
            </CardTitle>
            <CardDescription className="text-xs">
              Perbandingan tipe alokasi belanja.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 sm:pt-4">
            <SharedVsPersonalChart
              sharedAmount={sharedTotal}
              personalAmount={personalTotal}
              customAmount={customTotal}
            />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Debt Simplification & Recent Transactions Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Simplified Debts Box */}
        <Card className="border-stone-200/80 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-stone-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                <Scale className="h-4 w-4 text-emerald-800" />
                Siapa Berutang ke Siapa
              </CardTitle>
              <CardDescription className="text-xs">
                Instruksi transfer tercepat untuk menyeimbangkan kas.
              </CardDescription>
            </div>
            <Link href="/balances">
              <Button variant="ghost" size="sm" className="text-xs text-stone-600 hover:text-stone-900 h-8 px-2">
                Selengkapnya
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 space-y-2.5">
            {balanceData.simplifiedDebts.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500 space-y-1">
                <ShieldCheck className="h-6 w-6 text-emerald-700 mx-auto" />
                <p>Semua saldo anggota telah seimbang sempurna.</p>
              </div>
            ) : (
              balanceData.simplifiedDebts.slice(0, 4).map((debt, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                    debt.isCurrentUserDebtor
                      ? "bg-amber-50/40 border-amber-200"
                      : "bg-stone-50/70 border-stone-200/70"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-stone-900">
                      {debt.fromMemberName}
                      {debt.isCurrentUserDebtor && " (Anda)"}
                    </span>
                    <ArrowRight className="h-3 w-3 text-stone-400 shrink-0" />
                    <span className="font-semibold text-stone-900">
                      {debt.toMemberName}
                      {debt.isCurrentUserCreditor && " (Anda)"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-200/50">
                    <span className="font-mono font-bold text-sm text-stone-900 tabular-nums">
                      {formatIDR(debt.amount)}
                    </span>

                    {debt.isCurrentUserDebtor && (
                      <SettlementDialog
                        householdId={household.id}
                        currentMemberId={activeMembership.id}
                        members={memberOptions}
                        prefilledPayeeId={debt.toMemberId}
                        prefilledAmount={Number(debt.amount)}
                        triggerButtonText="Bayar"
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions Feed */}
        <Card className="border-stone-200/80 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-stone-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-stone-700" />
                Transaksi Belanja Terbaru
              </CardTitle>
              <CardDescription className="text-xs">
                5 catatan pengeluaran terakhir di buku kas.
              </CardDescription>
            </div>
            <Link href="/transactions">
              <Button variant="ghost" size="sm" className="text-xs text-stone-600 hover:text-stone-900 h-8 px-2">
                Semua
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 space-y-2">
            {recentTransactions.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500">
                Belum ada transaksi tercatat.
              </div>
            ) : (
              recentTransactions.map((tx) => {
                const dateStr = new Intl.DateTimeFormat("id-ID", {
                  day: "numeric",
                  month: "short",
                }).format(new Date(tx.date));
                const isVoided = tx.status === TransactionStatus.VOIDED;

                return (
                  <Link
                    key={tx.id}
                    href={`/transactions/${tx.id}`}
                    className="block p-3 bg-stone-50/70 border border-stone-200/70 rounded-lg hover:bg-stone-100/70 transition-colors active:bg-stone-100"
                  >
                    <div className="flex items-center justify-between text-xs gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div
                          className={`font-semibold text-stone-900 truncate ${
                            isVoided ? "line-through text-stone-400" : ""
                          }`}
                        >
                          {tx.title}
                        </div>
                        <div className="text-[11px] text-stone-400 truncate">
                          {dateStr} • {tx.items.length} item • oleh{" "}
                          {tx.creator.nickname || tx.creator.user.name}
                        </div>
                      </div>

                      <div className="text-right space-y-0.5 shrink-0 flex items-center gap-1.5">
                        <div>
                          <div
                            className={`font-mono font-semibold tabular-nums ${
                              isVoided ? "line-through text-stone-400" : "text-stone-900"
                            }`}
                          >
                            {formatIDR(tx.totalAmount)}
                          </div>
                          {isVoided && (
                            <Badge variant="destructive" className="text-[9px] py-0">
                              Dibatalkan
                            </Badge>
                          )}
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
