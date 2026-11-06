import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/layout/dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col">
      <DashboardNav user={session.user} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24 sm:pb-10">
        {children}
      </main>
      <footer className="border-t border-stone-200/80 py-4 text-center text-xs text-stone-500 hidden md:block">
        KostKita Ledger — Server-side BigInt Financial Engine
      </footer>
    </div>
  );
}

