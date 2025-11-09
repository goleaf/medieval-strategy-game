"use client"

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"

const COLORS = [
  "#2563eb", // blue-600
  "#16a34a", // green-600
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
]

export type PerfLineDatum = { minute: string; [route: string]: number | string }

export function PerfLineChart({ data, routes, height = 260, onLegendClick }: { data: PerfLineDatum[]; routes: string[]; height?: number; onLegendClick?: (route: string) => void }) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 12, right: 12, top: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="minute" tick={{ fontSize: 11 }} />
          <YAxis width={45} unit="ms" tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: any) => `${Math.round(v)} ms`} labelFormatter={(l) => new Date(l).toLocaleTimeString()} />
          <Legend wrapperStyle={{ fontSize: 12, cursor: 'pointer' }} onClick={(e: any) => {
            const value = e?.dataKey || e?.value
            if (value && typeof value === 'string' && onLegendClick) onLegendClick(value)
          }} />
          {routes.map((r, idx) => (
            <Line key={r} type="monotone" dot={false} dataKey={r} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} name={r} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
