"use client";

import * as React from "react";
import { Role } from "@prisma/client";
import { updateMemberRoleAction, toggleMemberActiveAction } from "@/actions/household";
import { Button } from "@/components/ui/button";
import { Shield, ShieldAlert, UserMinus, UserCheck, Loader2 } from "lucide-react";

interface MemberRowActionsProps {
  householdId: string;
  memberId: string;
  currentRole: Role;
  isActive: boolean;
  isCurrentUser: boolean;
}

export function MemberRowActions({
  householdId,
  memberId,
  currentRole,
  isActive,
  isCurrentUser,
}: MemberRowActionsProps) {
  const [isPending, startTransition] = React.useTransition();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleRoleToggle = () => {
    const nextRole = currentRole === Role.ADMIN ? Role.MEMBER : Role.ADMIN;
    setErrorMsg(null);
    startTransition(async () => {
      const res = await updateMemberRoleAction(householdId, memberId, nextRole);
      if (!res.success) {
        setErrorMsg(res.error || "Gagal mengubah peran");
      }
    });
  };

  const handleStatusToggle = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await toggleMemberActiveAction(householdId, memberId, !isActive);
      if (!res.success) {
        setErrorMsg(res.error || "Gagal mengubah status");
      }
    });
  };

  return (
    <div className="flex flex-col items-end space-y-1">
      <div className="flex items-center space-x-1.5">
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={handleRoleToggle}
          className="h-7 px-2 text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-100 gap-1"
          title={currentRole === Role.ADMIN ? "Ubah jadi Anggota Biasa" : "Jadikan Admin"}
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : currentRole === Role.ADMIN ? (
            <>
              <ShieldAlert className="h-3 w-3 text-amber-700" />
              <span>Jadikan Member</span>
            </>
          ) : (
            <>
              <Shield className="h-3 w-3 text-emerald-700" />
              <span>Jadikan Admin</span>
            </>
          )}
        </Button>

        {!isCurrentUser && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={handleStatusToggle}
            className="h-7 px-2 text-xs text-stone-500 hover:text-stone-900 hover:bg-stone-100 gap-1"
            title={isActive ? "Nonaktifkan Anggota" : "Aktifkan Kembali"}
          >
            {isActive ? (
              <>
                <UserMinus className="h-3 w-3 text-stone-400" />
                <span>Nonaktifkan</span>
              </>
            ) : (
              <>
                <UserCheck className="h-3 w-3 text-emerald-700" />
                <span>Aktifkan</span>
              </>
            )}
          </Button>
        )}
      </div>

      {errorMsg && (
        <span className="text-[11px] text-rose-700 font-medium">
          {errorMsg}
        </span>
      )}
    </div>
  );
}

