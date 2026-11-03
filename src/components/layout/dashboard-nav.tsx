"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Receipt,
  Scale,
  HandCoins,
  Home,
  LogOut,
  User as UserIcon,
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

  const navItems = [
    { href: "/dashboard", label: "Ikhtisar", icon: LayoutDashboard },
    { href: "/transactions", label: "Transaksi", icon: Receipt },
    { href: "/balances", label: "Saldo & Utang", icon: Scale },
    { href: "/settlements", label: "Pelunasan", icon: HandCoins },
    { href: "/household", label: "Rumah Tangga", icon: Home },
  ];

  return (
    <header className="border-b border-stone-200 bg-white sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/dashboard" className="flex items-center space-x-2.5">
            <div className="h-7 w-7 rounded bg-emerald-800 flex items-center justify-center text-white text-xs font-bold">
              K
            </div>
            <span className="font-semibold text-stone-900 tracking-tight text-base">
              KostKita
            </span>
          </Link>

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

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs text-stone-600">
            <UserIcon className="h-3.5 w-3.5 text-stone-400" />
            <span className="font-medium text-stone-800">
              {user.name || user.email?.split("@")[0]}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-stone-500 hover:text-stone-900 hover:bg-stone-100 h-8 px-2"
            title="Keluar"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

