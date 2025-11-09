"use client"

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

export interface RouteMetricRow {
  route: string
  count: number
  errors: number
  errorRate: number
  lastMs: number
  avgMs: number
  p50: number
  p95: number
  p99: number
}

export function PerfBarChart({ data, onSelectRoute }: { data: RouteMetricRow[]; onSelectRoute?: (route: string) => void }) {
  const chartData = data
    .map((d) => ({ name: d.route, p95: Math.round(d.p95), p50: Math.round(d.p50) }))
    .sort((a, b) => b.p95 - a.p95)
    .slice(0, 12) // top 12 slowest

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ left: 12, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" hide />
          <YAxis width={45} unit="ms" />
          <Tooltip formatter={(value: any) => `${value} ms`} />
          <Bar
            dataKey="p95"
            fill="#8884d8"
            name="p95"
            onClick={(data: any) => {
              const route = data?.payload?.name
              if (route && onSelectRoute) onSelectRoute(route)
            }}
          />
          <Bar
            dataKey="p50"
            fill="#82ca9d"
            name="p50"
            onClick={(data: any) => {
              const route = data?.payload?.name
              if (route && onSelectRoute) onSelectRoute(route)
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
