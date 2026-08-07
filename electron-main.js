// Electron main process for HospitalRun-FA (Persian / Jalali build)
//
// The React app uses BrowserRouter, which does not work over the file://
// protocol. To keep routing intact we spin up a tiny dependency-free static
// HTTP server on a random localhost port that serves the production build,
// with SPA fallback to index.html, then point the Electron window at it.

const { app, BrowserWindow, Menu } = require('electron')
const http = require('http')
const fs = require('fs')
const path = require('path')

const BUILD_DIR = path.join(__dirname, 'build')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/json; charset=utf-8',
}

function createServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
        let filePath = path.join(BUILD_DIR, urlPath)

        // Prevent directory traversal outside BUILD_DIR
        if (!filePath.startsWith(BUILD_DIR)) {
          filePath = path.join(BUILD_DIR, 'index.html')
        }

        // Directory or missing extension -> serve index.html (SPA fallback)
        let stat = null
        try {
          stat = fs.statSync(filePath)
        } catch (e) {
          stat = null
        }

        if (!stat || stat.isDirectory()) {
          const ext = path.extname(filePath)
          if (!ext || !stat) {
            filePath = path.join(BUILD_DIR, 'index.html')
          }
        }

        fs.readFile(filePath, (err, data) => {
          if (err) {
            // Final fallback to index.html for client-side routes
            fs.readFile(path.join(BUILD_DIR, 'index.html'), (e2, idx) => {
              if (e2) {
                res.writeHead(404)
                res.end('Not found')
                return
              }
              res.writeHead(200, { 'Content-Type': MIME['.html'] })
              res.end(idx)
            })
            return
          }
          const ext = path.extname(filePath)
          res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
          res.end(data)
        })
      } catch (e) {
        res.writeHead(500)
        res.end('Server error')
      }
    })

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve(port)
    })
  })
}

async function createWindow() {
  const port = await createServer()

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'HospitalRun فارسی',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Hide default menu bar for a cleaner clinical UI
  Menu.setApplicationMenu(null)

  win.loadURL(`http://127.0.0.1:${port}/`)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
