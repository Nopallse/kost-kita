"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, KeyRound } from "lucide-react";

interface InviteCodeCardProps {
  inviteCode: string;
}

export function InviteCodeCard({ inviteCode }: InviteCodeCardProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between p-3.5 bg-stone-50 border border-stone-200/80 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="h-8 w-8 rounded bg-stone-200/70 text-stone-700 flex items-center justify-center">
          <KeyRound className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
            Kode Undangan Kost
          </p>
          <p className="text-base font-mono font-semibold tracking-wider text-stone-900">
            {inviteCode}
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="h-8 text-xs border-stone-300 bg-white hover:bg-stone-50 gap-1.5"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-700" />
            <span className="text-emerald-700 font-medium">Tersalin</span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Salin Kode
          </>
        )}
      </Button>
    </div>
  );
}

