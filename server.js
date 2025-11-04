// Custom Next.js server with WebSocket support
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const { adminWebSocket } = require('./lib/websocket/admin-websocket')

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  // Start WebSocket server on the same HTTP server
  adminWebSocket.start(8080)

  const port = process.env.PORT || 3000
  server.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://localhost:${port}`)
    console.log(`> WebSocket server ready on ws://localhost:8080`)
  })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully')
    adminWebSocket.stop()
    server.close(() => {
      console.log('HTTP server closed')
      process.exit(0)
    })
  })

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully')
    adminWebSocket.stop()
    server.close(() => {
      console.log('HTTP server closed')
      process.exit(0)
    })
  })
}).catch((ex) => {
  console.error(ex.stack)
  process.exit(1)
})
