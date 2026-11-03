import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
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
    return new NextResponse("No active household found", { status: 404 });
  }

  const { household } = membership;

  // Query transactions with items and payments
  const transactions = await prisma.transaction.findMany({
    where: {
      householdId: household.id,
    },
    include: {
      category: true,
      items: true,
      payments: {
        include: {
          member: {
            include: {
              user: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
    orderBy: { date: "desc" },
  });

  // Build CSV content
  const headers = [
    "ID Transaksi",
    "Tanggal",
    "Judul Transaksi",
    "Kategori",
    "Nama Barang",
    "Qty",
    "Harga Satuan (IDR)",
    "Subtotal (IDR)",
    "Tipe Split",
    "Penyetor Dana Kasir",
    "Status Transaksi",
  ];

  const escapeCSV = (val: unknown) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows: string[] = [headers.join(",")];

  for (const tx of transactions) {
    const txDate = new Date(tx.date).toISOString().split("T")[0];
    const categoryName = tx.category?.name || "Umum";
    const payersStr = tx.payments
      .map(
        (p) =>
          `${p.member.nickname || p.member.user.name} (${p.amount.toString()})`
      )
      .join("; ");

    for (const item of tx.items) {
      const row = [
        escapeCSV(tx.id),
        escapeCSV(txDate),
        escapeCSV(tx.title),
        escapeCSV(categoryName),
        escapeCSV(item.name),
        escapeCSV(item.quantity),
        escapeCSV(item.unitPrice.toString()),
        escapeCSV(item.subtotal.toString()),
        escapeCSV(item.splitType),
        escapeCSV(payersStr),
        escapeCSV(tx.status),
      ];
      rows.push(row.join(","));
    }
  }

  const csvOutput = "\uFEFF" + rows.join("\r\n"); // UTF-8 BOM for Excel compatibility

  const fileName = `kostkita-${household.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`;

  return new NextResponse(csvOutput, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
