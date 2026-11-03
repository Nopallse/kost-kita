import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewTransactionPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get active household membership
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
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!membership) {
    redirect("/household/new");
  }

  const members = membership.household.members.map((m) => ({
    id: m.id,
    name: m.nickname || m.user.name || m.user.email?.split("@")[0] || "Anggota",
  }));

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      <div className="flex items-center space-x-2">
        <Link
          href="/transactions"
          className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Daftar Transaksi
        </Link>
      </div>

      <div className="space-y-1">
        <Badge variant="shared" className="text-xs mb-2">
          Pencatatan Struk Belanja
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          Catat Pengeluaran Baru
        </h1>
        <p className="text-sm text-stone-600">
          Rumah Tangga: <span className="font-medium text-stone-900">{membership.household.name}</span>. Masukkan item belanja dan alokasikan secara akurat.
        </p>
      </div>

      <TransactionForm
        householdId={membership.householdId}
        currentMemberId={membership.id}
        members={members}
      />
    </div>
  );
}
