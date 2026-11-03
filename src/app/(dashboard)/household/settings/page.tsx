import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { requireHouseholdAdmin } from "@/lib/auth-guard";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, KeyRound, RefreshCw, Save } from "lucide-react";
import Link from "next/link";
import { SettingsForm } from "@/components/household/settings-form";

export default async function HouseholdSettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get active household
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

  // Check admin authorization
  try {
    await requireHouseholdAdmin(membership.householdId);
  } catch {
    redirect("/household");
  }

  const household = membership.household;

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-6">
      <div className="flex items-center space-x-2">
        <Link href="/household" className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Rumah Tangga
        </Link>
      </div>

      <div className="space-y-1">
        <Badge variant="outline" className="text-xs mb-2 border-stone-300">
          Khusus Admin
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          Pengaturan Rumah Tangga
        </h1>
        <p className="text-sm text-stone-600">
          Kelola rincian nama buku kas dan regenerasi kode akses rumah tangga.
        </p>
      </div>

      <SettingsForm household={household} />
    </div>
  );
}
