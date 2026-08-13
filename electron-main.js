// RunCDX desktop main process.
//
// The application is served from a stable, private protocol instead of a
// random localhost port. IndexedDB/PouchDB data is scoped to the application
// origin, so keeping this origin stable is essential for durable offline data.

const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  ipcMain,
  net,
  protocol,
  safeStorage,
  shell,
} = require('electron')
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const { pathToFileURL } = require('url')

const APP_SCHEME = 'runcdx'
const APP_HOST = 'desktop'
const BUILD_DIR = path.join(__dirname, 'build')
const BACKUP_FOLDER_NAME = 'RunCDX Backups'
const BACKUP_RETENTION_COUNT = 30
const SYNC_CONFIGURATION_FILE_NAME = 'sync-configuration.json'
const RUNTIME_SMOKE_TEST_ARGUMENT = '--runcdx-runtime-smoke-test'

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
])

app.setName('RunCDX')
app.setPath('userData', path.join(app.getPath('appData'), 'RunCDX'))

function resolveBuildFile(requestUrl) {
  const url = new URL(requestUrl)
  const requestedPath = decodeURIComponent(url.pathname).replace(/^\/+/, '')
  const candidate = path.resolve(BUILD_DIR, requestedPath || 'index.html')
  const relative = path.relative(BUILD_DIR, candidate)

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return path.join(BUILD_DIR, 'index.html')
  }

  try {
    if (fs.statSync(candidate).isFile()) {
      return candidate
    }
  } catch (error) {
    // Client-side routes intentionally fall back to the SPA entry point.
  }

  return path.join(BUILD_DIR, 'index.html')
}

function registerApplicationProtocol() {
  protocol.handle(APP_SCHEME, (request) =>
    net.fetch(pathToFileURL(resolveBuildFile(request.url)).toString()),
  )
}

function isTrustedApplicationFrame(frame) {
  return frame && frame.url.startsWith(`${APP_SCHEME}://${APP_HOST}/`)
}

function getBackupDirectory() {
  return path.join(app.getPath('documents'), BACKUP_FOLDER_NAME)
}

function getSyncConfigurationPath() {
  return path.join(app.getPath('userData'), SYNC_CONFIGURATION_FILE_NAME)
}

function protectPassword(password) {
  if (!password) {
    return ''
  }
  if (safeStorage.isEncryptionAvailable()) {
    return `encrypted:${safeStorage.encryptString(password).toString('base64')}`
  }
  // This fallback is used only on development Linux environments without a
  // keyring. Windows 10/11 uses DPAPI through Electron safeStorage.
  return `plain:${Buffer.from(password, 'utf8').toString('base64')}`
}

function unprotectPassword(protectedPassword) {
  if (!protectedPassword) {
    return ''
  }
  if (protectedPassword.startsWith('encrypted:') && safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(Buffer.from(protectedPassword.slice(10), 'base64'))
  }
  if (protectedPassword.startsWith('plain:')) {
    return Buffer.from(protectedPassword.slice(6), 'base64').toString('utf8')
  }
  return ''
}

async function readSyncConfiguration() {
  try {
    const stored = JSON.parse(await fs.promises.readFile(getSyncConfigurationPath(), 'utf8'))
    return {
      mode: stored.mode === 'network' ? 'network' : 'standalone',
      serverUrl: stored.serverUrl || 'http://127.0.0.1:5984',
      databaseName: stored.databaseName || 'hospitalrun',
      username: stored.username || '',
      password: unprotectPassword(stored.protectedPassword || ''),
    }
  } catch (error) {
    return {
      mode: 'standalone',
      serverUrl: 'http://127.0.0.1:5984',
      databaseName: 'hospitalrun',
      username: '',
      password: '',
    }
  }
}

async function writeSyncConfiguration(configuration) {
  if (!configuration || !['standalone', 'network'].includes(configuration.mode)) {
    throw new Error('Invalid sync configuration')
  }

  const serverUrl = String(configuration.serverUrl || '').trim().replace(/\/$/, '')
  const databaseName = String(configuration.databaseName || '').trim().replace(/^\/+|\/+$/g, '')
  if (configuration.mode === 'network') {
    const parsedUrl = new URL(serverUrl)
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || !databaseName) {
      throw new Error('Invalid sync server address')
    }
  }

  const targetPath = getSyncConfigurationPath()
  const temporaryPath = `${targetPath}.tmp`
  const stored = {
    mode: configuration.mode,
    serverUrl: serverUrl || 'http://127.0.0.1:5984',
    databaseName: databaseName || 'hospitalrun',
    username: String(configuration.username || '').trim(),
    protectedPassword: protectPassword(String(configuration.password || '')),
  }

  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true })
  await fs.promises.writeFile(temporaryPath, JSON.stringify(stored, null, 2), 'utf8')
  await fs.promises.rename(temporaryPath, targetPath)
}

function runElevatedPowerShellScript(scriptPath) {
  const escapedPath = scriptPath.replace(/'/g, "''")
  const command = [
    `$scriptPath = '${escapedPath}'`,
    '$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""',
    '$installer = Start-Process -FilePath powershell.exe -ArgumentList $arguments -Verb RunAs -Wait -PassThru',
    'if ($installer.ExitCode -ne 0) { exit $installer.ExitCode }',
  ].join('; ')
  const encodedCommand = Buffer.from(command, 'utf16le').toString('base64')

  return new Promise((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', encodedCommand],
      { windowsHide: true },
    )
    child.once('error', reject)
    child.once('close', (exitCode) => {
      if (exitCode === 0) {
        resolve()
      } else {
        reject(new Error(`RunCDX server setup failed with exit code ${exitCode}`))
      }
    })
  })
}

function getClinicConnectionPath() {
  const programData = process.env.ProgramData || 'C:\\ProgramData'
  return path.join(programData, 'RunCDX', 'clinic-connection.json')
}

async function readClinicConnection(connectionPath, preferLocalServer) {
  const connection = JSON.parse(await fs.promises.readFile(connectionPath, 'utf8'))
  const serverUrls = Array.isArray(connection.serverUrls)
    ? connection.serverUrls.filter((value) => typeof value === 'string')
    : []
  const serverUrl = preferLocalServer
    ? serverUrls.find((value) => value.startsWith('http://127.0.0.1:'))
    : serverUrls.find((value) => !value.startsWith('http://127.0.0.1:'))
  if (!serverUrl || !connection.databaseName || !connection.username || !connection.password) {
    throw new Error('Invalid RunCDX clinic connection file')
  }
  return {
    mode: 'network',
    serverUrl,
    databaseName: connection.databaseName,
    username: connection.username,
    password: connection.password,
  }
}

async function installClinicServer() {
  if (process.platform !== 'win32') {
    throw new Error('RunCDX server setup is available only on Windows')
  }
  const scriptPath = app.isPackaged
    ? path.join(process.resourcesPath, 'server-tools', 'Install-RunCDXServer.ps1')
    : path.join(__dirname, 'deployment', 'windows', 'Install-RunCDXServer.ps1')
  await fs.promises.access(scriptPath, fs.constants.R_OK)
  await runElevatedPowerShellScript(scriptPath)
  return readClinicConnection(getClinicConnectionPath(), true)
}

function registerBackupHandlers() {
  ipcMain.handle('runcdx:backup:location', (event) => {
    if (!isTrustedApplicationFrame(event.senderFrame)) {
      throw new Error('Untrusted backup request')
    }
    return getBackupDirectory()
  })

  ipcMain.handle('runcdx:backup:save', async (event, backupContents) => {
    if (!isTrustedApplicationFrame(event.senderFrame) || typeof backupContents !== 'string') {
      throw new Error('Invalid backup request')
    }

    const backupDirectory = getBackupDirectory()
    await fs.promises.mkdir(backupDirectory, { recursive: true })

    const timestamp = Date.now()
    const fileName = `runcdx-backup-${timestamp}.json`
    const targetPath = path.join(backupDirectory, fileName)
    const temporaryPath = `${targetPath}.tmp`

    // Write-then-rename prevents a power interruption from leaving a backup
    // that looks complete but contains only part of the clinical database.
    await fs.promises.writeFile(temporaryPath, backupContents, {
      encoding: 'utf8',
      flag: 'wx',
    })
    await fs.promises.rename(temporaryPath, targetPath)

    const backupFiles = (await fs.promises.readdir(backupDirectory))
      .filter((name) => /^runcdx-backup-\d+\.json$/.test(name))
      .sort()
    const expiredFiles = backupFiles.slice(
      0,
      Math.max(0, backupFiles.length - BACKUP_RETENTION_COUNT),
    )
    await Promise.all(
      expiredFiles.map((name) => fs.promises.unlink(path.join(backupDirectory, name))),
    )

    return { fileName, path: targetPath, createdAt: new Date(timestamp).toISOString() }
  })

  ipcMain.handle('runcdx:backup:select', async (event) => {
    if (!isTrustedApplicationFrame(event.senderFrame)) {
      throw new Error('Untrusted backup restore request')
    }
    const ownerWindow = BrowserWindow.fromWebContents(event.sender)
    const options = {
      title: 'انتخاب فایل بکاپ RunCDX',
      properties: ['openFile'],
      filters: [{ name: 'RunCDX JSON Backup', extensions: ['json'] }],
    }
    const selection = ownerWindow
      ? await dialog.showOpenDialog(ownerWindow, options)
      : await dialog.showOpenDialog(options)
    if (selection.canceled || selection.filePaths.length !== 1) {
      return undefined
    }
    const selectedPath = selection.filePaths[0]
    const contents = await fs.promises.readFile(selectedPath, 'utf8')
    return { path: selectedPath, contents }
  })

  ipcMain.handle('runcdx:backup:open-location', async (event) => {
    if (!isTrustedApplicationFrame(event.senderFrame)) {
      throw new Error('Untrusted backup location request')
    }
    const backupDirectory = getBackupDirectory()
    await fs.promises.mkdir(backupDirectory, { recursive: true })
    return shell.openPath(backupDirectory)
  })
}

function registerSyncConfigurationHandlers() {
  ipcMain.handle('runcdx:sync:get-configuration', async (event) => {
    if (!isTrustedApplicationFrame(event.senderFrame)) {
      throw new Error('Untrusted sync configuration request')
    }
    return readSyncConfiguration()
  })

  ipcMain.handle('runcdx:sync:save-configuration', async (event, configuration) => {
    if (!isTrustedApplicationFrame(event.senderFrame)) {
      throw new Error('Untrusted sync configuration request')
    }
    await writeSyncConfiguration(configuration)
  })

  ipcMain.handle('runcdx:server:install', async (event) => {
    if (!isTrustedApplicationFrame(event.senderFrame)) {
      throw new Error('Untrusted server installation request')
    }
    return installClinicServer()
  })

  ipcMain.handle('runcdx:server:import-connection', async (event) => {
    if (!isTrustedApplicationFrame(event.senderFrame)) {
      throw new Error('Untrusted connection import request')
    }
    const ownerWindow = BrowserWindow.fromWebContents(event.sender)
    const options = {
      title: 'انتخاب فایل اتصال مطب RunCDX',
      properties: ['openFile'],
      filters: [{ name: 'RunCDX Clinic Connection', extensions: ['json'] }],
    }
    const selection = ownerWindow
      ? await dialog.showOpenDialog(ownerWindow, options)
      : await dialog.showOpenDialog(options)
    if (selection.canceled || selection.filePaths.length !== 1) {
      return undefined
    }
    return readClinicConnection(selection.filePaths[0], false)
  })

  ipcMain.handle('runcdx:server:export-connection', async (event) => {
    if (!isTrustedApplicationFrame(event.senderFrame)) {
      throw new Error('Untrusted connection export request')
    }
    const connectionPath = getClinicConnectionPath()
    await fs.promises.access(connectionPath, fs.constants.R_OK)
    const ownerWindow = BrowserWindow.fromWebContents(event.sender)
    const options = {
      title: 'ذخیرهٔ فایل اتصال مطب RunCDX',
      defaultPath: 'runcdx-clinic-connection.json',
      filters: [{ name: 'RunCDX Clinic Connection', extensions: ['json'] }],
    }
    const selection = ownerWindow
      ? await dialog.showSaveDialog(ownerWindow, options)
      : await dialog.showSaveDialog(options)
    if (selection.canceled || !selection.filePath) {
      return undefined
    }
    await fs.promises.copyFile(connectionPath, selection.filePath)
    return selection.filePath
  })
}

async function runRendererRuntimeSmokeTest(win) {
  return win.webContents.executeJavaScript(`
    (async () => {
      if (!window.isSecureContext) {
        throw new Error('RunCDX renderer is not a secure context')
      }
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error('Web Crypto SubtleCrypto is unavailable')
      }

      const salt = window.crypto.getRandomValues(new Uint8Array(16))
      const key = await window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode('runcdx-runtime-smoke-password'),
        'PBKDF2',
        false,
        ['deriveBits'],
      )
      const hash = await window.crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 210000 },
        key,
        256,
      )
      if (hash.byteLength !== 32) {
        throw new Error('PBKDF2 produced an unexpected result')
      }

      const databaseName = 'runcdx-runtime-smoke'
      await new Promise((resolve, reject) => {
        const request = window.indexedDB.open(databaseName, 1)
        request.onupgradeneeded = () => {
          const database = request.result
          if (!database.objectStoreNames.contains('probe')) {
            database.createObjectStore('probe')
          }
        }
        request.onerror = () => reject(request.error || new Error('IndexedDB open failed'))
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction('probe', 'readwrite')
          transaction.objectStore('probe').put('ok', 'status')
          transaction.onerror = () => {
            database.close()
            reject(transaction.error || new Error('IndexedDB write failed'))
          }
          transaction.oncomplete = () => {
            database.close()
            const deletion = window.indexedDB.deleteDatabase(databaseName)
            deletion.onerror = () => reject(deletion.error || new Error('IndexedDB cleanup failed'))
            deletion.onsuccess = () => resolve()
          }
        }
      })

      return 'ok'
    })()
  `)
}

function createWindow() {
  const runtimeSmokeTest = process.argv.includes(RUNTIME_SMOKE_TEST_ARGUMENT)
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'RunCDX',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'electron-preload.js'),
    },
  })

  Menu.setApplicationMenu(null)
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event, targetUrl) => {
    if (!targetUrl.startsWith(`${APP_SCHEME}://${APP_HOST}/`)) {
      event.preventDefault()
    }
  })

  if (runtimeSmokeTest) {
    win.webContents.once('did-finish-load', async () => {
      try {
        const result = await runRendererRuntimeSmokeTest(win)
        if (result !== 'ok') {
          throw new Error('RunCDX runtime smoke test returned an unexpected result')
        }
        console.log('RunCDX runtime smoke test passed.')
        app.exit(0)
      } catch (error) {
        console.error('RunCDX runtime smoke test failed.', error)
        app.exit(1)
      }
    })
    win.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
      console.error(`RunCDX runtime smoke test could not load the renderer: ${errorCode} ${errorDescription}`)
      app.exit(1)
    })
  } else {
    win.once('ready-to-show', () => win.show())
  }

  win.loadURL(`${APP_SCHEME}://${APP_HOST}/`)
}

app.whenReady().then(() => {
  registerApplicationProtocol()
  registerBackupHandlers()
  registerSyncConfigurationHandlers()
  createWindow()
})

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
