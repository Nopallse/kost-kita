"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";
import { updateHouseholdAction, regenerateInviteCodeAction, type ActionState } from "@/actions/household";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, KeyRound, Loader2, RefreshCw, Save } from "lucide-react";

interface SettingsFormProps {
  household: {
    id: string;
    name: string;
    currency: string;
    inviteCode: string;
  };
}

export function SettingsForm({ household }: SettingsFormProps) {
  const [updateState, updateFormAction, isUpdatePending] = useActionState<ActionState, FormData>(
    updateHouseholdAction,
    { success: false }
  );

  const [isRegenerating, startRegenerate] = useTransition();
  const [currentCode, setCurrentCode] = React.useState(household.inviteCode);
  const [codeSuccessMsg, setCodeSuccessMsg] = React.useState<string | null>(null);

  const handleRegenerateCode = () => {
    if (confirm("Apakah Anda yakin ingin memperbarui kode undangan? Kode lama tidak akan dapat digunakan lagi.")) {
      startRegenerate(async () => {
        const res = await regenerateInviteCodeAction(household.id);
        if (res.success && res.data?.newInviteCode) {
          setCurrentCode(res.data.newInviteCode);
          setCodeSuccessMsg("Kode undangan baru berhasil dibuat.");
          setTimeout(() => setCodeSuccessMsg(null), 3000);
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Edit Household Details */}
      <Card className="border-stone-200/80 bg-white shadow-sm">
        <form action={updateFormAction}>
          <input type="hidden" name="householdId" value={household.id} />
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-stone-700" />
              Nama & Mata Uang
            </CardTitle>
            <CardDescription>
              Perubahan nama akan langsung terlihat oleh seluruh anggota.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {updateState.error && (
              <div className="p-3 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-md">
                {updateState.error}
              </div>
            )}
            {updateState.success && (
              <div className="p-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
                Informasi rumah tangga berhasil diperbarui.
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Nama Kost / Kontrakan</Label>
              <Input
                id="name"
                name="name"
                defaultValue={household.name}
                required
                disabled={isUpdatePending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currency">Mata Uang</Label>
              <Input
                id="currency"
                name="currency"
                defaultValue={household.currency}
                readOnly
                className="bg-stone-50 font-mono text-stone-600 cursor-not-allowed"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t border-stone-100 pt-5">
            <Button
              type="submit"
              size="sm"
              disabled={isUpdatePending}
              className="bg-stone-900 hover:bg-stone-800 text-white gap-2"
            >
              {isUpdatePending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Regenerate Invite Code */}
      <Card className="border-stone-200/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-stone-700" />
            Kode Undangan Anggota
          </CardTitle>
          <CardDescription>
            Jika ada orang asing yang mengetahui kode lama Anda, buat kode baru di sini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {codeSuccessMsg && (
            <div className="p-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
              {codeSuccessMsg}
            </div>
          )}

          <div className="flex items-center justify-between p-3.5 bg-stone-50 border border-stone-200/80 rounded-md">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
                Kode Aktif Saat Ini
              </p>
              <p className="text-lg font-mono font-semibold tracking-wider text-stone-900">
                {currentCode}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRegenerateCode}
              disabled={isRegenerating}
              className="text-xs border-stone-300 gap-1.5 hover:bg-stone-100"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Membuat...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Buat Ulang Kode
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
