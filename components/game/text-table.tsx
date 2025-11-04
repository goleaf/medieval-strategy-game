"use client"

import { ReactNode } from "react"

interface TextTableProps {
  headers: string[]
  rows: ReactNode[][]
  className?: string
}

export function TextTable({ headers, rows, className = "" }: TextTableProps) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse border border-border text-sm">
        <thead>
          <tr>
            {headers.map((header, idx) => (
              <th
                key={idx}
                className="border border-border bg-secondary p-2 text-left font-semibold"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="border border-border p-4 text-center text-muted-foreground">
                No data
              </td>
            </tr>
          ) : (
            rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-secondary/50">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="border border-border p-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

