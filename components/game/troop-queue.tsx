"use client"

import { CountdownTimer } from "./countdown-timer"
import type { TroopProduction } from "@prisma/client"

interface TroopQueueProps {
  productions: Array<TroopProduction & { building: { villageId: string } }>
}

export function TroopQueue({ productions }: TroopQueueProps) {
  if (productions.length === 0) {
    return <div className="text-sm text-muted-foreground">No troops in training</div>
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Training Queue</h3>
      {productions.map((production) => (
        <div
          key={production.id}
          className="flex items-center justify-between border border-border bg-secondary/50 p-2 text-sm"
        >
          <div className="flex-1">
            <div className="font-semibold">
              {production.quantity}x {production.troopType}
            </div>
            <div className="text-xs text-muted-foreground">
              Completes in <CountdownTimer targetDate={production.completionAt} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

