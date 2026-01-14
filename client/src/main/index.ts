import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { YoutubeService } from './services/YoutubeService'
import { ServerService } from './services/ServerService'
import { BrainService } from './services/BrainService'
import icon from '../../resources/icon.png?asset'

// グローバル変数でサービスを保持
let serverService: ServerService | null = null
let youtubeService: YoutubeService | null = null
let brainService: BrainService | null = null

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // サービスを初期化
  serverService = new ServerService(mainWindow)
  youtubeService = new YoutubeService(mainWindow)
  brainService = new BrainService(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    // 接続監視を開始
    if (serverService) {
      serverService.startConnectionMonitoring()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC handlers
  ipcMain.on('ping', () => console.log('pong'))

  // サーバーURL設定
  ipcMain.handle('server:setUrl', async (_event, url: string) => {
    if (!serverService) return { error: 'Server service not initialized' }
    return await serverService.setServerUrl(url)
  })

  // サーバー接続チェック
  ipcMain.handle('server:checkConnection', async () => {
    if (!serverService) return { success: false, error: 'Server service not initialized' }
    const connected = await serverService.checkConnection()
    return { success: connected }
  })

  // サーバー状態取得
  ipcMain.handle('server:status', () => {
    if (!serverService) return { isConnected: false, serverUrl: null, overlayUrl: null, lastChecked: null }
    return serverService.getStatus()
  })

  // YouTube配信開始
  ipcMain.handle('youtube:start', async (_event, liveId: string) => {
    if (!youtubeService) return { error: 'YouTube service not initialized' }
    try {
      await youtubeService.start(liveId)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // YouTube配信停止
  ipcMain.handle('youtube:stop', () => {
    if (!youtubeService) return { error: 'YouTube service not initialized' }
    youtubeService.stop()
    return { success: true }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // クリーンアップ
  if (serverService) {
    serverService.cleanup()
  }
  if (youtubeService) {
    youtubeService.stop()
  }
  if (brainService) {
    brainService.stop()
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  // アプリ終了前にクリーンアップ
  if (serverService) {
    serverService.cleanup()
  }
  if (youtubeService) {
    youtubeService.stop()
  }
  if (brainService) {
    brainService.stop()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
