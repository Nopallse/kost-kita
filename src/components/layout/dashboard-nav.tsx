"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Receipt,
  Scale,
  HandCoins,
  BarChart3,
  Home,
  LogOut,
  User as UserIcon,
  Plus,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardNavProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Close mobile drawer when pathname changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent background scroll when mobile menu is open
  React.useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const navItems = [
    { href: "/dashboard", label: "Ikhtisar", icon: LayoutDashboard },
    { href: "/transactions", label: "Transaksi", icon: Receipt },
    { href: "/balances", label: "Saldo & Utang", icon: Scale },
    { href: "/settlements", label: "Pelunasan", icon: HandCoins },
    { href: "/reports", label: "Laporan", icon: BarChart3 },
    { href: "/household", label: "Rumah Tangga", icon: Home },
  ];

  // Mobile Bottom Nav Primary Tabs
  const isDashboardActive = pathname === "/dashboard";
  const isTransactionsActive =
    pathname === "/transactions" ||
    (pathname.startsWith("/transactions/") && pathname !== "/transactions/new");
  const isNewTxActive = pathname === "/transactions/new";
  const isBalancesActive = pathname.startsWith("/balances");
  const isMoreActive =
    pathname.startsWith("/settlements") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/household");

  const displayName = user.name || user.email?.split("@")[0] || "Pengguna";

  return (
    <>
      {/* Top Header */}
      <header className="border-b border-stone-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/dashboard" className="flex items-center space-x-2.5">
              <div className="h-7 w-7 rounded-md bg-emerald-800 flex items-center justify-center text-white text-xs font-bold tracking-wider shadow-sm">
                K
              </div>
              <span className="font-semibold text-stone-900 tracking-tight text-base">
                KostKita
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                      isActive
                        ? "bg-stone-100 text-stone-900 font-semibold"
                        : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User profile & actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="flex items-center space-x-2 text-xs bg-stone-50 border border-stone-200/60 px-2.5 py-1 rounded-full">
              <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-stone-800 max-w-[100px] sm:max-w-[160px] truncate">
                {displayName}
              </span>
            </div>

            {/* Desktop Logout Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="hidden sm:flex text-stone-500 hover:text-stone-900 hover:bg-stone-100 h-8 px-2"
              title="Keluar"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Sheet (Menu Lainnya) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Sheet Content */}
          <div className="relative bg-white rounded-t-2xl border-t border-stone-200 shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto z-10 animate-in slide-in-from-bottom-5 duration-200">
            {/* Drawer Handle */}
            <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto" />

            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900 leading-tight">
                    {displayName}
                  </p>
                  <p className="text-xs text-stone-500 leading-tight mt-0.5">
                    {user.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="h-8 w-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-900"
                aria-label="Tutup menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Navigation Sections */}
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider px-2 mb-1">
                Menu Finansial
              </p>

              <Link
                href="/settlements"
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith("/settlements")
                    ? "bg-emerald-50 text-emerald-900 font-semibold"
                    : "text-stone-700 hover:bg-stone-50"
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-md bg-stone-100 flex items-center justify-center text-stone-700">
                    <HandCoins className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block leading-tight">Pelunasan & Klaim</span>
                    <span className="text-[11px] text-stone-400 font-normal">
                      Reimbursement antar anggota
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-stone-400" />
              </Link>

              <Link
                href="/reports"
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith("/reports")
                    ? "bg-emerald-50 text-emerald-900 font-semibold"
                    : "text-stone-700 hover:bg-stone-50"
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-md bg-stone-100 flex items-center justify-center text-stone-700">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block leading-tight">Laporan & Ekspor</span>
                    <span className="text-[11px] text-stone-400 font-normal">
                      Analisis & download CSV
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-stone-400" />
              </Link>

              <Link
                href="/household"
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith("/household")
                    ? "bg-emerald-50 text-emerald-900 font-semibold"
                    : "text-stone-700 hover:bg-stone-50"
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-md bg-stone-100 flex items-center justify-center text-stone-700">
                    <Home className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block leading-tight">Rumah Tangga</span>
                    <span className="text-[11px] text-stone-400 font-normal">
                      Kode undangan & anggota kost
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-stone-400" />
              </Link>
            </div>

            {/* Logout button */}
            <div className="pt-2 border-t border-stone-100">
              <Button
                variant="outline"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full justify-start text-rose-700 border-rose-200 hover:bg-rose-50 hover:text-rose-800 gap-2 text-sm h-10"
              >
                <LogOut className="h-4 w-4" />
                Keluar dari Akun
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav
        aria-label="Navigasi Bawah"
        className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/95 backdrop-blur-lg border-t border-stone-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] px-2 pb-[env(safe-area-inset-bottom,8px)] pt-1"
      >
        <div className="grid grid-cols-5 items-center h-14">
          {/* 1. Ikhtisar */}
          <Link
            href="/dashboard"
            className={cn(
              "flex flex-col items-center justify-center h-full py-1 text-center transition-colors touch-manipulation",
              isDashboardActive
                ? "text-emerald-800 font-semibold"
                : "text-stone-500 hover:text-stone-900"
            )}
          >
            <div
              className={cn(
                "p-1 rounded-md transition-colors",
                isDashboardActive && "bg-emerald-50"
              )}
            >
              <LayoutDashboard className="h-4.5 w-4.5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Ikhtisar</span>
          </Link>

          {/* 2. Transaksi */}
          <Link
            href="/transactions"
            className={cn(
              "flex flex-col items-center justify-center h-full py-1 text-center transition-colors touch-manipulation",
              isTransactionsActive
                ? "text-emerald-800 font-semibold"
                : "text-stone-500 hover:text-stone-900"
            )}
          >
            <div
              className={cn(
                "p-1 rounded-md transition-colors",
                isTransactionsActive && "bg-emerald-50"
              )}
            >
              <Receipt className="h-4.5 w-4.5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Transaksi</span>
          </Link>

          {/* 3. Center Action (+ Catat) */}
          <div className="flex flex-col items-center justify-center">
            <Link
              href="/transactions/new"
              className={cn(
                "-mt-5 h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 border-2 border-white",
                isNewTxActive
                  ? "bg-stone-900 text-white"
                  : "bg-emerald-800 text-white hover:bg-emerald-900"
              )}
              title="Catat Belanja Baru"
              aria-label="Catat Belanja Baru"
            >
              <Plus className="h-6 w-6 stroke-[2.5]" />
            </Link>
            <span className="text-[10px] mt-0.5 font-medium text-emerald-800">
              Catat
            </span>
          </div>

          {/* 4. Saldo & Utang */}
          <Link
            href="/balances"
            className={cn(
              "flex flex-col items-center justify-center h-full py-1 text-center transition-colors touch-manipulation",
              isBalancesActive
                ? "text-emerald-800 font-semibold"
                : "text-stone-500 hover:text-stone-900"
            )}
          >
            <div
              className={cn(
                "p-1 rounded-md transition-colors",
                isBalancesActive && "bg-emerald-50"
              )}
            >
              <Scale className="h-4.5 w-4.5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Saldo</span>
          </Link>

          {/* 5. Menu / Lainnya */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center h-full py-1 text-center transition-colors touch-manipulation",
              isMoreActive || isMobileMenuOpen
                ? "text-emerald-800 font-semibold"
                : "text-stone-500 hover:text-stone-900"
            )}
            aria-label="Buka menu lainnya"
          >
            <div
              className={cn(
                "p-1 rounded-md transition-colors",
                (isMoreActive || isMobileMenuOpen) && "bg-emerald-50"
              )}
            >
              <Menu className="h-4.5 w-4.5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Lainnya</span>
          </button>
        </div>
      </nav>
    </>
  );
}
