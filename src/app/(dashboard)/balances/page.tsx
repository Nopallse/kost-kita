import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getHouseholdBalanceSummary } from "@/lib/balance-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatIDR, formatNetBalance } from "@/lib/utils";
import { SettlementDialog } from "@/components/settlements/settlement-dialog";
import {
  Scale,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  HandCoins,
  AlertTriangle,
  Receipt,
  User,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import Link from "next/link";

export default async function BalancesPage() {
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

  if (!membership) {
    redirect("/dashboard");
  }

  const { household } = membership;

  // Calculate canonical balance summary & simplified debts
  const balanceData = await getHouseholdBalanceSummary(
    household.id,
    session.user.id
  );

  const currentUserPosition = balanceData.enrichedPositions.find(
    (p) => p.isCurrentUser
  );

  const currentMemberOptions = household.members.map((m) => ({
    id: m.id,
    name: m.nickname || m.user.name || m.user.email?.split("@")[0] || "Anggota",
  }));

  const userNetInfo = currentUserPosition
    ? formatNetBalance(currentUserPosition.netBalance)
    : { formatted: formatIDR(0), isPositive: false, isNegative: false, isZero: true };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200/80 pb-4 sm:pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
              Buku Kas & Rekonsiliasi Saldo
            </span>
            {balanceData.report.isReconciled ? (
              <Badge variant="shared" className="text-[10px] gap-1 py-0.2">
                <ShieldCheck className="h-3 w-3 text-emerald-700" />
                Zero-Sum Terverifikasi
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-[10px] gap-1 py-0.2">
                <AlertTriangle className="h-3 w-3" />
                Selisih: {formatIDR(balanceData.report.discrepancy)}
              </Badge>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-stone-900 mt-1">
            Matriks Saldo & Utang
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Rumah Tangga: <span className="font-medium text-stone-800">{household.name}</span> • Berbasis Integer IDR BigInt
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-2.5 w-full sm:w-auto">
          <Link href="/settlements" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs border-stone-300 gap-1.5 bg-white h-9">
              <HandCoins className="h-3.5 w-3.5" />
              Kelola Pelunasan
              {balanceData.pendingSettlementsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                  {balanceData.pendingSettlementsCount}
                </span>
              )}
            </Button>
          </Link>

          <SettlementDialog
            householdId={household.id}
            currentMemberId={membership.id}
            members={currentMemberOptions}
            triggerButtonText="Catat Pelunasan"
          />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Your Position */}
        <Card
          className={`border-stone-200/80 bg-white shadow-sm ${
            userNetInfo.isPositive
              ? "border-emerald-300/80 bg-gradient-to-br from-emerald-50/40 to-white"
              : userNetInfo.isNegative
              ? "border-rose-300/80 bg-gradient-to-br from-rose-50/40 to-white"
              : ""
          }`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs uppercase tracking-wider font-medium text-stone-500">
                Posisi Saldo Bersih Anda
              </CardDescription>
              {userNetInfo.isPositive && (
                <Badge variant="shared" className="text-[10px] gap-1 py-0.2">
                  <ArrowUpRight className="h-2.5 w-2.5 text-emerald-700" />
                  Piutang
                </Badge>
              )}
              {userNetInfo.isNegative && (
                <Badge variant="destructive" className="text-[10px] gap-1 py-0.2 bg-rose-50 text-rose-800 border-rose-200">
                  <ArrowDownLeft className="h-2.5 w-2.5 text-rose-700" />
                  Utang
                </Badge>
              )}
              {userNetInfo.isZero && (
                <Badge variant="secondary" className="text-[10px] gap-1 py-0.2">
                  <CheckCircle2 className="h-2.5 w-2.5 text-stone-600" />
                  Lunas
                </Badge>
              )}
            </div>

            <CardTitle
              className={`text-2xl sm:text-3xl font-mono tabular-nums font-bold tracking-tight ${
                userNetInfo.isPositive
                  ? "text-emerald-800"
                  : userNetInfo.isNegative
                  ? "text-rose-800"
                  : "text-stone-800"
              }`}
            >
              {userNetInfo.formatted}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500 leading-relaxed">
              {userNetInfo.isPositive && "Anda berhak menerima pengembalian dana dari teman kost."}
              {userNetInfo.isNegative && "Anda perlu membayar pelunasan ke teman kost yang menalangi."}
              {userNetInfo.isZero && "Semua pengeluaran Anda saat ini telah seimbang sempurna."}
            </p>
          </CardContent>
        </Card>

        {/* Total Household Expense */}
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
            <p className="text-xs text-stone-500 leading-relaxed">
              Akumulasi seluruh transaksi belanja terkonfirmasi.
            </p>
          </CardContent>
        </Card>

        {/* Simplified Debts / Pelunasan */}
        <Card className="border-stone-200/80 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-medium text-stone-500">
              Kewajiban Pelunasan
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-mono tabular-nums font-semibold text-stone-900">
              {balanceData.simplifiedDebts.length} Rute
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500 leading-relaxed">
              {balanceData.simplifiedDebts.length > 0
                ? "Dapat dilunasi seketika tanpa menunggu konfirmasi."
                : "Semua utang-piutang antar anggota telah lunas."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section 1: Simplified Pairwise Debts ("Who Owes Whom") */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-stone-900 flex items-center gap-2">
            <Scale className="h-4 w-4 text-emerald-800" />
            Penyederhanaan Utang (Siapa Berutang ke Siapa)
          </h2>
          <p className="text-xs text-stone-500">
            Rute transfer paling efisien untuk melunasi seluruh kewajiban anggota kost.
          </p>
        </div>

        {balanceData.simplifiedDebts.length === 0 ? (
          <Card className="border-stone-200/80 bg-white p-6 sm:p-8 text-center shadow-sm">
            <div className="max-w-sm mx-auto space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-700 mx-auto" />
              <h3 className="font-semibold text-stone-900 text-sm">
                Semua Saldo Seimbang
              </h3>
              <p className="text-xs text-stone-500">
                Tidak ada anggota yang memiliki utang atau piutang yang belum terselesaikan.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {balanceData.simplifiedDebts.map((debt, index) => {
              return (
                <Card
                  key={index}
                  className={`border-stone-200/80 bg-white p-4 shadow-sm transition-colors ${
                    debt.isCurrentUserDebtor
                      ? "border-amber-300/80 bg-amber-50/20"
                      : debt.isCurrentUserCreditor
                      ? "border-emerald-300/80 bg-emerald-50/20"
                      : ""
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="font-semibold text-stone-900">
                          {debt.fromMemberName}
                          {debt.isCurrentUserDebtor && (
                            <span className="ml-1 text-[10px] text-rose-700 font-normal">
                              (Anda)
                            </span>
                          )}
                        </span>
                        <ArrowRight className="h-3 w-3 text-stone-400 shrink-0" />
                        <span className="font-semibold text-stone-900">
                          {debt.toMemberName}
                          {debt.isCurrentUserCreditor && (
                            <span className="ml-1 text-[10px] text-emerald-700 font-normal">
                              (Anda)
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        Kewajiban pelunasan yang harus ditransfer
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                      <div className="font-mono text-base font-bold tabular-nums text-stone-900">
                        {formatIDR(debt.amount)}
                      </div>

                      {debt.isCurrentUserDebtor && (
                        <SettlementDialog
                          householdId={household.id}
                          currentMemberId={membership.id}
                          members={currentMemberOptions}
                          prefilledPayeeId={debt.toMemberId}
                          prefilledAmount={Number(debt.amount)}
                          triggerButtonText="Bayar Sekarang"
                        />
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Detailed Member Positions Matrix */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-stone-900 flex items-center gap-2">
            <User className="h-4 w-4 text-stone-700" />
            Rincian Posisi Finansial per Anggota
          </h2>
          <p className="text-xs text-stone-500">
            Rumus: Saldo Bersih = Total Dana Disetor − Total Beban Tanggung Jawab + Pelunasan Terkonfirmasi.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {balanceData.enrichedPositions.map((pos) => {
            const net = formatNetBalance(pos.netBalance);

            return (
              <Card
                key={pos.memberId}
                className={`border-stone-200/80 bg-white shadow-sm overflow-hidden ${
                  pos.isCurrentUser ? "ring-1 ring-stone-900/10 shadow-md" : ""
                }`}
              >
                <CardHeader className="pb-3 border-b border-stone-100 bg-stone-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-stone-900 text-sm">
                        {pos.name}
                      </span>
                      {pos.isCurrentUser && (
                        <Badge variant="outline" className="text-[10px] text-stone-600 bg-white">
                          Anda
                        </Badge>
                      )}
                    </div>

                    {pos.status === "RECEIVABLE" && (
                      <Badge variant="shared" className="text-[10px]">
                        Piutang
                      </Badge>
                    )}
                    {pos.status === "PAYABLE" && (
                      <Badge variant="destructive" className="text-[10px] bg-rose-50 text-rose-800 border-rose-200">
                        Utang
                      </Badge>
                    )}
                    {pos.status === "BALANCED" && (
                      <Badge variant="secondary" className="text-[10px]">
                        Lunas
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-3.5 sm:p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Total Dana Disetor:</span>
                    <span className="font-mono font-medium text-stone-900 tabular-nums">
                      {formatIDR(pos.totalPaid)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-stone-600">
                    <span>Beban Tanggung Jawab:</span>
                    <span className="font-mono font-medium text-stone-900 tabular-nums">
                      {formatIDR(pos.totalResponsibility)}
                    </span>
                  </div>

                  {(pos.settlementsSent > 0n || pos.settlementsReceived > 0n) && (
                    <div className="pt-1 border-t border-stone-100 space-y-1 text-[11px] text-stone-500">
                      {pos.settlementsSent > 0n && (
                        <div className="flex items-center justify-between">
                          <span>Transfer Pelunasan Dikirim:</span>
                          <span className="font-mono text-stone-700">
                            +{formatIDR(pos.settlementsSent)}
                          </span>
                        </div>
                      )}
                      {pos.settlementsReceived > 0n && (
                        <div className="flex items-center justify-between">
                          <span>Transfer Pelunasan Diterima:</span>
                          <span className="font-mono text-stone-700">
                            -{formatIDR(pos.settlementsReceived)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <span className="font-semibold text-stone-800">Saldo Akhir:</span>
                    <span
                      className={`font-mono text-sm font-bold tabular-nums ${
                        net.isPositive
                          ? "text-emerald-800"
                          : net.isNegative
                          ? "text-rose-800"
                          : "text-stone-800"
                      }`}
                    >
                      {net.formatted}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
