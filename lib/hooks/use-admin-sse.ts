import { useEffect, useRef, useState, useCallback } from 'react'

interface SSEMessage {
  type: string
  data?: any
  timestamp: string
  [key: string]: any
}

interface UseAdminSSEOptions {
  url?: string
  enabled?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export function useAdminSSE(options: UseAdminSSEOptions = {}) {
  const {
    url = '/api/admin/sse/stats',
    enabled = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const getAuthToken = useCallback(() => {
    return localStorage.getItem('adminToken')
  }, [])

  const connect = useCallback(() => {
    if (!enabled || eventSourceRef.current?.readyState === EventSource.OPEN) {
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

      const sseUrl = `${url}?token=${encodeURIComponent(token)}`
      const eventSource = new EventSource(sseUrl)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log('[SSE] Connected to admin SSE server')
        setIsConnected(true)
        setIsConnecting(false)
        setConnectionError(null)
        reconnectAttemptsRef.current = 0
      }

      eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data)
          setLastMessage(message)

          // Handle different message types
          switch (message.type) {
            case 'stats_update':
              setStats(message.data)
              break

            case 'connected':
              console.log('[SSE] Connection confirmed:', message.message)
              break

            case 'broadcast':
              console.log('[SSE] Broadcast received:', message)
              break

            default:
              console.log('[SSE] Received message:', message.type, message)
          }
        } catch (error) {
          console.error('[SSE] Error parsing message:', error)
        }
      }

      eventSource.onerror = (event) => {
        console.error('[SSE] Connection error:', event)
        setIsConnected(false)
        setIsConnecting(false)

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          console.log(`[SSE] Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`)

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        } else {
          setConnectionError(`Connection failed after ${maxReconnectAttempts} attempts`)
        }
      }

    } catch (error) {
      console.error('[SSE] Failed to create SSE connection:', error)
      setConnectionError('Failed to create SSE connection')
      setIsConnecting(false)
    }
  }, [url, enabled, getAuthToken, reconnectInterval, maxReconnectAttempts])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setIsConnected(false)
    setIsConnecting(false)
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
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  // Reconnect when auth token changes
  useEffect(() => {
    if (enabled && isConnected) {
      const currentToken = getAuthToken()
      // If token changed, reconnect
      if (currentToken && eventSourceRef.current) {
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
    disconnect
  }
}

