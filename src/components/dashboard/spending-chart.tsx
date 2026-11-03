"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatIDR } from "@/lib/utils";

interface SpendingDataPoint {
  date: string;
  amount: number;
}

interface SpendingChartProps {
  data: SpendingDataPoint[];
}

export function SpendingChart({ data }: SpendingChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-stone-400 bg-stone-50/50 rounded-md border border-dashed border-stone-200">
        Belum ada data transaksi untuk ditampilkan
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#E5E5E0"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="#78716C"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#E5E5E0" }}
          />
          <YAxis
            stroke="#78716C"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}jt`;
              if (value >= 1000) return `${Math.round(value / 1000)}k`;
              return value.toString();
            }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0];
                return (
                  <div className="bg-stone-900 text-white px-3 py-2 rounded-md shadow-md text-xs space-y-0.5">
                    <p className="text-stone-300 text-[10px] uppercase tracking-wider">
                      {item.payload.date}
                    </p>
                    <p className="font-mono font-semibold text-emerald-300">
                      {formatIDR(item.value as number)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="amount"
            fill="#2D6A4F"
            radius={[4, 4, 0, 0]}
            maxBarSize={45}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

