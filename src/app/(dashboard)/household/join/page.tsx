"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { joinHouseholdAction, type ActionState } from "@/actions/household";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, KeyRound, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";

export default function JoinHouseholdPage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ActionState<{ householdId: string }>, FormData>(
    joinHouseholdAction,
    { success: false }
  );

  React.useEffect(() => {
    if (state.success && state.data?.householdId) {
      router.push("/dashboard");
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <div className="flex items-center space-x-2">
        <Link href="/dashboard" className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Dashboard
        </Link>
      </div>

      <div className="space-y-1">
        <Badge variant="outline" className="text-xs mb-2 border-stone-300">
          Undangan Anggota
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          Gabung ke Rumah Tangga / Kost
        </h1>
        <p className="text-sm text-stone-600">
          Masukkan kode undangan yang diberikan oleh teman kost atau pengelola rumah Anda.
        </p>
      </div>

      <Card className="border-stone-200/80 bg-white shadow-sm">
        <form action={formAction}>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-stone-700" />
              Kode Undangan
            </CardTitle>
            <CardDescription>
              Kode biasanya terdiri dari 8–10 karakter huruf dan angka.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {state.error && (
              <div className="p-3 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-md">
                {state.error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="inviteCode">Kode Undangan</Label>
              <Input
                id="inviteCode"
                name="inviteCode"
                placeholder="CONTOH: 7K8M9QZX"
                required
                disabled={isPending}
                className="font-mono uppercase tracking-wider text-base"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nickname">Nama Panggilan Anda di Kost</Label>
              <Input
                id="nickname"
                name="nickname"
                placeholder="Contoh: Budi (Kamar 5)"
                disabled={isPending}
              />
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-stone-100 pt-5">
            <Link href="/dashboard">
              <Button type="button" variant="ghost" size="sm" disabled={isPending}>
                Batal
              </Button>
            </Link>

            <Button type="submit" size="sm" disabled={isPending} className="bg-emerald-800 hover:bg-emerald-900 gap-2">
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  Gabung Sekarang
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
