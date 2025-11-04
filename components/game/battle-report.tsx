"use client"

import { Card } from "@/components/ui/card"
import { useState, useEffect } from "react"

interface BattleReportProps {
  attackId: string
}

export function BattleReport({ attackId }: BattleReportProps) {
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/attacks/${attackId}`)
        const data = await res.json()
        setReport(data)
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [attackId])

  if (loading) return <div>Loading report...</div>

  return (
    <Card className="p-6 space-y-6">
      <div className="border-b pb-4">
        <h3 className="font-bold text-lg mb-2">Battle Report</h3>
        <p className="text-sm text-muted-foreground">{report?.attackerWon ? "Attacker Victory" : "Defender Victory"}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-bold mb-3">Attacker</h4>
          <div className="space-y-2 text-sm">
            <p>Power: {report?.attackerPower}</p>
            <p>Casualties: {report?.attackerCasualties}</p>
          </div>
        </div>
        <div>
          <h4 className="font-bold mb-3">Defender</h4>
          <div className="space-y-2 text-sm">
            <p>Power: {report?.defenderPower}</p>
            <p>Casualties: {report?.defenderCasualties}</p>
          </div>
        </div>
      </div>

      {report?.attackerWon && (
        <div className="bg-primary/10 p-4 rounded">
          <h4 className="font-bold mb-2">Loot Obtained</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>Wood: {report?.lootWood}</p>
            <p>Stone: {report?.lootStone}</p>
            <p>Iron: {report?.lootIron}</p>
            <p>Gold: {report?.lootGold}</p>
            <p>Food: {report?.lootFood}</p>
          </div>
        </div>
      )}
    </Card>
  )
}
