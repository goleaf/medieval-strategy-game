"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TextTable } from "@/components/game/text-table"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { SuccessMessage } from "@/components/ui/success-message"
import { ErrorMessage } from "@/components/ui/error-message"

interface AnalyticsData {
  totalTransactions: number
  totalExchanges: number
  totalBalances: number
  totalGoldSpent: number
  recentTransactions: number
  topPlayers: Array<{
    villageId: string
    villageName: string
    playerName: string
    transactionCount: number
  }>
  resourceStats: Record<string, { from: number; to: number }>
}

interface TransactionData {
  id: string
  action: string
  villageId: string
  playerId: string
  details: any
  createdAt: string
  adminUsername: string
}

interface SettingsData {
  goldCost: number
  minExchangeAmount: number
  enabled: boolean
  availableResources: string[]
}

export function NpcMerchantAdmin() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [transactions, setTransactions] = useState<TransactionData[]>([])
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/admin/npc-merchant?action=analytics")
      const result = await res.json()
      if (result.success) {
        setAnalytics(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    }
  }

  const fetchTransactions = async (page = 1) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/npc-merchant?action=transactions&page=${page}&limit=20`)
      const result = await res.json()
      if (result.success) {
        setTransactions(result.data.transactions)
        setTotalPages(result.data.pagination.totalPages)
        setCurrentPage(page)
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
      setError("Failed to fetch transactions")
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/npc-merchant?action=settings")
      const result = await res.json()
      if (result.success) {
        setSettings(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error)
    }
  }

  const updateSettings = async () => {
    if (!settings) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch("/api/admin/npc-merchant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateSettings",
          settings,
        }),
      })

      const result = await res.json()
      if (result.success) {
        setSuccess("Settings updated successfully")
      } else {
        setError(result.error || "Failed to update settings")
      }
    } catch (error) {
      console.error("Failed to update settings:", error)
      setError("Failed to update settings")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    fetchTransactions()
    fetchSettings()
  }, [])

  const formatResourceStats = (stats: Record<string, { from: number; to: number }>) => {
    return Object.entries(stats).map(([resource, data]) => ({
      resource,
      exchangedFrom: data.from.toLocaleString(),
      exchangedTo: data.to.toLocaleString(),
      netFlow: (data.to - data.from).toLocaleString(),
    }))
  }

  const formatTransactionDetails = (transaction: TransactionData) => {
    const { action, details } = transaction

    if (action === "NPC_MERCHANT_EXCHANGE") {
      return `${details.amount} ${details.fromResource} → ${details.amount} ${details.toResource} (Cost: ${details.goldCost} Gold)`
    } else if (action === "NPC_MERCHANT_BALANCE") {
      return `Balanced resources to ${details.balancedAmount} each (Cost: ${details.goldCost} Gold)`
    }

    return "Unknown transaction type"
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>NPC Merchant Administration</CardTitle>
          <CardDescription>
            Manage NPC Merchant settings, view analytics, and monitor transactions
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          {analytics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalTransactions.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.totalExchanges} exchanges, {analytics.totalBalances} balances
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Gold Spent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalGoldSpent.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Total gold cost</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.recentTransactions.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg Gold/Transaction</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.totalTransactions > 0
                      ? (analytics.totalGoldSpent / analytics.totalTransactions).toFixed(1)
                      : "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">Gold per use</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8">Loading analytics...</div>
          )}

          {analytics?.topPlayers && analytics.topPlayers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Most Active Players</CardTitle>
                <CardDescription>Players with the most NPC Merchant transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <TextTable
                  headers={["Player", "Village", "Transactions"]}
                  rows={analytics.topPlayers.slice(0, 10).map((player) => [
                    player.playerName,
                    player.villageName,
                    player.transactionCount.toString(),
                  ])}
                />
              </CardContent>
            </Card>
          )}

          {analytics?.resourceStats && (
            <Card>
              <CardHeader>
                <CardTitle>Resource Exchange Statistics</CardTitle>
                <CardDescription>Total resources exchanged from/to each type</CardDescription>
              </CardHeader>
              <CardContent>
                <TextTable
                  headers={["Resource", "Exchanged From", "Exchanged To", "Net Flow"]}
                  rows={formatResourceStats(analytics.resourceStats).map((stat) => [
                    stat.resource,
                    stat.exchangedFrom,
                    stat.exchangedTo,
                    stat.netFlow,
                  ])}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Recent Transactions</h3>
            <Button
              onClick={() => fetchTransactions(currentPage)}
              disabled={loading}
              variant="outline"
            >
              {loading ? <LoadingSpinner /> : "Refresh"}
            </Button>
          </div>

          {transactions.length > 0 ? (
            <TextTable
              headers={["Date", "Action", "Player ID", "Village ID", "Details"]}
              rows={transactions.map((transaction) => [
                new Date(transaction.createdAt).toLocaleString(),
                transaction.action.replace("NPC_MERCHANT_", ""),
                transaction.playerId || "N/A",
                transaction.villageId,
                formatTransactionDetails(transaction),
              ])}
            />
          ) : (
            <div className="text-center py-8">No transactions found</div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => fetchTransactions(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              >
                Previous
              </Button>
              <span className="px-4 py-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => fetchTransactions(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {settings ? (
            <Card>
              <CardHeader>
                <CardTitle>NPC Merchant Settings</CardTitle>
                <CardDescription>Configure NPC Merchant behavior and costs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="goldCost">Gold Cost per Use</Label>
                    <Input
                      id="goldCost"
                      type="number"
                      min="1"
                      max="100"
                      value={settings.goldCost}
                      onChange={(e) => setSettings({
                        ...settings,
                        goldCost: parseInt(e.target.value) || 3
                      })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="minExchange">Minimum Exchange Amount</Label>
                    <Input
                      id="minExchange"
                      type="number"
                      min="1"
                      max="1000"
                      value={settings.minExchangeAmount}
                      onChange={(e) => setSettings({
                        ...settings,
                        minExchangeAmount: parseInt(e.target.value) || 50
                      })}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={updateSettings} disabled={loading}>
                    {loading ? <LoadingSpinner /> : "Update Settings"}
                  </Button>
                  <Button variant="outline" onClick={fetchSettings}>
                    Reset
                  </Button>
                </div>

                {success && <SuccessMessage message={success} />}
                {error && <ErrorMessage message={error} />}
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8">Loading settings...</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
