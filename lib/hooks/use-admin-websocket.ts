import { useEffect, useRef, useState, useCallback } from 'react'

interface WebSocketMessage {
  type: string
  data?: any
  timestamp: string
  [key: string]: any
}

interface UseAdminWebSocketOptions {
  url?: string
  enabled?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export function useAdminWebSocket(options: UseAdminWebSocketOptions = {}) {
  const {
    url = 'ws://localhost:8080',
    enabled = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const getAuthToken = useCallback(() => {
    return localStorage.getItem('adminToken')
  }, [])

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setIsConnecting(true)
    setConnectionError(null)

    try {
      const token = getAuthToken()
      if (!token) {
        setConnectionError('No authentication token available')
        setIsConnecting(false)
        return
      }

      const wsUrl = `${url}?token=${encodeURIComponent(token)}`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[WebSocket] Connected to admin WebSocket server')
        setIsConnected(true)
        setIsConnecting(false)
        setConnectionError(null)
        reconnectAttemptsRef.current = 0

        // Send initial subscription
        ws.send(JSON.stringify({
          type: 'subscribe',
          subscriptions: ['stats', 'notifications']
        }))
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          setLastMessage(message)

          // Handle different message types
          switch (message.type) {
            case 'stats_update':
              setStats(message.data)
              break

            case 'connected':
              console.log('[WebSocket] Connection confirmed:', message.message)
              break

            case 'subscribed':
              console.log('[WebSocket] Subscribed to:', message.subscriptions)
              break

            case 'pong':
              // Heartbeat response - ignore
              break

            case 'broadcast':
              console.log('[WebSocket] Broadcast received:', message)
              break

            default:
              console.log('[WebSocket] Received message:', message.type, message)
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error)
        }
      }

      ws.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', event.code, event.reason)
        setIsConnected(false)
        setIsConnecting(false)
        wsRef.current = null

        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          console.log(`[WebSocket] Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`)

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        } else if (event.code !== 1000) {
          setConnectionError(`Connection failed after ${maxReconnectAttempts} attempts`)
        }
      }

      ws.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error)
        setConnectionError('WebSocket connection error')
        setIsConnecting(false)
      }

    } catch (error) {
      console.error('[WebSocket] Failed to create WebSocket connection:', error)
      setConnectionError('Failed to create WebSocket connection')
      setIsConnecting(false)
    }
  }, [url, enabled, getAuthToken, reconnectInterval, maxReconnectAttempts])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnecting')
      wsRef.current = null
    }

    setIsConnected(false)
    setIsConnecting(false)
  }, [])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('[WebSocket] Cannot send message: WebSocket not connected')
    }
  }, [])

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (enabled) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  // Reconnect when auth token changes
  useEffect(() => {
    if (enabled && isConnected) {
      const currentToken = getAuthToken()
      // If token changed, reconnect
      if (currentToken && wsRef.current) {
        disconnect()
        connect()
      }
    }
  }, [getAuthToken, enabled, isConnected, connect, disconnect])

  return {
    isConnected,
    isConnecting,
    lastMessage,
    stats,
    connectionError,
    connect,
    disconnect,
    sendMessage
  }
}

