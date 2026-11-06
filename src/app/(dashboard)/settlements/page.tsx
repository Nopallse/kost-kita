import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils";
import { SettlementDialog } from "@/components/settlements/settlement-dialog";
import { SettlementActionButtons } from "@/components/settlements/settlement-action-buttons";
import {
  HandCoins,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Calendar,
  User,
} from "lucide-react";
import Link from "next/link";
import { SettlementStatus } from "@prisma/client";

export default async function SettlementsPage() {
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

  // Query settlements: pending first, then confirmed/rejected
  const [pendingSettlements, historySettlements] = await Promise.all([
    prisma.settlement.findMany({
      where: {
        householdId: household.id,
        status: SettlementStatus.PENDING,
      },
      include: {
        payerMember: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        payeeMember: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.settlement.findMany({
      where: {
        householdId: household.id,
        status: { in: [SettlementStatus.CONFIRMED, SettlementStatus.REJECTED] },
      },
      include: {
        payerMember: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        payeeMember: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

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
              Reimbursement & Pelunasan
            </span>
            <Badge variant="outline" className="text-[10px] font-mono">
              Idempoten
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-stone-900 mt-1">
            Klaim & Konfirmasi Pelunasan
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Hanya transfer yang berstatus <span className="font-semibold text-emerald-800">Terkonfirmasi</span> yang memengaruhi saldo buku kas.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-2.5 w-full sm:w-auto">
          <Link href="/balances" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs border-stone-300 bg-white h-9">
              Lihat Matriks Saldo
            </Button>
          </Link>

          <SettlementDialog
            householdId={household.id}
            currentMemberId={membership.id}
            members={memberOptions}
            triggerButtonText="Catat Transfer Pelunasan"
          />
        </div>
      </div>

      {/* 1. Pending Settlements Section */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-stone-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-700" />
            Menunggu Konfirmasi Penerima ({pendingSettlements.length})
          </h2>
          <p className="text-xs text-stone-500">
            Transfer yang sudah diklaim oleh pengirim, menunggu penerima memvalidasi masuknya dana.
          </p>
        </div>

        {pendingSettlements.length === 0 ? (
          <Card className="border-stone-200/80 bg-white p-6 sm:p-8 text-center shadow-sm">
            <div className="max-w-sm mx-auto space-y-1.5">
              <CheckCircle2 className="h-6 w-6 text-emerald-700 mx-auto" />
              <p className="text-xs text-stone-600 font-medium">
                Tidak ada klaim transfer yang sedang tertunda.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingSettlements.map((s) => {
              const payerName = s.payerMember.nickname || s.payerMember.user.name || "Anggota";
              const payeeName = s.payeeMember.nickname || s.payeeMember.user.name || "Anggota";
              const isUserPayee = s.payeeMemberId === membership.id;
              const isUserPayer = s.payerMemberId === membership.id;
              const dateStr = new Intl.DateTimeFormat("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(s.createdAt));

              return (
                <Card
                  key={s.id}
                  className={`border-stone-200/80 bg-white p-4 shadow-sm transition-all ${
                    isUserPayee ? "border-amber-400/80 ring-1 ring-amber-400/30 bg-amber-50/10" : ""
                  }`}
                >
                  <div className="flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="font-semibold text-stone-900">
                          {payerName} {isUserPayer && <span className="text-[10px] text-stone-500 font-normal">(Anda)</span>}
                        </span>
                        <ArrowRight className="h-3 w-3 text-stone-400 shrink-0" />
                        <span className="font-semibold text-stone-900">
                          {payeeName} {isUserPayee && <span className="text-[10px] text-emerald-700 font-normal">(Anda)</span>}
                        </span>
                      </div>

                      <div className="font-mono text-lg font-bold tabular-nums text-stone-900">
                        {formatIDR(s.amount)}
                      </div>

                      {s.notes && (
                        <p className="text-xs text-stone-600 bg-stone-50 p-2 rounded border border-stone-100 italic">
                          "{s.notes}"
                        </p>
                      )}

                      <div className="text-[10px] text-stone-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {dateStr}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                      {isUserPayee ? (
                        <SettlementActionButtons
                          householdId={household.id}
                          settlementId={s.id}
                          amountFormatted={formatIDR(s.amount)}
                          payerName={payerName}
                        />
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-800 bg-amber-50 border-amber-200 py-1">
                          Menunggu konfirmasi {payeeName}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Settlement History Section */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-stone-900 flex items-center gap-2">
            <HandCoins className="h-4 w-4 text-stone-700" />
            Riwayat Pelunasan Selesai
          </h2>
          <p className="text-xs text-stone-500">
            Daftar transfer pelunasan yang telah dikonfirmasi atau ditolak.
          </p>
        </div>

        {historySettlements.length === 0 ? (
          <Card className="border-stone-200/80 bg-white p-6 sm:p-8 text-center shadow-sm">
            <p className="text-xs text-stone-500">
              Belum ada riwayat pelunasan selesai.
            </p>
          </Card>
        ) : (
          <>
            {/* MOBILE VIEW (< sm): Settlement History Cards */}
            <div className="block sm:hidden space-y-2.5">
              {historySettlements.map((s) => {
                const payerName = s.payerMember.nickname || s.payerMember.user.name || "Anggota";
                const payeeName = s.payeeMember.nickname || s.payeeMember.user.name || "Anggota";
                const isConfirmed = s.status === SettlementStatus.CONFIRMED;

                const dateFormatted = new Intl.DateTimeFormat("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(new Date(s.confirmedAt || s.createdAt));

                return (
                  <Card key={s.id} className="border-stone-200/80 bg-white p-3.5 shadow-sm space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5 text-xs">
                          <span className="font-semibold text-stone-900">{payerName}</span>
                          <ArrowRight className="h-3 w-3 text-stone-400 shrink-0" />
                          <span className="font-semibold text-stone-900">{payeeName}</span>
                        </div>
                        <div className="text-[10px] text-stone-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {dateFormatted}
                        </div>
                      </div>

                      {isConfirmed ? (
                        <Badge variant="shared" className="text-[10px] gap-1 py-0.2 shrink-0">
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-700" />
                          Terkonfirmasi
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] gap-1 py-0.2 bg-rose-50 text-rose-800 border-rose-200 shrink-0">
                          <XCircle className="h-2.5 w-2.5" />
                          Ditolak
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-xs">
                      <span className="text-[11px] text-stone-400 truncate max-w-[170px]">
                        {s.notes || "Tanpa catatan"}
                      </span>
                      <span className="font-mono font-bold text-stone-900 tabular-nums">
                        {formatIDR(s.amount)}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* DESKTOP VIEW (>= sm): History Table */}
            <Card className="hidden sm:block border-stone-200/80 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50/80 border-b border-stone-200 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3">Tanggal</th>
                      <th className="px-5 py-3">Pengirim (Debitur)</th>
                      <th className="px-5 py-3">Penerima (Kreditur)</th>
                      <th className="px-5 py-3 text-right">Nominal</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {historySettlements.map((s) => {
                      const payerName = s.payerMember.nickname || s.payerMember.user.name || "Anggota";
                      const payeeName = s.payeeMember.nickname || s.payeeMember.user.name || "Anggota";
                      const isConfirmed = s.status === SettlementStatus.CONFIRMED;

                      const dateFormatted = new Intl.DateTimeFormat("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(s.confirmedAt || s.createdAt));

                      return (
                        <tr key={s.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="px-5 py-3 text-xs text-stone-500 font-mono">
                            {dateFormatted}
                          </td>

                          <td className="px-5 py-3 text-xs font-medium text-stone-900">
                            {payerName}
                          </td>

                          <td className="px-5 py-3 text-xs font-medium text-stone-900">
                            {payeeName}
                          </td>

                          <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold text-xs text-stone-900">
                            {formatIDR(s.amount)}
                          </td>

                          <td className="px-5 py-3">
                            {isConfirmed ? (
                              <Badge variant="shared" className="text-[10px] gap-1 py-0.2">
                                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-700" />
                                Terkonfirmasi
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px] gap-1 py-0.2 bg-rose-50 text-rose-800 border-rose-200">
                                <XCircle className="h-2.5 w-2.5" />
                                Ditolak
                              </Badge>
                            )}
                          </td>

                          <td className="px-5 py-3 text-xs text-stone-500 max-w-[200px] truncate">
                            {s.notes || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
