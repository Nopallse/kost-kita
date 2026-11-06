"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setErrorMessage("Email atau kata sandi tidak sesuai.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setErrorMessage("Terjadi kesalahan saat memproses login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-widest text-stone-500 font-medium">KostKita Ledger</p>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Masuk ke KostKita</h1>
          <p className="text-sm text-stone-600">
            Kelola pengeluaran bersama dengan transparansi penuh.
          </p>
        </div>

        <Card className="border-stone-200/80 shadow-sm bg-white">
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-medium">Autentikasi Cepat</CardTitle>
              <CardDescription>
                Dapat menggunakan email apa saja tanpa perlu verifikasi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="p-3 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-md">
                  {errorMessage}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@kost.id"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Kata Sandi</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button type="submit" className="w-full gap-2 h-11 text-base sm:h-9 sm:text-sm font-medium" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              <div className="text-center text-xs text-stone-500">
                Belum memiliki akun?{" "}
                <Link href="/register" className="text-stone-900 font-medium underline underline-offset-4 hover:text-emerald-800">
                  Daftar instan di sini
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

