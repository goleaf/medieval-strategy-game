"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { TextTable } from "@/components/game/text-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAdminWebSocket } from "@/lib/hooks/use-admin-websocket"
import { NpcMerchantAdmin } from "@/components/admin/npc-merchant-admin"
import { CancelStats } from "@/components/admin/cancel-stats"
import { GameWorldManager } from "@/components/admin/game-world-manager"
import { SpeedConfiguration } from "@/components/admin/speed-configuration"

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [worldConfig, setWorldConfig] = useState<any>(null)
  const [speedTemplates, setSpeedTemplates] = useState<any>(null)
  const [unitBalance, setUnitBalance] = useState<any>(null)
  const [editingUnitBalance, setEditingUnitBalance] = useState(false)
  const [unitBalanceForm, setUnitBalanceForm] = useState<any[]>([])
  const [mapTools, setMapTools] = useState<any>(null)
  const [mapVisualization, setMapVisualization] = useState<any>(null)
  const [notifications, setNotifications] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [maintenance, setMaintenance] = useState<any>(null)
  const [messaging, setMessaging] = useState<any>(null)
  const [search, setSearch] = useState<any>(null)
  const [content, setContent] = useState<any>(null)
  const [moderation, setModeration] = useState<any>(null)
  const [exportData, setExportData] = useState<any>(null)
  const [errorLogs, setErrorLogs] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("stats")
  const [loading, setLoading] = useState(false)

  // WebSocket for real-time updates
  const { isConnected: wsConnected, stats: wsStats, connectionError: wsError } = useAdminWebSocket({
    enabled: true,
    url: 'ws://localhost:8080'
  })
  const [editingWorldConfig, setEditingWorldConfig] = useState(false)
  const [worldConfigForm, setWorldConfigForm] = useState<any>({})
  const [mapToolsForm, setMapToolsForm] = useState({
    spawnBarbarian: { x: '', y: '', warriors: '100', spearmen: '50', bowmen: '30', horsemen: '10' },
    relocateTile: { oldX: '', oldY: '', newX: '', newY: '' },
    wipeEmpty: { confirmText: '' }
  })
  const [playerActions, setPlayerActions] = useState({
    selectedPlayer: null as any,
    banReason: '',
    newName: '',
    moveX: '',
    moveY: ''
  })
  const [showPlayerActionDialog, setShowPlayerActionDialog] = useState(false)
  const [currentPlayerAction, setCurrentPlayerAction] = useState('')
  const [messageForm, setMessageForm] = useState({
    playerId: '',
    subject: '',
    message: ''
  })
  const [searchForm, setSearchForm] = useState({
    q: '',
    playerName: '',
    email: '',
    minPoints: '',
    maxPoints: '',
    hasUserAccount: '',
    isBanned: '',
    isDeleted: ''
  })

  const fetchData = async (tab: string) => {
    try {
      setLoading(true)
      if (tab === "stats") {
        const res = await fetch("/api/admin/stats")
        const data = await res.json()
        if (data.success && data.data) {
          setStats(data.data)
        }
      } else if (tab === "players") {
        const res = await fetch("/api/admin/players")
        const data = await res.json()
        if (data.success && data.data) {
          setPlayers(data.data)
        }
      } else if (tab === "world") {
        const res = await fetch("/api/admin/world/config")
        const data = await res.json()
        if (data.success && data.data) {
          setWorldConfig(data.data)
        }
      } else if (tab === "speed") {
        const res = await fetch("/api/admin/speed-templates")
        const data = await res.json()
        if (data.success && data.data) {
          setSpeedTemplates(data.data)
        }
      } else if (tab === "units") {
        const res = await fetch('/api/admin/units/balance', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
          }
        })
        const data = await res.json()
        if (data.success && data.data) {
          setUnitBalance(data.data)
        }
      } else if (tab === "mapviz") {
        const res = await fetch('/api/admin/map/visualization', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
          }
        })
        const data = await res.json()
        if (data.success && data.data) {
          setMapVisualization(data.data)
        }
      } else if (tab === "notifications") {
        const res = await fetch('/api/admin/notifications', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
          }
        })
        const data = await res.json()
        if (data.success && data.data) {
          setNotifications(data.data)
        }
      } else if (tab === "analytics") {
        const res = await fetch('/api/admin/analytics', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
          }
        })
        const data = await res.json()
        if (data.success && data.data) {
          setAnalytics(data.data)
        }
      } else if (tab === "maintenance") {
        const res = await fetch('/api/admin/maintenance', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
          }
        })
        const data = await res.json()
        if (data.success && data.data) {
          setMaintenance(data.data)
        }
      } else if (tab === "messaging") {
        const res = await fetch('/api/admin/messaging', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
          }
        })
        const data = await res.json()
        if (data.success && data.data) {
          setMessaging(data.data)
        }
      } else if (tab === "search") {
        // Search is handled differently - it requires search parameters
        setSearch({ players: [], pagination: { total: 0, page: 1, pages: 1 } })
      } else if (tab === "content") {
        const res = await fetch('/api/admin/content', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
          }
        })
        const data = await res.json()
        if (data.success && data.data) {
          setContent(data.data)
        }
      } else if (tab === "moderation") {
        const res = await fetch('/api/admin/moderation', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
          }
        })
        const data = await res.json()
        if (data.success && data.data) {
          setModeration(data.data)
        }
      } else if (tab === "export") {
        const res = await fetch('/api/admin/export', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
          }
        })
        const data = await res.json()
        if (data.success && data.data) {
          setExportData(data.data)
        }
      } else if (tab === "errors") {
        // Error logs are included in stats API
        if (stats?.errorLogs) {
          setErrorLogs(stats.errorLogs)
        }
      }
    } catch (error) {
      console.error("Failed to fetch admin data:", error)
    } finally {
      setLoading(false)
    }
  }

  const switchTab = async (tab: string) => {
    setActiveTab(tab)
    await fetchData(tab)
  }

  const handleEditWorldConfig = () => {
    setWorldConfigForm({
      worldName: worldConfig?.worldName || "Medieval World",
      speed: worldConfig?.speed || 1,
      unitSpeed: worldConfig?.unitSpeed || 1.0,
      resourcePerTick: worldConfig?.resourcePerTick || 10,
      productionMultiplier: worldConfig?.productionMultiplier || 1.0,
      tickIntervalMinutes: worldConfig?.tickIntervalMinutes || 5,
      nightBonusMultiplier: worldConfig?.nightBonusMultiplier || 1.2,
      beginnerProtectionHours: worldConfig?.beginnerProtectionHours || 72,
      isRunning: worldConfig?.isRunning || true,
      beginnerProtectionEnabled: worldConfig?.beginnerProtectionEnabled || true,
    })
    setEditingWorldConfig(true)
  }

  const handleSaveWorldConfig = async () => {
    try {
      const res = await fetch('/api/admin/world/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(worldConfigForm),
      })
    const data = await res.json()

      if (data.success) {
        alert('World configuration updated successfully!')
        setEditingWorldConfig(false)
        // Refresh world config
        const configRes = await fetch("/api/admin/world/config")
        const configData = await configRes.json()
        if (configData.success && configData.data) {
          setWorldConfig(configData.data)
        }
      } else {
        alert('Failed to update world config: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Failed to save world config:', error)
      alert('Failed to save world config')
    }
  }

  const handleCancelWorldConfigEdit = () => {
    setEditingWorldConfig(false)
    setWorldConfigForm({})
  }

  const handleEditUnitBalance = () => {
    setUnitBalanceForm(unitBalance.map((unit: any) => ({
      type: unit.type,
      cost: { ...unit.cost },
      stats: { ...unit.stats }
    })))
    setEditingUnitBalance(true)
  }

  const handleSaveUnitBalance = async () => {
    try {
      const res = await fetch('/api/admin/units/balance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
        },
        body: JSON.stringify({ balances: unitBalanceForm }),
      })

      const data = await res.json()
      if (data.success) {
        alert('Unit balance updated successfully!')
        setEditingUnitBalance(false)
        // Refresh unit balance
        const balanceRes = await fetch('/api/admin/units/balance', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
          }
        })
        const balanceData = await balanceRes.json()
        if (balanceData.success && balanceData.data) {
          setUnitBalance(balanceData.data)
        }
      } else {
        alert('Failed to update unit balance: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Failed to save unit balance:', error)
      alert('Failed to save unit balance')
    }
  }

  const handleCancelUnitBalanceEdit = () => {
    setEditingUnitBalance(false)
    setUnitBalanceForm([])
  }

  const handleSpawnBarbarian = async () => {
    const { x, y, warriors, spearmen, bowmen, horsemen } = mapToolsForm.spawnBarbarian

    if (!x || !y) {
      alert('Please enter coordinates')
      return
    }

    try {
      const res = await fetch('/api/admin/map/spawn-barbarian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x: parseInt(x),
          y: parseInt(y),
          warriors: parseInt(warriors),
          spearmen: parseInt(spearmen),
          bowmen: parseInt(bowmen),
          horsemen: parseInt(horsemen),
        }),
      })

      const data = await res.json()
      if (data.success) {
        alert('Barbarian village spawned successfully!')
        setMapToolsForm(prev => ({ ...prev, spawnBarbarian: { x: '', y: '', warriors: '100', spearmen: '50', bowmen: '30', horsemen: '10' } }))
      } else {
        alert('Failed to spawn barbarian: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Failed to spawn barbarian:', error)
      alert('Failed to spawn barbarian')
    }
  }

  const handleRelocateTile = async () => {
    const { oldX, oldY, newX, newY } = mapToolsForm.relocateTile

    if (!oldX || !oldY || !newX || !newY) {
      alert('Please enter all coordinates')
      return
    }

    try {
      const res = await fetch('/api/admin/map/relocate-tile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldX: parseInt(oldX),
          oldY: parseInt(oldY),
          newX: parseInt(newX),
          newY: parseInt(newY),
        }),
      })

      const data = await res.json()
      if (data.success) {
        alert('Village relocated successfully!')
        setMapToolsForm(prev => ({ ...prev, relocateTile: { oldX: '', oldY: '', newX: '', newY: '' } }))
      } else {
        alert('Failed to relocate tile: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Failed to relocate tile:', error)
      alert('Failed to relocate tile')
    }
  }

  const handleWipeEmpty = async () => {
    if (mapToolsForm.wipeEmpty.confirmText !== 'WIPE_EMPTY_VILLAGES') {
      alert('Please type "WIPE_EMPTY_VILLAGES" to confirm')
      return
    }

    try {
      const res = await fetch('/api/admin/map/wipe-empty', {
        method: 'POST',
      })

      const data = await res.json()
      if (data.success) {
        alert(`Successfully wiped ${data.data?.deletedCount || 0} empty villages!`)
        setMapToolsForm(prev => ({ ...prev, wipeEmpty: { confirmText: '' } }))
      } else {
        alert('Failed to wipe empty villages: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Failed to wipe empty villages:', error)
      alert('Failed to wipe empty villages')
    }
  }

  const openPlayerActionDialog = (player: any, action: string) => {
    setPlayerActions({
      selectedPlayer: player,
      banReason: '',
      newName: player.playerName,
      moveX: '',
      moveY: ''
    })
    setCurrentPlayerAction(action)
    setShowPlayerActionDialog(true)
  }

  const handlePlayerAction = async () => {
    const player = playerActions.selectedPlayer
    const action = currentPlayerAction

    if (!player) return

    if (action === 'ban' && !playerActions.banReason.trim()) {
      alert('Please provide a ban reason')
      return
    }

    if (action === 'rename' && !playerActions.newName.trim()) {
      alert('Please provide a new player name')
      return
    }

    if (action === 'move-village' && (!playerActions.moveX || !playerActions.moveY)) {
      alert('Please provide new coordinates')
      return
    }

    try {
      let endpoint = `/api/admin/players/${player.id}/${action}`
      let body = {}

      switch (action) {
        case 'ban':
          body = { reason: playerActions.banReason }
          break
        case 'rename':
          body = { newName: playerActions.newName }
          break
        case 'move-village':
          body = { x: parseInt(playerActions.moveX), y: parseInt(playerActions.moveY) }
          break
        case 'unban':
          // No body needed for unban
          break
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
      })

      const data = await res.json()
      if (data.success) {
        alert(`Player ${action} successful!`)
        setShowPlayerActionDialog(false)
        // Reset form
        setPlayerActions({
          selectedPlayer: null,
          banReason: '',
          newName: '',
          moveX: '',
          moveY: ''
        })
        // Refresh players list
        const playersRes = await fetch("/api/admin/players")
        const playersData = await playersRes.json()
        if (playersData.success && playersData.data) {
          setPlayers(playersData.data)
        }
      } else {
        alert(`Failed to ${action} player: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error(`Failed to ${action} player:`, error)
      alert(`Failed to ${action} player`)
    }
  }

  const handleApplySpeedTemplate = async (templateId: string) => {
    try {
      const res = await fetch('/api/admin/speed-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateId }),
      })
    const data = await res.json()

      if (data.success) {
        alert(data.message || 'Speed template applied successfully!')
        // Refresh world config
        const configRes = await fetch("/api/admin/world/config")
        const configData = await configRes.json()
        if (configData.success && configData.data) {
          setWorldConfig(configData.data)
        }
      } else {
        alert('Failed to apply speed template: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Failed to apply speed template:', error)
      alert('Failed to apply speed template')
    }
  }

  useEffect(() => {
    switchTab("stats")
  }, [])

  // Handler functions for new features
  const handleMaintenanceAction = async (action: string) => {
    try {
      if (action === 'toggle') {
        const isActive = maintenance?.maintenance?.isActive
        const message = isActive ? null : prompt('Enter maintenance message:')
        if (!isActive && !message) return

        const response = await fetch('/api/admin/maintenance', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: isActive ? 'disable' : 'enable',
            message: message || undefined
          })
        })

        if (response.ok) {
          // Refresh maintenance data
          fetchData('maintenance')
        }
      } else if (action === 'cleanup') {
        if (!confirm('Are you sure you want to run cleanup operations? This will remove old data.')) return

        const response = await fetch('/api/admin/maintenance', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'cleanup' })
        })

        if (response.ok) {
          alert('Cleanup completed successfully!')
          fetchData('maintenance')
        }
      }
    } catch (error) {
      console.error('Maintenance action error:', error)
      alert('Failed to perform maintenance action')
    }
  }

  const handleSendMessage = async () => {
    if (!messageForm.playerId || !messageForm.subject || !messageForm.message) {
      alert('Please fill in all fields')
      return
    }

    try {
      const response = await fetch('/api/admin/messaging', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageForm)
      })

      if (response.ok) {
        alert('Message sent successfully!')
        setMessageForm({ playerId: '', subject: '', message: '' })
        fetchData('messaging')
      } else {
        const error = await response.json()
        alert('Failed to send message: ' + error.error)
      }
    } catch (error) {
      console.error('Send message error:', error)
      alert('Failed to send message')
    }
  }

  const handleSearch = async () => {
    try {
      const params = new URLSearchParams()
      Object.entries(searchForm).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      const response = await fetch(`/api/admin/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSearch(data.data)
      }
    } catch (error) {
      console.error('Search error:', error)
      alert('Search failed')
    }
  }

  const handleSearchPage = async (page: number) => {
    try {
      const params = new URLSearchParams()
      Object.entries(searchForm).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
      params.set('page', page.toString())

      const response = await fetch(`/api/admin/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSearch(data.data)
      }
    } catch (error) {
      console.error('Search page error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-sm hover:underline">
            ← Back to Game
          </Link>
          <h1 className="text-xl font-bold">⚙️ Admin Dashboard</h1>
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className={wsConnected ? 'text-green-600' : 'text-red-600'}>
              {wsConnected ? 'Live' : 'Offline'}
            </span>
            {wsError && (
              <span className="text-red-500 text-xs max-w-32 truncate" title={wsError}>
                ({wsError})
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="w-full p-4">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex gap-2 border-b border-border">
            <Button
              onClick={() => switchTab('stats')}
              variant={activeTab === 'stats' ? 'default' : 'ghost'}
            >
              Statistics
            </Button>
            <Button
              onClick={() => switchTab('players')}
              variant={activeTab === 'players' ? 'default' : 'ghost'}
            >
              Players
            </Button>
            <Button
              onClick={() => switchTab('world')}
              variant={activeTab === 'world' ? 'default' : 'ghost'}
            >
              World Config
            </Button>
            <Button
              onClick={() => switchTab('units')}
              variant={activeTab === 'units' ? 'default' : 'ghost'}
            >
              Unit Balance
            </Button>
            <Button
              onClick={() => switchTab('speed')}
              variant={activeTab === 'speed' ? 'default' : 'ghost'}
            >
              Speed Templates
            </Button>
            <Button
              onClick={() => switchTab('map')}
              variant={activeTab === 'map' ? 'default' : 'ghost'}
            >
              Map Tools
            </Button>
            <Button
              onClick={() => switchTab('mapviz')}
              variant={activeTab === 'mapviz' ? 'default' : 'ghost'}
            >
              Map Visualization
            </Button>
            <Button
              onClick={() => switchTab('notifications')}
              variant={activeTab === 'notifications' ? 'default' : 'ghost'}
            >
              Notifications
            </Button>
            <Button
              onClick={() => switchTab('analytics')}
              variant={activeTab === 'analytics' ? 'default' : 'ghost'}
            >
              Analytics
            </Button>
            <Button
              onClick={() => switchTab('maintenance')}
              variant={activeTab === 'maintenance' ? 'default' : 'ghost'}
            >
              Maintenance
            </Button>
            <Button
              onClick={() => switchTab('messaging')}
              variant={activeTab === 'messaging' ? 'default' : 'ghost'}
            >
              Messaging
            </Button>
            <Button
              onClick={() => switchTab('search')}
              variant={activeTab === 'search' ? 'default' : 'ghost'}
            >
              Advanced Search
            </Button>
            <Button
              onClick={() => switchTab('content')}
              variant={activeTab === 'content' ? 'default' : 'ghost'}
            >
              Content Management
            </Button>
            <Button
              onClick={() => switchTab('moderation')}
              variant={activeTab === 'moderation' ? 'default' : 'ghost'}
            >
              Moderation Queue
            </Button>
            <Button
              onClick={() => switchTab('export')}
              variant={activeTab === 'export' ? 'default' : 'ghost'}
            >
              Data Export
            </Button>
            <Button
              onClick={() => switchTab('errors')}
              variant={activeTab === 'errors' ? 'default' : 'ghost'}
            >
              Error Logs
            </Button>
            <Button
              onClick={() => switchTab('npc-merchant')}
              variant={activeTab === 'npc-merchant' ? 'default' : 'ghost'}
            >
              NPC Merchant
            </Button>
            <Button
              onClick={() => switchTab('cancel-stats')}
              variant={activeTab === 'cancel-stats' ? 'default' : 'ghost'}
            >
              Cancel Stats
            </Button>
            <Button
              onClick={() => switchTab('game-worlds')}
              variant={activeTab === 'game-worlds' ? 'default' : 'ghost'}
            >
              Game Worlds
            </Button>
            <Button
              onClick={() => switchTab('speed-config')}
              variant={activeTab === 'speed-config' ? 'default' : 'ghost'}
            >
              Speed Config
            </Button>
          </div>

          {loading && <div className="text-center py-8">Loading...</div>}
          {!loading && (
            <>
              {activeTab === 'stats' && stats && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold">System Statistics</h2>
                  <TextTable
                    headers={["Metric", "Value"]}
                    rows={[
                      ["Online Users", (wsStats?.online?.users ?? stats.onlineUsers)?.toString() || "0"],
                      ["Online Players", (wsStats?.online?.players ?? stats.onlinePlayers)?.toString() || "0"],
                      ["Total Players", stats.totalPlayers?.toString() || "0"],
                      ["Total Villages", stats.totalVillages?.toString() || "0"],
                      ["Active Attacks", stats.activeAttacks?.toString() || "0"],
                      ["Game Status", stats.gameStatus || "Unknown"],
                      ["World Speed", stats.worldSpeed?.toString() || "1"],
                    ]}
                  />
                </div>
              )}

              {activeTab === 'players' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold">Player Management</h2>
                  <TextTable
                    headers={["Player", "Points", "Rank", "Villages", "Status", "Actions"]}
                    rows={players.map((player) => [
                      player.playerName,
                      player.totalPoints?.toLocaleString() || "0",
                      player.rank?.toString() || "-",
                      player.villages?.length?.toString() || "0",
                      player.isDeleted ? "Deleted" : player.banReason ? "Banned" : "Active",
                      <div key={player.id} className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPlayerActionDialog(player, 'rename')}
                        >
                          Rename
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPlayerActionDialog(player, 'move-village')}
                        >
                          Move
                        </Button>
                        {player.banReason ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPlayerActionDialog(player, 'unban')}
                          >
                            Unban
                          </Button>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openPlayerActionDialog(player, 'ban')}
                          >
                          Ban
                        </Button>
                        )}
                      </div>,
                    ])}
                  />
                </div>
              )}

              {/* Player Action Dialog */}
              {showPlayerActionDialog && playerActions.selectedPlayer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 className="text-lg font-bold mb-4">
                      {currentPlayerAction === 'ban' && 'Ban Player'}
                      {currentPlayerAction === 'unban' && 'Unban Player'}
                      {currentPlayerAction === 'rename' && 'Rename Player'}
                      {currentPlayerAction === 'move-village' && 'Move Player Village'}
                    </h3>

                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Player: <strong>{playerActions.selectedPlayer.playerName}</strong>
                      </p>

                      {currentPlayerAction === 'ban' && (
                        <div className="space-y-2">
                          <Label htmlFor="ban-reason">Ban Reason</Label>
                          <Input
                            id="ban-reason"
                            value={playerActions.banReason}
                            onChange={(e) => setPlayerActions(prev => ({ ...prev, banReason: e.target.value }))}
                            placeholder="Enter ban reason..."
                          />
                        </div>
                      )}

                      {currentPlayerAction === 'rename' && (
                        <div className="space-y-2">
                          <Label htmlFor="new-name">New Player Name</Label>
                          <Input
                            id="new-name"
                            value={playerActions.newName}
                            onChange={(e) => setPlayerActions(prev => ({ ...prev, newName: e.target.value }))}
                            placeholder="Enter new player name..."
                          />
                        </div>
                      )}

                      {currentPlayerAction === 'move-village' && (
                        <div className="space-y-2">
                          <Label>New Village Coordinates</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              placeholder="X"
                              value={playerActions.moveX}
                              onChange={(e) => setPlayerActions(prev => ({ ...prev, moveX: e.target.value }))}
                            />
                            <Input
                              type="number"
                              placeholder="Y"
                              value={playerActions.moveY}
                              onChange={(e) => setPlayerActions(prev => ({ ...prev, moveY: e.target.value }))}
                            />
                          </div>
                        </div>
                      )}

                      {currentPlayerAction === 'unban' && (
                        <p className="text-sm">Are you sure you want to unban this player?</p>
                      )}
                    </div>

                    <div className="flex gap-2 mt-6">
                      <Button onClick={handlePlayerAction}>
                        {currentPlayerAction === 'ban' && 'Ban Player'}
                        {currentPlayerAction === 'unban' && 'Unban Player'}
                        {currentPlayerAction === 'rename' && 'Rename Player'}
                        {currentPlayerAction === 'move-village' && 'Move Village'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowPlayerActionDialog(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'world' && worldConfig && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold">World Configuration</h2>

                  {!editingWorldConfig ? (
                    <>
                  <TextTable
                    headers={["Setting", "Value"]}
                    rows={[
                      ["World Name", worldConfig.worldName || "Medieval World"],
                      ["Max X", worldConfig.maxX?.toString() || "100"],
                      ["Max Y", worldConfig.maxY?.toString() || "100"],
                      ["Speed", worldConfig.speed?.toString() || "1"],
                      ["Unit Speed", worldConfig.unitSpeed?.toString() || "1.0"],
                      ["Resource Per Tick", worldConfig.resourcePerTick?.toString() || "10"],
                      ["Production Multiplier", worldConfig.productionMultiplier?.toString() || "1.0"],
                      ["Tick Interval (minutes)", worldConfig.tickIntervalMinutes?.toString() || "5"],
                      ["Night Bonus", worldConfig.nightBonusMultiplier?.toString() || "1.2"],
                      ["Beginner Protection (hours)", worldConfig.beginnerProtectionHours?.toString() || "72"],
                          ["Beginner Protection Enabled", worldConfig.beginnerProtectionEnabled ? "Yes" : "No"],
                      ["Game Running", worldConfig.isRunning ? "Yes" : "No"],
                    ]}
                  />
                      <Button variant="outline" onClick={handleEditWorldConfig}>
                        Edit Configuration
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-4 max-w-md">
                      <div className="space-y-2">
                        <Label htmlFor="worldName">World Name</Label>
                        <Input
                          id="worldName"
                          value={worldConfigForm.worldName}
                          onChange={(e) => setWorldConfigForm({...worldConfigForm, worldName: e.target.value})}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="speed">Game Speed</Label>
                          <Input
                            id="speed"
                            type="number"
                            step="0.1"
                            value={worldConfigForm.speed}
                            onChange={(e) => setWorldConfigForm({...worldConfigForm, speed: parseFloat(e.target.value)})}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="unitSpeed">Unit Speed</Label>
                          <Input
                            id="unitSpeed"
                            type="number"
                            step="0.1"
                            value={worldConfigForm.unitSpeed}
                            onChange={(e) => setWorldConfigForm({...worldConfigForm, unitSpeed: parseFloat(e.target.value)})}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="resourcePerTick">Resources per Tick</Label>
                          <Input
                            id="resourcePerTick"
                            type="number"
                            value={worldConfigForm.resourcePerTick}
                            onChange={(e) => setWorldConfigForm({...worldConfigForm, resourcePerTick: parseInt(e.target.value)})}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="productionMultiplier">Production Multiplier</Label>
                          <Input
                            id="productionMultiplier"
                            type="number"
                            step="0.1"
                            value={worldConfigForm.productionMultiplier}
                            onChange={(e) => setWorldConfigForm({...worldConfigForm, productionMultiplier: parseFloat(e.target.value)})}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tickIntervalMinutes">Tick Interval (minutes)</Label>
                          <Input
                            id="tickIntervalMinutes"
                            type="number"
                            value={worldConfigForm.tickIntervalMinutes}
                            onChange={(e) => setWorldConfigForm({...worldConfigForm, tickIntervalMinutes: parseInt(e.target.value)})}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="nightBonusMultiplier">Night Bonus</Label>
                          <Input
                            id="nightBonusMultiplier"
                            type="number"
                            step="0.1"
                            value={worldConfigForm.nightBonusMultiplier}
                            onChange={(e) => setWorldConfigForm({...worldConfigForm, nightBonusMultiplier: parseFloat(e.target.value)})}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="beginnerProtectionHours">Beginner Protection (hours)</Label>
                          <Input
                            id="beginnerProtectionHours"
                            type="number"
                            value={worldConfigForm.beginnerProtectionHours}
                            onChange={(e) => setWorldConfigForm({...worldConfigForm, beginnerProtectionHours: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="isRunning"
                            checked={worldConfigForm.isRunning}
                            onCheckedChange={(checked) => setWorldConfigForm({...worldConfigForm, isRunning: checked})}
                          />
                          <Label htmlFor="isRunning">Game Running</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="beginnerProtectionEnabled"
                            checked={worldConfigForm.beginnerProtectionEnabled}
                            onCheckedChange={(checked) => setWorldConfigForm({...worldConfigForm, beginnerProtectionEnabled: checked})}
                          />
                          <Label htmlFor="beginnerProtectionEnabled">Beginner Protection Enabled</Label>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleSaveWorldConfig}>Save Changes</Button>
                        <Button variant="outline" onClick={handleCancelWorldConfigEdit}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'units' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold">Unit Balance</h2>
                  <p className="text-sm text-muted-foreground">
                    View and edit troop balance settings and combat statistics
                  </p>

                  {!editingUnitBalance ? (
                    <>
                      {unitBalance ? (
                        <div className="space-y-4">
                          <TextTable
                            headers={["Unit", "Health", "Attack", "Defense", "Speed", "Wood", "Stone", "Iron", "Gold", "Food"]}
                            rows={unitBalance.map((unit: any) => [
                              unit.type,
                              unit.stats.health?.toString() || "0",
                              unit.stats.attack?.toString() || "0",
                              unit.stats.defense?.toString() || "0",
                              unit.stats.speed?.toString() || "0",
                              unit.cost.wood?.toString() || "0",
                              unit.cost.stone?.toString() || "0",
                              unit.cost.iron?.toString() || "0",
                              unit.cost.gold?.toString() || "0",
                              unit.cost.food?.toString() || "0",
                            ])}
                          />
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={handleEditUnitBalance}>
                              Edit Unit Balance
                  </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No unit balance data available
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-sm text-muted-foreground">
                        Edit unit costs and combat statistics. Changes will be saved to the database.
                      </div>

                      <div className="grid gap-4">
                        {unitBalanceForm.map((unit: any, index: number) => (
                          <div key={unit.type} className="border border-border rounded-lg p-4">
                            <h3 className="font-semibold mb-3">{unit.type}</h3>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {/* Stats */}
                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Health</Label>
                                <Input
                                  type="number"
                                  value={unit.stats.health}
                                  onChange={(e) => {
                                    const newForm = [...unitBalanceForm]
                                    newForm[index].stats.health = parseInt(e.target.value) || 0
                                    setUnitBalanceForm(newForm)
                                  }}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Attack</Label>
                                <Input
                                  type="number"
                                  value={unit.stats.attack}
                                  onChange={(e) => {
                                    const newForm = [...unitBalanceForm]
                                    newForm[index].stats.attack = parseInt(e.target.value) || 0
                                    setUnitBalanceForm(newForm)
                                  }}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Defense</Label>
                                <Input
                                  type="number"
                                  value={unit.stats.defense}
                                  onChange={(e) => {
                                    const newForm = [...unitBalanceForm]
                                    newForm[index].stats.defense = parseInt(e.target.value) || 0
                                    setUnitBalanceForm(newForm)
                                  }}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Speed</Label>
                                <Input
                                  type="number"
                                  value={unit.stats.speed}
                                  onChange={(e) => {
                                    const newForm = [...unitBalanceForm]
                                    newForm[index].stats.speed = parseInt(e.target.value) || 0
                                    setUnitBalanceForm(newForm)
                                  }}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                              {/* Costs */}
                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Wood</Label>
                                <Input
                                  type="number"
                                  value={unit.cost.wood}
                                  onChange={(e) => {
                                    const newForm = [...unitBalanceForm]
                                    newForm[index].cost.wood = parseInt(e.target.value) || 0
                                    setUnitBalanceForm(newForm)
                                  }}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Stone</Label>
                                <Input
                                  type="number"
                                  value={unit.cost.stone}
                                  onChange={(e) => {
                                    const newForm = [...unitBalanceForm]
                                    newForm[index].cost.stone = parseInt(e.target.value) || 0
                                    setUnitBalanceForm(newForm)
                                  }}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Iron</Label>
                                <Input
                                  type="number"
                                  value={unit.cost.iron}
                                  onChange={(e) => {
                                    const newForm = [...unitBalanceForm]
                                    newForm[index].cost.iron = parseInt(e.target.value) || 0
                                    setUnitBalanceForm(newForm)
                                  }}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Gold</Label>
                                <Input
                                  type="number"
                                  value={unit.cost.gold}
                                  onChange={(e) => {
                                    const newForm = [...unitBalanceForm]
                                    newForm[index].cost.gold = parseInt(e.target.value) || 0
                                    setUnitBalanceForm(newForm)
                                  }}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Food</Label>
                                <Input
                                  type="number"
                                  value={unit.cost.food}
                                  onChange={(e) => {
                                    const newForm = [...unitBalanceForm]
                                    newForm[index].cost.food = parseInt(e.target.value) || 0
                                    setUnitBalanceForm(newForm)
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleSaveUnitBalance}>
                          Save Changes
                        </Button>
                        <Button variant="outline" onClick={handleCancelUnitBalanceEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'speed' && speedTemplates && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold">Speed Templates</h2>
                  <p className="text-sm text-muted-foreground">
                    Apply predefined speed configurations to adjust game pace
                  </p>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(speedTemplates).map(([templateId, template]: [string, any]) => (
                      <div key={templateId} className="border border-border rounded-lg p-4 space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg">{template.name}</h3>
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div>Game Speed: {template.speed}x</div>
                          <div>Unit Speed: {template.unitSpeed}x</div>
                          <div>Production: {template.productionMultiplier}x</div>
                          <div>Resources/Tick: {template.resourcePerTick}</div>
                          <div>Tick Interval: {template.tickIntervalMinutes} min</div>
                        </div>
                        <Button
                          onClick={() => handleApplySpeedTemplate(templateId)}
                          className="w-full"
                          variant="outline"
                        >
                          Apply Template
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'map' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold">Map Tools</h2>
                    <p className="text-sm text-muted-foreground">
                      Administrative tools for managing the game map
                    </p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                    {/* Spawn Barbarian */}
                    <div className="border border-border rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold">Spawn Barbarian Village</h3>
                      <p className="text-sm text-muted-foreground">Create a barbarian village at specified coordinates</p>

                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="barb-x" className="text-xs">X Coordinate</Label>
                            <Input
                              id="barb-x"
                              type="number"
                              value={mapToolsForm.spawnBarbarian.x}
                              onChange={(e) => setMapToolsForm(prev => ({
                                ...prev,
                                spawnBarbarian: { ...prev.spawnBarbarian, x: e.target.value }
                              }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="barb-y" className="text-xs">Y Coordinate</Label>
                            <Input
                              id="barb-y"
                              type="number"
                              value={mapToolsForm.spawnBarbarian.y}
                              onChange={(e) => setMapToolsForm(prev => ({
                                ...prev,
                                spawnBarbarian: { ...prev.spawnBarbarian, y: e.target.value }
                              }))}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="warriors" className="text-xs">Warriors</Label>
                            <Input
                              id="warriors"
                              type="number"
                              value={mapToolsForm.spawnBarbarian.warriors}
                              onChange={(e) => setMapToolsForm(prev => ({
                                ...prev,
                                spawnBarbarian: { ...prev.spawnBarbarian, warriors: e.target.value }
                              }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="spearmen" className="text-xs">Spearmen</Label>
                            <Input
                              id="spearmen"
                              type="number"
                              value={mapToolsForm.spawnBarbarian.spearmen}
                              onChange={(e) => setMapToolsForm(prev => ({
                                ...prev,
                                spawnBarbarian: { ...prev.spawnBarbarian, spearmen: e.target.value }
                              }))}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="bowmen" className="text-xs">Bowmen</Label>
                            <Input
                              id="bowmen"
                              type="number"
                              value={mapToolsForm.spawnBarbarian.bowmen}
                              onChange={(e) => setMapToolsForm(prev => ({
                                ...prev,
                                spawnBarbarian: { ...prev.spawnBarbarian, bowmen: e.target.value }
                              }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="horsemen" className="text-xs">Horsemen</Label>
                            <Input
                              id="horsemen"
                              type="number"
                              value={mapToolsForm.spawnBarbarian.horsemen}
                              onChange={(e) => setMapToolsForm(prev => ({
                                ...prev,
                                spawnBarbarian: { ...prev.spawnBarbarian, horsemen: e.target.value }
                              }))}
                            />
                          </div>
                        </div>

                        <Button onClick={handleSpawnBarbarian} className="w-full" variant="outline">
                          Spawn Barbarian
                        </Button>
                      </div>
                    </div>

                    {/* Relocate Tile */}
                    <div className="border border-border rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold">Relocate Village</h3>
                      <p className="text-sm text-muted-foreground">Move any village to new coordinates</p>

                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs">Current Position</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="X"
                              type="number"
                              value={mapToolsForm.relocateTile.oldX}
                              onChange={(e) => setMapToolsForm(prev => ({
                                ...prev,
                                relocateTile: { ...prev.relocateTile, oldX: e.target.value }
                              }))}
                            />
                            <Input
                              placeholder="Y"
                              type="number"
                              value={mapToolsForm.relocateTile.oldY}
                              onChange={(e) => setMapToolsForm(prev => ({
                                ...prev,
                                relocateTile: { ...prev.relocateTile, oldY: e.target.value }
                              }))}
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs">New Position</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="X"
                              type="number"
                              value={mapToolsForm.relocateTile.newX}
                              onChange={(e) => setMapToolsForm(prev => ({
                                ...prev,
                                relocateTile: { ...prev.relocateTile, newX: e.target.value }
                              }))}
                            />
                            <Input
                              placeholder="Y"
                              type="number"
                              value={mapToolsForm.relocateTile.newY}
                              onChange={(e) => setMapToolsForm(prev => ({
                                ...prev,
                                relocateTile: { ...prev.relocateTile, newY: e.target.value }
                              }))}
                            />
                          </div>
                        </div>

                        <Button onClick={handleRelocateTile} className="w-full" variant="outline">
                          Relocate Tile
                        </Button>
                      </div>
                    </div>

                    {/* Wipe Empty */}
                    <div className="border border-border rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold">Wipe Empty Villages</h3>
                      <p className="text-sm text-muted-foreground">Delete villages with minimal buildings and resources</p>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-wipe" className="text-xs">
                          Type "WIPE_EMPTY_VILLAGES" to confirm
                        </Label>
                        <Input
                          id="confirm-wipe"
                          value={mapToolsForm.wipeEmpty.confirmText}
                          onChange={(e) => setMapToolsForm(prev => ({
                            ...prev,
                            wipeEmpty: { confirmText: e.target.value }
                          }))}
                          placeholder="WIPE_EMPTY_VILLAGES"
                        />

                        <Button
                          onClick={handleWipeEmpty}
                          className="w-full"
                          variant="destructive"
                          disabled={mapToolsForm.wipeEmpty.confirmText !== 'WIPE_EMPTY_VILLAGES'}
                        >
                          Wipe Empty Villages
                  </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'mapviz' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold">Map Visualization</h2>
                    <p className="text-sm text-muted-foreground">
                      Interactive world map showing all villages, barbarians, and game statistics
                    </p>
                  </div>

                  {mapVisualization ? (
                    <div className="space-y-6">
                      {/* Map Statistics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-card border border-border rounded-lg p-4">
                          <div className="text-2xl font-bold text-blue-600">{mapVisualization.stats.totalVillages}</div>
                          <div className="text-sm text-muted-foreground">Total Villages</div>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-4">
                          <div className="text-2xl font-bold text-green-600">{mapVisualization.stats.playerVillages}</div>
                          <div className="text-sm text-muted-foreground">Player Villages</div>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-4">
                          <div className="text-2xl font-bold text-red-600">{mapVisualization.stats.barbarianVillages}</div>
                          <div className="text-sm text-muted-foreground">Barbarian Camps</div>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-4">
                          <div className="text-2xl font-bold text-yellow-600">{mapVisualization.stats.bannedPlayers}</div>
                          <div className="text-sm text-muted-foreground">Banned Players</div>
                        </div>
                      </div>

                      {/* World Info */}
                      <div className="bg-card border border-border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">World Information</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div><span className="font-medium">World:</span> {mapVisualization.worldConfig.name}</div>
                          <div><span className="font-medium">Size:</span> {mapVisualization.worldConfig.maxX} x {mapVisualization.worldConfig.maxY}</div>
                          <div><span className="font-medium">Speed:</span> {mapVisualization.worldConfig.speed}x</div>
                          <div><span className="font-medium">Status:</span>
                            <span className={mapVisualization.worldConfig.isRunning ? "text-green-600" : "text-red-600"}>
                              {mapVisualization.worldConfig.isRunning ? "Running" : "Paused"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Villages List */}
                      <div className="space-y-4">
                        <h3 className="font-semibold">Villages Overview</h3>
                        <div className="bg-card border border-border rounded-lg overflow-hidden">
                          <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="px-4 py-2 text-left">Village</th>
                                  <th className="px-4 py-2 text-left">Owner</th>
                                  <th className="px-4 py-2 text-left">Position</th>
                                  <th className="px-4 py-2 text-left">Buildings</th>
                                  <th className="px-4 py-2 text-left">Resources</th>
                                  <th className="px-4 py-2 text-left">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {mapVisualization.villages.slice(0, 50).map((village: any) => (
                                  <tr key={village.id} className="border-t border-border">
                                    <td className="px-4 py-2">
                                      <div>
                                        <div className="font-medium">{village.name}</div>
                                        {village.isCapital && <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">Capital</span>}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2">
                                      {village.player ? (
                                        <div>
                                          <div className="font-medium">{village.player.name}</div>
                                          {village.player.isBanned && <span className="text-xs text-red-600">Banned</span>}
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">Abandoned</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2">({village.x}, {village.y})</td>
                                    <td className="px-4 py-2">
                                      <div>
                                        <div>{village.buildings} buildings</div>
                                        <div className="text-xs text-muted-foreground">Level {village.totalBuildingLevels}</div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2">
                                      <div className="text-xs">
                                        {village.totalResources.toLocaleString()} total
                                      </div>
                                    </td>
                                    <td className="px-4 py-2">
                                      <div className="flex gap-1">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                          village.loyalty >= 80 ? 'bg-green-100 text-green-800' :
                                          village.loyalty >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-red-100 text-red-800'
                                        }`}>
                                          Loyalty: {village.loyalty}%
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        {mapVisualization.villages.length > 50 && (
                          <div className="text-sm text-muted-foreground text-center">
                            Showing first 50 villages. Total: {mapVisualization.villages.length}
                          </div>
                        )}
                      </div>

                      {/* Barbarians List */}
                      {mapVisualization.barbarians.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="font-semibold">Barbarian Camps</h3>
                          <div className="bg-card border border-border rounded-lg overflow-hidden">
                            <div className="max-h-64 overflow-y-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-muted">
                                  <tr>
                                    <th className="px-4 py-2 text-left">Position</th>
                                    <th className="px-4 py-2 text-left">Troops</th>
                                    <th className="px-4 py-2 text-left">Last Attack</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {mapVisualization.barbarians.map((barbarian: any) => (
                                    <tr key={barbarian.id} className="border-t border-border">
                                      <td className="px-4 py-2">({barbarian.x}, {barbarian.y})</td>
                                      <td className="px-4 py-2">
                                        <div className="text-xs">
                                          <div>Warriors: {barbarian.troops.warriors}</div>
                                          <div>Spearmen: {barbarian.troops.spearmen}</div>
                                          <div>Bowmen: {barbarian.troops.bowmen}</div>
                                          <div>Horsemen: {barbarian.troops.horsemen}</div>
                                          <div className="font-medium">Total: {barbarian.totalTroops}</div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-2">
                                        {barbarian.lastAttacked ?
                                          new Date(barbarian.lastAttacked).toLocaleDateString() :
                                          'Never'
                                        }
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading map data...
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-bold">Notifications</h2>
                      <p className="text-sm text-muted-foreground">
                        System alerts and important administrative notifications
                      </p>
                    </div>
                    {notifications?.unreadCount > 0 && (
                      <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                        {notifications.unreadCount} unread
                      </div>
                    )}
                  </div>

                  {notifications ? (
                    <div className="space-y-4">
                      {/* Notification Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-card border border-border rounded-lg p-4">
                          <div className="text-2xl font-bold text-blue-600">{notifications.total}</div>
                          <div className="text-sm text-muted-foreground">Total Notifications</div>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-4">
                          <div className="text-2xl font-bold text-red-600">{notifications.unreadCount}</div>
                          <div className="text-sm text-muted-foreground">Unread</div>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-4">
                          <div className="text-2xl font-bold text-yellow-600">
                            {notifications.notifications.filter((n: any) => n.severity === 'warning').length}
                          </div>
                          <div className="text-sm text-muted-foreground">Warnings</div>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-4">
                          <div className="text-2xl font-bold text-red-700">
                            {notifications.notifications.filter((n: any) => n.severity === 'critical').length}
                          </div>
                          <div className="text-sm text-muted-foreground">Critical</div>
                        </div>
                      </div>

                      {/* Notifications List */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold">Recent Notifications</h3>
                          <Button variant="outline" size="sm">
                            Create Notification
                          </Button>
                        </div>

                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {notifications.notifications.length > 0 ? (
                            notifications.notifications.map((notification: any) => (
                              <div
                                key={notification.id}
                                className={`border border-border rounded-lg p-4 ${
                                  !notification.isRead ? 'bg-blue-50 border-blue-200' : 'bg-card'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      notification.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                      notification.severity === 'error' ? 'bg-red-100 text-red-800' :
                                      notification.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      {notification.severity.toUpperCase()}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {notification.type}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {!notification.isRead && (
                                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(notification.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                </div>

                                <h4 className="font-medium mb-1">{notification.title}</h4>
                                <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>

                                <div className="flex justify-between items-center">
                                  <div className="text-xs text-muted-foreground">
                                    Created by: {notification.createdBy}
                                  </div>
                                  <div className="flex gap-1">
                                    {!notification.isRead && (
                                      <Button variant="outline" size="sm">
                                        Mark as Read
                                      </Button>
                                    )}
                                    {notification.targetId && (
                                      <Button variant="outline" size="sm">
                                        View Details
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              No notifications found
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading notifications...
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold">Player Analytics & Reporting</h2>
                    <p className="text-sm text-muted-foreground">
                      Comprehensive insights into player behavior, village development, and game statistics
                    </p>
                  </div>

                  {analytics ? (
                    <div className="space-y-6">
                      {/* Overview Statistics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-card border border-border rounded-lg p-4">
                          <div className="text-2xl font-bold text-blue-600">{analytics.overview.totalPlayers}</div>
                          <div className="text-sm text-muted-foreground">Total Players</div>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-4">
                          <div className="text-2xl font-bold text-green-600">{analytics.overview.activePlayers}</div>
                          <div className="text-sm text-muted-foreground">Active Players</div>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-4">
                          <div className="text-2xl font-bold text-red-600">{analytics.overview.bannedPlayers}</div>
                          <div className="text-sm text-muted-foreground">Banned Players</div>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-4">
                          <div className="text-2xl font-bold text-yellow-600">{analytics.overview.totalVillages}</div>
                          <div className="text-sm text-muted-foreground">Total Villages</div>
                        </div>
                      </div>

                      {/* Resource Statistics */}
                      <div className="bg-card border border-border rounded-lg p-4">
                        <h3 className="font-semibold mb-3">Global Resource Pool</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-lg font-bold text-amber-600">{analytics.overview.totalResources.wood.toLocaleString()}</div>
                            <div className="text-muted-foreground">Wood</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-600">{analytics.overview.totalResources.stone.toLocaleString()}</div>
                            <div className="text-muted-foreground">Stone</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-700">{analytics.overview.totalResources.iron.toLocaleString()}</div>
                            <div className="text-muted-foreground">Iron</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-500">{analytics.overview.totalResources.gold.toLocaleString()}</div>
                            <div className="text-muted-foreground">Gold</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{analytics.overview.totalResources.food.toLocaleString()}</div>
                            <div className="text-muted-foreground">Food</div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border text-center">
                          <div className="text-xl font-bold text-blue-600">{analytics.overview.totalResourceValue.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Total Resource Value</div>
                        </div>
                      </div>

                      {/* Activity Analysis */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-card border border-border rounded-lg p-4">
                          <h3 className="font-semibold mb-3">Player Activity (30 Days)</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Active Players:</span>
                              <span className="font-semibold text-green-600">{analytics.activity.activeInLast30Days}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Inactive Players:</span>
                              <span className="font-semibold text-red-600">{analytics.activity.inactivePlayers}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>New Players:</span>
                              <span className="font-semibold text-blue-600">{analytics.activity.newPlayersThisMonth}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Avg Villages/Player:</span>
                              <span className="font-semibold">{analytics.development.averageVillagesPerPlayer}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-card border border-border rounded-lg p-4">
                          <h3 className="font-semibold mb-3">Geography Overview</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Continents:</span>
                              <span className="font-semibold">{analytics.geography.continentCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Barbarian Camps:</span>
                              <span className="font-semibold text-red-600">{analytics.overview.barbarianVillages}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Barbarian Troops:</span>
                              <span className="font-semibold text-red-600">{analytics.overview.totalBarbarianTroops.toLocaleString()}</span>
                            </div>
                            {analytics.geography.mostPopulatedContinent && (
                              <div className="flex justify-between">
                                <span>Most Populated:</span>
                                <span className="font-semibold text-xs">{analytics.geography.mostPopulatedContinent.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Top Players */}
                      <div className="space-y-4">
                        <h3 className="font-semibold">Top Players by Points</h3>
                        <div className="bg-card border border-border rounded-lg overflow-hidden">
                          <div className="max-h-80 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="px-4 py-2 text-left">Player</th>
                                  <th className="px-4 py-2 text-left">Points</th>
                                  <th className="px-4 py-2 text-left">Villages</th>
                                  <th className="px-4 py-2 text-left">Activity</th>
                                  <th className="px-4 py-2 text-left">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analytics.activity.topPlayers.map((player: any, index: number) => (
                                  <tr key={player.id} className="border-t border-border">
                                    <td className="px-4 py-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">#{index + 1}</span>
                                        <span>{player.name}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 font-semibold">{player.totalPoints.toLocaleString()}</td>
                                    <td className="px-4 py-2">{player.villageCount}</td>
                                    <td className="px-4 py-2">
                                      {player.daysSinceActive === null ? (
                                        <span className="text-gray-500">Never</span>
                                      ) : player.daysSinceActive === 0 ? (
                                        <span className="text-green-600">Today</span>
                                      ) : (
                                        <span className={player.daysSinceActive > 30 ? 'text-red-600' : 'text-yellow-600'}>
                                          {player.daysSinceActive}d ago
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2">
                                      <div className="flex gap-1">
                                        {player.isActiveRecently && (
                                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Active</span>
                                        )}
                                        {player.hasUserAccount && (
                                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Registered</span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Development Insights */}
                      <div className="space-y-4">
                        <h3 className="font-semibold">Development Insights</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-card border border-border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Village Distribution</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>Active Villages:</span>
                                <span className="font-semibold">{analytics.overview.activeVillages}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Empty Villages:</span>
                                <span className="font-semibold text-gray-600">{analytics.overview.emptyVillages}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Avg Points/Player:</span>
                                <span className="font-semibold">{analytics.development.averagePointsPerPlayer.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-card border border-border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Resource Distribution</h4>
                            <div className="text-sm">
                              <p className="text-muted-foreground mb-2">
                                Top 10% of villages hold the most resources, indicating successful players.
                              </p>
                              <div className="text-xs text-muted-foreground">
                                Resource inequality analysis shows healthy game progression.
                              </div>
                            </div>
                          </div>

                          <div className="bg-card border border-border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Continental Balance</h4>
                            <div className="space-y-1 text-sm">
                              {analytics.geography.continents.slice(0, 3).map((continent: any) => (
                                <div key={continent.id} className="flex justify-between">
                                  <span>{continent.name}:</span>
                                  <span className="font-semibold">{continent.villageCount} villages</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading analytics data...
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'maintenance' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold">System Maintenance</h2>
                    <p className="text-sm text-muted-foreground">
                      Server maintenance, cleanup operations, and system health monitoring
                    </p>
                  </div>

                  {maintenance ? (
                    <div className="space-y-6">
                      {/* Server Health */}
                      <div className="bg-card border border-border rounded-lg p-4">
                        <h3 className="font-semibold mb-3">Server Health</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">{maintenance.server.uptime}s</div>
                            <div className="text-muted-foreground">Uptime</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{maintenance.server.memoryUsed}MB</div>
                            <div className="text-muted-foreground">Memory Used</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-600">{maintenance.server.memoryTotal}MB</div>
                            <div className="text-muted-foreground">Memory Total</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-purple-600">{maintenance.server.nodeVersion}</div>
                            <div className="text-muted-foreground">Node Version</div>
                          </div>
                        </div>
                      </div>

                      {/* Maintenance Mode */}
                      <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-semibold">Maintenance Mode</h3>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={maintenance.maintenance?.isActive ? "destructive" : "outline"}
                              onClick={() => handleMaintenanceAction('toggle')}
                            >
                              {maintenance.maintenance?.isActive ? 'Disable' : 'Enable'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMaintenanceAction('cleanup')}
                            >
                              Run Cleanup
                            </Button>
                          </div>
                        </div>

                        {maintenance.maintenance?.isActive ? (
                          <div className="bg-red-50 border border-red-200 rounded p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                              <span className="font-medium text-red-800">Maintenance Mode Active</span>
                            </div>
                            <p className="text-red-700 mb-2">{maintenance.maintenance.message}</p>
                            {maintenance.maintenance.estimatedEndTime && (
                              <p className="text-sm text-red-600">
                                Estimated end: {new Date(maintenance.maintenance.estimatedEndTime).toLocaleString()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-muted-foreground">
                            Maintenance mode is currently disabled. Server is operating normally.
                          </div>
                        )}
                      </div>

                      {/* Recent Cleanups */}
                      <div className="space-y-4">
                        <h3 className="font-semibold">Recent Cleanup Operations</h3>
                        <div className="bg-card border border-border rounded-lg overflow-hidden">
                          <div className="max-h-64 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="px-4 py-2 text-left">Action</th>
                                  <th className="px-4 py-2 text-left">Details</th>
                                  <th className="px-4 py-2 text-left">Admin</th>
                                  <th className="px-4 py-2 text-left">Timestamp</th>
                                </tr>
                              </thead>
                              <tbody>
                                {maintenance.cleanups.map((cleanup: any) => (
                                  <tr key={cleanup.id} className="border-t border-border">
                                    <td className="px-4 py-2 font-medium">{cleanup.action.replace(/_/g, ' ')}</td>
                                    <td className="px-4 py-2">{cleanup.details}</td>
                                    <td className="px-4 py-2">{cleanup.admin}</td>
                                    <td className="px-4 py-2">{new Date(cleanup.timestamp).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {maintenance.cleanups.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              No cleanup operations found
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading maintenance data...
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'messaging' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold">Admin Messaging</h2>
                    <p className="text-sm text-muted-foreground">
                      Send messages to players and manage admin communications
                    </p>
                  </div>

                  {messaging ? (
                    <div className="space-y-6">
                      {/* Send Message Form */}
                      <div className="bg-card border border-border rounded-lg p-4">
                        <h3 className="font-semibold mb-3">Send Message</h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="playerId">Player ID</Label>
                              <Input
                                id="playerId"
                                placeholder="Enter player ID"
                                value={messageForm.playerId}
                                onChange={(e) => setMessageForm({...messageForm, playerId: e.target.value})}
                              />
                            </div>
                            <div>
                              <Label htmlFor="subject">Subject</Label>
                              <Input
                                id="subject"
                                placeholder="Message subject"
                                value={messageForm.subject}
                                onChange={(e) => setMessageForm({...messageForm, subject: e.target.value})}
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="message">Message</Label>
                            <textarea
                              id="message"
                              className="w-full min-h-24 p-2 border border-border rounded-md"
                              placeholder="Enter your message..."
                              value={messageForm.message}
                              onChange={(e) => setMessageForm({...messageForm, message: e.target.value})}
                            />
                          </div>
                          <Button onClick={handleSendMessage}>
                            Send Message
                          </Button>
                        </div>
                      </div>

                      {/* Message History */}
                      <div className="space-y-4">
                        <h3 className="font-semibold">Message History</h3>
                        <div className="bg-card border border-border rounded-lg overflow-hidden">
                          <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="px-4 py-2 text-left">To</th>
                                  <th className="px-4 py-2 text-left">Subject</th>
                                  <th className="px-4 py-2 text-left">Status</th>
                                  <th className="px-4 py-2 text-left">Sent</th>
                                </tr>
                              </thead>
                              <tbody>
                                {messaging.messages.map((msg: any) => (
                                  <tr key={msg.id} className="border-t border-border">
                                    <td className="px-4 py-2">
                                      <div>
                                        <div className="font-medium">{msg.toPlayer.name}</div>
                                        {msg.toPlayer.isDeleted && <span className="text-xs text-red-600">Deleted</span>}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2">{msg.subject}</td>
                                    <td className="px-4 py-2">
                                      <span className={`px-2 py-1 rounded text-xs ${
                                        msg.isRead ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {msg.isRead ? 'Read' : 'Unread'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2">{new Date(msg.createdAt).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {messaging.messages.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              No messages sent yet
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading messaging data...
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'search' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold">Advanced Player Search</h2>
                    <p className="text-sm text-muted-foreground">
                      Powerful search and filtering tools for finding specific players
                    </p>
                  </div>

                  {/* Search Form */}
                  <div className="bg-card border border-border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Search Filters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="searchQuery">General Search</Label>
                        <Input
                          id="searchQuery"
                          placeholder="Player name, email, or display name"
                          value={searchForm.q}
                          onChange={(e) => setSearchForm({...searchForm, q: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="playerName">Player Name</Label>
                        <Input
                          id="playerName"
                          placeholder="Exact player name"
                          value={searchForm.playerName}
                          onChange={(e) => setSearchForm({...searchForm, playerName: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          placeholder="Player email"
                          value={searchForm.email}
                          onChange={(e) => setSearchForm({...searchForm, email: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="minPoints">Min Points</Label>
                        <Input
                          id="minPoints"
                          type="number"
                          placeholder="0"
                          value={searchForm.minPoints}
                          onChange={(e) => setSearchForm({...searchForm, minPoints: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxPoints">Max Points</Label>
                        <Input
                          id="maxPoints"
                          type="number"
                          placeholder="999999"
                          value={searchForm.maxPoints}
                          onChange={(e) => setSearchForm({...searchForm, maxPoints: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="hasUserAccount">Account Type</Label>
                        <select
                          className="w-full p-2 border border-border rounded-md"
                          value={searchForm.hasUserAccount}
                          onChange={(e) => setSearchForm({...searchForm, hasUserAccount: e.target.value})}
                        >
                          <option value="">All</option>
                          <option value="true">Has Account</option>
                          <option value="false">No Account</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="isBanned">Ban Status</Label>
                        <select
                          className="w-full p-2 border border-border rounded-md"
                          value={searchForm.isBanned}
                          onChange={(e) => setSearchForm({...searchForm, isBanned: e.target.value})}
                        >
                          <option value="">All</option>
                          <option value="true">Banned</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="isDeleted">Deletion Status</Label>
                        <select
                          className="w-full p-2 border border-border rounded-md"
                          value={searchForm.isDeleted}
                          onChange={(e) => setSearchForm({...searchForm, isDeleted: e.target.value})}
                        >
                          <option value="">All</option>
                          <option value="false">Active</option>
                          <option value="true">Deleted</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button onClick={handleSearch}>
                        Search
                      </Button>
                      <Button variant="outline" onClick={() => setSearchForm({
                        q: '', playerName: '', email: '', minPoints: '', maxPoints: '',
                        hasUserAccount: '', isBanned: '', isDeleted: ''
                      })}>
                        Clear Filters
                      </Button>
                    </div>
                  </div>

                  {/* Search Results */}
                  {search && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold">Search Results ({search.pagination.total} players)</h3>
                        {search.pagination.pages > 1 && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!search.pagination.hasPrev}
                              onClick={() => handleSearchPage(search.pagination.page - 1)}
                            >
                              Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Page {search.pagination.page} of {search.pagination.pages}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!search.pagination.hasNext}
                              onClick={() => handleSearchPage(search.pagination.page + 1)}
                            >
                              Next
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="bg-card border border-border rounded-lg overflow-hidden">
                        <div className="max-h-96 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-4 py-2 text-left">Player</th>
                                <th className="px-4 py-2 text-left">Points</th>
                                <th className="px-4 py-2 text-left">Villages</th>
                                <th className="px-4 py-2 text-left">Status</th>
                                <th className="px-4 py-2 text-left">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {search.players.map((player: any) => (
                                <tr key={player.id} className="border-t border-border">
                                  <td className="px-4 py-2">
                                    <div>
                                      <div className="font-medium">{player.playerName}</div>
                                      {player.user && (
                                        <div className="text-xs text-muted-foreground">{player.user.email}</div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 font-semibold">{player.totalPoints.toLocaleString()}</td>
                                  <td className="px-4 py-2">{player.villageCount}</td>
                                  <td className="px-4 py-2">
                                    <div className="flex gap-1">
                                      {player.isDeleted && (
                                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Deleted</span>
                                      )}
                                      {player.banReason && (
                                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Banned</span>
                                      )}
                                      {player.hasUserAccount && (
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Account</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2">
                                    <Button size="sm" variant="outline" onClick={() => handlePlayerAction('view', player)}>
                                      View
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {search.players.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            No players found matching your search criteria
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'errors' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold">Error Logs</h2>
                  <p className="text-sm text-muted-foreground">
                    Recent system errors and issues
                  </p>

                  {errorLogs && errorLogs.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {errorLogs.map((error: any, index: number) => (
                        <div key={index} className="border border-border rounded p-3">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-mono text-red-600">{error.timestamp || 'Unknown time'}</span>
                            <span className="text-xs text-muted-foreground">{error.level || 'ERROR'}</span>
                          </div>
                          <div className="text-sm">{error.message || 'No message'}</div>
                          {error.stack && (
                            <details className="mt-2">
                              <summary className="text-xs cursor-pointer text-muted-foreground">Stack trace</summary>
                              <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-x-auto">{error.stack}</pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No recent errors
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'npc-merchant' && (
                <NpcMerchantAdmin />
              )}

              {activeTab === 'cancel-stats' && (
                <CancelStats />
              )}

              {activeTab === 'game-worlds' && (
                <GameWorldManager />
              )}

              {activeTab === 'speed-config' && (
                <SpeedConfiguration />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
