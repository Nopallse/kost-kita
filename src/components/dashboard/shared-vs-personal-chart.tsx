"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { formatIDR } from "@/lib/utils";

interface ProportionItem {
  name: string;
  value: number;
  color: string;
}

interface SharedVsPersonalChartProps {
  sharedAmount: number;
  personalAmount: number;
  customAmount: number;
}

export function SharedVsPersonalChart({
  sharedAmount,
  personalAmount,
  customAmount,
}: SharedVsPersonalChartProps) {
  const total = sharedAmount + personalAmount + customAmount;

  if (total <= 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-stone-400 bg-stone-50/50 rounded-md border border-dashed border-stone-200">
        Belum ada proporsi pengeluaran
      </div>
    );
  }

  const data: ProportionItem[] = [
    { name: "Patungan (Shared)", value: sharedAmount, color: "#2D6A4F" },
    { name: "Pribadi (Personal)", value: personalAmount, color: "#78716C" },
    { name: "Kustom (Custom)", value: customAmount, color: "#2563EB" },
  ].filter((d) => d.value > 0);

  return (
    <div className="h-64 flex flex-col justify-between">
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0];
                  const pct = Math.round(((item.value as number) / total) * 100);
                  return (
                    <div className="bg-stone-900 text-white px-3 py-2 rounded-md shadow-md text-xs space-y-0.5">
                      <p className="text-stone-300 text-[10px] uppercase tracking-wider">
                        {item.name}
                      </p>
                      <p className="font-mono font-semibold text-emerald-300">
                        {formatIDR(item.value as number)} ({pct}%)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={data}
              innerRadius={45}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend with percentages */}
      <div className="pt-2 border-t border-stone-100 grid grid-cols-3 gap-1 text-center text-xs">
        {data.map((item) => {
          const pct = Math.round((item.value / total) * 100);
          return (
            <div key={item.name} className="space-y-0.5">
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-600">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.name.split(" ")[0]}</span>
              </div>
              <div className="font-mono font-semibold text-stone-900 text-xs">
                {pct}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
