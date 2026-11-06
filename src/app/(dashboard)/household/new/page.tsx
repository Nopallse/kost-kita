"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { createHouseholdAction, type ActionState } from "@/actions/household";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Home, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

export default function NewHouseholdPage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ActionState<{ householdId: string }>, FormData>(
    createHouseholdAction,
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
        <Badge variant="shared" className="text-xs mb-2">
          Inisialisasi Kas Baru
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          Buat Rumah Tangga / Kost
        </h1>
        <p className="text-sm text-stone-600">
          Buat ruang pembukuan bersama. Anda akan otomatis menjadi Admin untuk mengelola anggota.
        </p>
      </div>

      <Card className="border-stone-200/80 bg-white shadow-sm">
        <form action={formAction}>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Home className="h-4 w-4 text-emerald-800" />
              Informasi Rumah Tangga
            </CardTitle>
            <CardDescription>
              Nama dapat berupa nama kost, nomor unit kontrakan, atau nama kelompok teman.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {state.error && (
              <div className="p-3 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-md">
                {state.error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Nama Kost / Kontrakan</Label>
              <Input
                id="name"
                name="name"
                placeholder="Contoh: Kost Griya Melati No. 4"
                required
                disabled={isPending}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nickname">Nama Panggilan Anda di Kost</Label>
              <Input
                id="nickname"
                name="nickname"
                placeholder="Contoh: Andi (Kamar 2)"
                disabled={isPending}
              />
              <p className="text-[11px] text-stone-500">
                Nama ini yang akan ditampilkan pada daftar tanggung jawab dan struk pengeluaran.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currency">Mata Uang Buku Kas</Label>
              <Input
                id="currency"
                name="currency"
                defaultValue="IDR"
                readOnly
                className="bg-stone-50 text-stone-600 font-mono cursor-not-allowed"
              />
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-stone-100 pt-5">
            <Link href="/dashboard">
              <Button type="button" variant="ghost" size="sm" disabled={isPending}>
                Batal
              </Button>
            </Link>

            <Button type="submit" size="sm" disabled={isPending} className="bg-emerald-800 hover:bg-emerald-900 gap-2 h-10 sm:h-8 px-4">
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Membuat Kas...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Buat Rumah Tangga
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

