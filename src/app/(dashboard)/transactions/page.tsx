import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/utils";
import {
  Receipt,
  PlusCircle,
  Calendar,
  CreditCard,
  Layers,
  ArrowRight,
  Inbox,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { TransactionStatus } from "@prisma/client";

export default async function TransactionsPage() {
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

  // Fetch transactions for the household
  const transactions = await prisma.transaction.findMany({
    where: {
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
        select: {
          id: true,
          name: true,
          quantity: true,
          splitType: true,
          subtotal: true,
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
    orderBy: {
      date: "desc",
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase tracking-wider text-stone-500 font-semibold">
              Buku Kas & Transaksi
            </span>
            <Badge variant="outline" className="text-[11px] font-mono">
              {membership.household.currency}
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold text-stone-900 mt-1">
            Riwayat Transaksi
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Rumah Tangga: <span className="font-medium text-stone-800">{membership.household.name}</span> • {transactions.length} Total Catatan
          </p>
        </div>

        <Link href="/transactions/new">
          <Button size="sm" className="bg-emerald-800 hover:bg-emerald-900 text-white gap-1.5 text-xs">
            <PlusCircle className="h-3.5 w-3.5" />
            Catat Pengeluaran Baru
          </Button>
        </Link>
      </div>

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <Card className="border-stone-200/80 bg-white p-12 text-center shadow-sm">
          <div className="max-w-sm mx-auto space-y-3">
            <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-500">
              <Inbox className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-stone-900">Belum Ada Transaksi</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Belum ada pencatatan pengeluaran atau struk belanja di rumah tangga ini.
              Mulai catat belanjaan bersama Anda sekarang.
            </p>
            <div className="pt-2">
              <Link href="/transactions/new">
                <Button size="sm" className="bg-emerald-800 hover:bg-emerald-900 text-white gap-1.5 text-xs">
                  <PlusCircle className="h-3.5 w-3.5" />
                  Catat Transaksi Pertama
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border-stone-200/80 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50/80 border-b border-stone-200 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Tanggal & Judul</th>
                  <th className="px-5 py-3">Rincian Item</th>
                  <th className="px-5 py-3">Dibayar Oleh</th>
                  <th className="px-5 py-3 text-right">Total Transaksi</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {transactions.map((tx) => {
                  const dateFormatted = new Intl.DateTimeFormat("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(tx.date));

                  const isVoided = tx.status === TransactionStatus.VOIDED;

                  // Payers string
                  const payersStr = tx.payments
                    .map((p) => p.member.nickname || p.member.user.name || "Anggota")
                    .join(", ");

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-stone-50/50 transition-colors ${
                        isVoided ? "opacity-60 bg-stone-50/30" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5">
                          <div className={`font-medium text-stone-900 ${isVoided ? "line-through text-stone-500" : ""}`}>
                            {tx.title}
                          </div>
                          <div className="text-[11px] text-stone-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {dateFormatted}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-1.5">
                          <Badge variant="outline" className="text-[10px] text-stone-600 border-stone-300">
                            {tx.items.length} item
                          </Badge>
                          <span className="text-xs text-stone-500 truncate max-w-[160px]">
                            {tx.items.map((i) => i.name).join(", ")}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-xs text-stone-600">
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="h-3 w-3 text-stone-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{payersStr}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-right font-mono tabular-nums font-semibold text-xs text-stone-900">
                        {isVoided ? (
                          <span className="line-through text-stone-400">
                            {formatIDR(tx.totalAmount)}
                          </span>
                        ) : (
                          formatIDR(tx.totalAmount)
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        {isVoided ? (
                          <Badge variant="destructive" className="text-[10px] gap-1 py-0.2 bg-rose-50 text-rose-800 border-rose-200">
                            <XCircle className="h-2.5 w-2.5" />
                            Dibatalkan
                          </Badge>
                        ) : (
                          <Badge variant="shared" className="text-[10px] gap-1 py-0.2">
                            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-700" />
                            Terkonfirmasi
                          </Badge>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/transactions/${tx.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2.5 text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-100 gap-1"
                          >
                            <span>Rincian</span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

