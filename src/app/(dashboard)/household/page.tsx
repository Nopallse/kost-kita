import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InviteCodeCard } from "@/components/household/invite-code-card";
import { MemberRowActions } from "@/components/household/member-row-actions";
import {
  Users,
  Settings,
  PlusCircle,
  UserPlus,
  Shield,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { Role } from "@prisma/client";

export default async function HouseholdPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get all active memberships for the user
  const memberships = await prisma.householdMember.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    include: {
      household: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: [
              { role: "asc" }, // ADMINs first
              { joinedAt: "asc" },
            ],
          },
        },
      },
    },
  });

  const currentMembership = memberships[0];

  if (!currentMembership) {
    redirect("/dashboard");
  }

  const household = currentMembership.household;
  const isCurrentUserAdmin = currentMembership.role === Role.ADMIN;
  const currentUserId = session.user.id;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase tracking-wider text-stone-500 font-semibold">
              Manajemen Rumah Tangga
            </span>
            <Badge variant="outline" className="text-[11px] font-mono">
              {household.currency}
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold text-stone-900 mt-1">
            {household.name}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Peran Anda:{" "}
            <span className="font-medium text-stone-800">
              {currentMembership.role === Role.ADMIN ? "Admin (Pengelola)" : "Anggota (Member)"}
            </span>
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link href="/household/new">
            <Button variant="outline" size="sm" className="text-xs border-stone-300 gap-1.5">
              <PlusCircle className="h-3.5 w-3.5" />
              Kost Baru
            </Button>
          </Link>
          <Link href="/household/join">
            <Button variant="outline" size="sm" className="text-xs border-stone-300 gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Gabung Kost Lain
            </Button>
          </Link>
          {isCurrentUserAdmin && (
            <Link href="/household/settings">
              <Button size="sm" className="text-xs bg-stone-900 hover:bg-stone-800 text-white gap-1.5">
                <Settings className="h-3.5 w-3.5" />
                Pengaturan
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Invite Code Box */}
      <div className="max-w-xl">
        <InviteCodeCard inviteCode={household.inviteCode} />
      </div>

      {/* Members Directory */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-stone-700" />
            <h2 className="text-base font-semibold text-stone-900">
              Daftar Anggota Rumah Tangga
            </h2>
          </div>
          <span className="text-xs text-stone-500">
            {household.members.filter((m) => m.isActive).length} Anggota Aktif
          </span>
        </div>

        <Card className="border-stone-200/80 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50/80 border-b border-stone-200 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Nama Anggota</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Peran</th>
                  <th className="px-5 py-3">Bergabung</th>
                  <th className="px-5 py-3">Status</th>
                  {isCurrentUserAdmin && (
                    <th className="px-5 py-3 text-right">Aksi Admin</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {household.members.map((member) => {
                  const isYou = member.userId === currentUserId;
                  const joinFormatted = new Intl.DateTimeFormat("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(member.joinedAt));

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-stone-50/50 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-2">
                          <div className="h-7 w-7 rounded-full bg-stone-100 border border-stone-200 text-stone-700 font-medium text-xs flex items-center justify-center">
                            {(member.nickname || member.user.name || "A")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-stone-900 flex items-center gap-1.5">
                              {member.nickname || member.user.name || "Tanpa Nama"}
                              {isYou && (
                                <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded font-normal">
                                  Anda
                                </span>
                              )}
                            </div>
                            {member.nickname && member.user.name && (
                              <div className="text-[11px] text-stone-400">
                                {member.user.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-stone-600 font-mono text-xs">
                        {member.user.email}
                      </td>

                      <td className="px-5 py-3.5">
                        {member.role === Role.ADMIN ? (
                          <Badge variant="shared" className="text-[11px] gap-1 py-0.5">
                            <ShieldCheck className="h-3 w-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="personal" className="text-[11px] py-0.5">
                            Anggota
                          </Badge>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-stone-500 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-stone-400" />
                          {joinFormatted}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        {member.isActive ? (
                          <span className="inline-flex items-center text-xs text-emerald-800 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 mr-1.5" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs text-stone-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-stone-300 mr-1.5" />
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {isCurrentUserAdmin && (
                        <td className="px-5 py-3.5 text-right">
                          <MemberRowActions
                            householdId={household.id}
                            memberId={member.id}
                            currentRole={member.role}
                            isActive={member.isActive}
                            isCurrentUser={isYou}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
