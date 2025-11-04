import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { prisma } from '@/lib/db'
import jwt from 'jsonwebtoken'

interface AdminWebSocket extends WebSocket {
  adminId?: string
  userId?: string
  isAlive?: boolean
}

class AdminWebSocketServer {
  private wss: WebSocketServer | null = null
  private clients: Set<AdminWebSocket> = new Set()
  private statsInterval: NodeJS.Timeout | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null

  start(port: number = 8080) {
    if (this.wss) {
      console.log('[WebSocket] Server already running')
      return
    }

    this.wss = new WebSocketServer({
      port,
      perMessageDeflate: false,
      verifyClient: this.verifyClient.bind(this)
    })

    this.wss.on('connection', this.handleConnection.bind(this))
    this.wss.on('error', (error) => {
      console.error('[WebSocket] Server error:', error)
    })

    // Start broadcasting real-time stats
    this.startStatsBroadcasting()

    // Start heartbeat to detect dead connections
    this.startHeartbeat()

    console.log(`[WebSocket] Admin WebSocket server started on port ${port}`)
  }

  stop() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
      this.statsInterval = null
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.wss) {
      this.wss.close()
      this.wss = null
      console.log('[WebSocket] Admin WebSocket server stopped')
    }
  }

  private async verifyClient(info: { origin: string; secure: boolean; req: IncomingMessage }): Promise<boolean> {
    try {
      const token = info.req.headers.authorization?.replace('Bearer ', '')
      if (!token) return false

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any
      if (!decoded.userId) return false

      // Verify user is admin
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { admin: true }
      })

      return !!(user && user.admin)
    } catch (error) {
      console.error('[WebSocket] Client verification failed:', error)
      return false
    }
  }

  private handleConnection(ws: AdminWebSocket, request: IncomingMessage) {
    try {
      // Extract token from request
      const token = request.headers.authorization?.replace('Bearer ', '')
      if (!token) {
        ws.close(1008, 'Authentication required')
        return
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any
      ws.adminId = decoded.adminId || decoded.userId // Fallback for different token formats
      ws.userId = decoded.userId
      ws.isAlive = true

      this.clients.add(ws)
      console.log(`[WebSocket] Admin client connected: ${ws.adminId}`)

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to admin WebSocket server',
        timestamp: new Date().toISOString()
      }))

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleMessage(ws, message)
        } catch (error) {
          console.error('[WebSocket] Invalid message:', error)
        }
      })

      // Handle pong responses for heartbeat
      ws.on('pong', () => {
        ws.isAlive = true
      })

      // Handle disconnection
      ws.on('close', () => {
        this.clients.delete(ws)
        console.log(`[WebSocket] Admin client disconnected: ${ws.adminId}`)
      })

      ws.on('error', (error) => {
        console.error(`[WebSocket] Client error for ${ws.adminId}:`, error)
        this.clients.delete(ws)
      })

    } catch (error) {
      console.error('[WebSocket] Connection error:', error)
      ws.close(1008, 'Authentication failed')
    }
  }

  private handleMessage(ws: AdminWebSocket, message: any) {
    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }))
        break

      case 'subscribe':
        // Client wants to subscribe to specific updates
        ws.send(JSON.stringify({
          type: 'subscribed',
          subscriptions: message.subscriptions || ['stats'],
          timestamp: new Date().toISOString()
        }))
        break

      default:
        console.log(`[WebSocket] Unknown message type: ${message.type}`)
    }
  }

  private async startStatsBroadcasting() {
    this.statsInterval = setInterval(async () => {
      try {
        const stats = await this.getRealTimeStats()

        // Broadcast to all connected admin clients
        const message = JSON.stringify({
          type: 'stats_update',
          data: stats,
          timestamp: new Date().toISOString()
        })

        let sentCount = 0
        for (const client of this.clients) {
          if (client.readyState === WebSocket.OPEN) {
            try {
              client.send(message)
              sentCount++
            } catch (error) {
              console.error('[WebSocket] Failed to send to client:', error)
              this.clients.delete(client)
            }
          }
        }

        if (sentCount > 0) {
          console.log(`[WebSocket] Broadcasted stats to ${sentCount} admin clients`)
        }

      } catch (error) {
        console.error('[WebSocket] Stats broadcasting error:', error)
      }
    }, 5000) // Update every 5 seconds
  }

  private async getRealTimeStats() {
    try {
      // Get real-time statistics
      const [
        onlineUsers,
        activePlayers,
        totalPlayers,
        totalVillages,
        recentActions,
        systemHealth
      ] = await Promise.all([
        // Online users (simulated - in real app would track active sessions)
        prisma.user.count({
          where: {
            lastActiveAt: {
              gte: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
            }
          }
        }),

        // Active players (not banned, have villages)
        prisma.player.count({
          where: {
            isDeleted: false,
            villages: { some: {} },
            updatedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        }),

        // Total players
        prisma.player.count(),

        // Total villages
        prisma.village.count(),

        // Recent admin actions (last 5 minutes)
        prisma.auditLog.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000)
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            admin: {
              include: {
                user: true
              }
            }
          }
        }),

        // System health metrics
        this.getSystemHealth()
      ])

      return {
        online: {
          users: onlineUsers,
          players: activePlayers
        },
        totals: {
          players: totalPlayers,
          villages: totalVillages
        },
        activity: {
          recentActions: recentActions.map(action => ({
            id: action.id,
            action: action.action,
            admin: action.admin?.user?.displayName || action.admin?.user?.username || 'Unknown',
            targetType: action.targetType,
            targetId: action.targetId,
            timestamp: action.createdAt.toISOString()
          }))
        },
        system: systemHealth,
        serverTime: new Date().toISOString()
      }

    } catch (error) {
      console.error('[WebSocket] Error getting real-time stats:', error)
      return {
        error: 'Failed to fetch real-time statistics',
        serverTime: new Date().toISOString()
      }
    }
  }

  private async getSystemHealth() {
    try {
      // Database connection health
      const dbStart = Date.now()
      await prisma.player.count()
      const dbLatency = Date.now() - dbStart

      // Memory usage
      const memUsage = process.memoryUsage()

      // Uptime
      const uptime = process.uptime()

      return {
        database: {
          status: dbLatency < 1000 ? 'healthy' : 'slow',
          latency: dbLatency
        },
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024)
        },
        uptime: Math.round(uptime),
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      for (const client of this.clients) {
        if (client.isAlive === false) {
          console.log(`[WebSocket] Terminating dead connection: ${client.adminId}`)
          client.terminate()
          this.clients.delete(client)
          continue
        }

        client.isAlive = false
        client.ping()
      }
    }, 30000) // Check every 30 seconds
  }

  // Method to broadcast custom messages to all clients
  broadcast(message: any) {
    const messageStr = JSON.stringify({
      type: 'broadcast',
      ...message,
      timestamp: new Date().toISOString()
    })

    let sentCount = 0
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr)
          sentCount++
        } catch (error) {
          console.error('[WebSocket] Broadcast error:', error)
          this.clients.delete(client)
        }
      }
    }

    console.log(`[WebSocket] Broadcasted message to ${sentCount} clients`)
  }

  // Get connection count
  getConnectionCount(): number {
    return this.clients.size
  }
}

// Export singleton instance
export const adminWebSocket = new AdminWebSocketServer()
