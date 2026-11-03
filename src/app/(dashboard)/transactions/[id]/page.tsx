import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils";
import { VoidTransactionButton } from "@/components/transactions/void-transaction-button";
import {
  ArrowLeft,
  Receipt,
  CreditCard,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  FileText,
  History,
} from "lucide-react";
import Link from "next/link";
import { TransactionStatus } from "@prisma/client";

interface TransactionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TransactionDetailPage({
  params,
}: TransactionDetailPageProps) {
  const { id } = await params;
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
  });

  if (!membership) {
    redirect("/dashboard");
  }

  // Fetch transaction with full relations
  const tx = await prisma.transaction.findFirst({
    where: {
      id,
      householdId: membership.householdId,
    },
    include: {
      creator: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
      items: {
        include: {
          allocations: {
            include: {
              member: {
                include: {
                  user: {
                    select: { name: true, email: true },
                  },
                },
              },
            },
          },
        },
      },
      payments: {
        include: {
          member: {
            include: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
        },
      },
    },
  });

  if (!tx) {
    notFound();
  }

  // Fetch audit logs for this transaction
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      householdId: membership.householdId,
      entityType: "TRANSACTION",
      entityId: tx.id,
    },
    orderBy: { createdAt: "desc" },
  });

  const dateFormatted = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
  }).format(new Date(tx.date));

  const isVoided = tx.status === TransactionStatus.VOIDED;

  // Aggregate total responsibility per member across all items
  const memberResponsibilityMap = new Map<string, { name: string; amount: bigint }>();

  for (const item of tx.items) {
    for (const alloc of item.allocations) {
      const mId = alloc.memberId;
      const mName = alloc.member.nickname || alloc.member.user.name || "Anggota";
      const existing = memberResponsibilityMap.get(mId) || { name: mName, amount: 0n };
      existing.amount += alloc.amount;
      memberResponsibilityMap.set(mId, existing);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      {/* Navigation */}
      <div className="flex items-center space-x-2">
        <Link
          href="/transactions"
          className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Daftar Transaksi
        </Link>
      </div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            {isVoided ? (
              <Badge variant="destructive" className="text-xs gap-1 py-0.5 bg-rose-50 text-rose-800 border-rose-200">
                <XCircle className="h-3 w-3" />
                Dibatalkan (Voided)
              </Badge>
            ) : (
              <Badge variant="shared" className="text-xs gap-1 py-0.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                Terkonfirmasi (Aktif)
              </Badge>
            )}
            <span className="text-xs text-stone-400">•</span>
            <span className="text-xs text-stone-500 font-mono">
              ID: {tx.id.slice(-8)}
            </span>
          </div>

          <h1 className={`text-2xl font-semibold text-stone-900 mt-1.5 ${isVoided ? "line-through text-stone-400" : ""}`}>
            {tx.title}
          </h1>

          <p className="text-xs text-stone-500 mt-1 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-stone-400" />
              {dateFormatted}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <User className="h-3 w-3 text-stone-400" />
              Dicatat oleh {tx.creator.nickname || tx.creator.user.name}
            </span>
          </p>
        </div>

        {/* Void Button */}
        {!isVoided && (
          <VoidTransactionButton
            householdId={membership.householdId}
            transactionId={tx.id}
            transactionTitle={tx.title}
          />
        )}
      </div>

      {/* Notes if any */}
      {tx.notes && (
        <div className="p-3.5 bg-stone-50 border border-stone-200/80 rounded-md text-xs text-stone-600 flex items-start gap-2">
          <FileText className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-stone-700">Catatan:</span> {tx.notes}
          </div>
        </div>
      )}

      {/* Top Split: Payment vs Responsibility Aggregation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Payments Side */}
        <Card className="border-stone-200/80 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-stone-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-800" />
              Dana Disetor di Kasir
            </CardTitle>
            <CardDescription className="text-xs">
              Uang tunai atau transfer QRIS yang dibayarkan saat transaksi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {tx.payments.map((p) => {
              const payerName = p.member.nickname || p.member.user.name || "Anggota";
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 bg-stone-50 border border-stone-200/70 rounded-md text-xs"
                >
                  <span className="font-medium text-stone-800">{payerName}</span>
                  <span className="font-mono font-semibold tabular-nums text-stone-900">
                    {formatIDR(p.amount)}
                  </span>
                </div>
              );
            })}
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs font-semibold">
              <span className="text-stone-600">Total Pembayaran:</span>
              <span className="font-mono text-stone-900 tabular-nums">
                {formatIDR(tx.totalAmount)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Responsibility Side */}
        <Card className="border-stone-200/80 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-stone-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-stone-700" />
              Tanggung Jawab Finansial
            </CardTitle>
            <CardDescription className="text-xs">
              Beban pengeluaran yang menjadi tanggung jawab masing-masing anggota.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from(memberResponsibilityMap.entries()).map(([mId, data]) => {
              return (
                <div
                  key={mId}
                  className="flex items-center justify-between p-2.5 bg-stone-50 border border-stone-200/70 rounded-md text-xs"
                >
                  <span className="font-medium text-stone-800">{data.name}</span>
                  <span className="font-mono font-semibold tabular-nums text-stone-900">
                    {formatIDR(data.amount)}
                  </span>
                </div>
              );
            })}
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs font-semibold">
              <span className="text-stone-600">Total Tanggung Jawab:</span>
              <span className="font-mono text-stone-900 tabular-nums">
                {formatIDR(tx.totalAmount)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Itemized Line Items Breakdown */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">
          Rincian Item Belanja ({tx.items.length} Barang)
        </h2>

        <Card className="border-stone-200/80 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50/80 border-b border-stone-200 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Nama Barang</th>
                  <th className="px-5 py-3">Kuantitas</th>
                  <th className="px-5 py-3 text-right">Harga Satuan</th>
                  <th className="px-5 py-3 text-right">Subtotal</th>
                  <th className="px-5 py-3">Tipe Alokasi</th>
                  <th className="px-5 py-3">Rincian Pembagian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {tx.items.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-stone-900">
                        {item.name}
                      </td>

                      <td className="px-5 py-3.5 text-xs text-stone-600 font-mono">
                        {item.quantity}x
                      </td>

                      <td className="px-5 py-3.5 text-xs font-mono text-stone-600 text-right">
                        {formatIDR(item.unitPrice)}
                      </td>

                      <td className="px-5 py-3.5 text-xs font-mono font-semibold text-stone-900 text-right">
                        {formatIDR(item.subtotal)}
                      </td>

                      <td className="px-5 py-3.5">
                        {item.splitType === "SHARED" && (
                          <Badge variant="shared" className="text-[10px]">
                            Shared
                          </Badge>
                        )}
                        {item.splitType === "PERSONAL" && (
                          <Badge variant="personal" className="text-[10px]">
                            Personal
                          </Badge>
                        )}
                        {item.splitType === "CUSTOM" && (
                          <Badge variant="custom" className="text-[10px]">
                            Kustom
                          </Badge>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-xs text-stone-600">
                        <div className="flex flex-wrap gap-1.5">
                          {item.allocations.map((alloc) => {
                            const name =
                              alloc.member.nickname || alloc.member.user.name || "Anggota";
                            return (
                              <span
                                key={alloc.id}
                                className="inline-flex items-center gap-1 bg-stone-100 border border-stone-200/80 px-2 py-0.5 rounded text-[11px]"
                              >
                                <span className="font-medium text-stone-800">{name}:</span>
                                <span className="font-mono text-stone-700">
                                  {formatIDR(alloc.amount)}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Audit Trail Log */}
      {auditLogs.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-stone-200">
          <div className="flex items-center space-x-2 text-stone-600">
            <History className="h-4 w-4" />
            <h3 className="text-sm font-semibold text-stone-900">
              Riwayat Audit Finansial
            </h3>
          </div>

          <div className="space-y-2">
            {auditLogs.map((log) => {
              const logDate = new Intl.DateTimeFormat("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(log.createdAt));

              return (
                <div
                  key={log.id}
                  className="p-3 bg-stone-50/70 border border-stone-200/60 rounded-md text-xs flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {log.action}
                    </Badge>
                    <span className="text-stone-700">
                      Tindakan dicatat dalam buku kas
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-400 font-mono">
                    {logDate}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
