import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { execSync } from 'child_process'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { YoutubeService } from './services/YoutubeService'
import { ServerService } from './services/ServerService'
import { BrainService } from './services/BrainService'
import { WebSocketService } from './services/WebSocketService'
import { AiService } from './services/AiService'
import icon from '../../resources/icon.png?asset'

/**
 * Electron起動時の環境によっては標準出力/ロケールがUTF-8でなく、ログが文字化けすることがある。
 * 可能な範囲でUTF-8に寄せる（既存環境が正しい場合は上書きしない）。
 * 
 * 配布版でも確実に動作するよう、モジュール読み込み時に実行する。
 */
function ensureUtf8Console(): void {
  // Windowsの場合、コンソールのコードページをUTF-8に設定
  if (process.platform === 'win32') {
    try {
      // chcp 65001 を実行してコードページをUTF-8に変更
      execSync('chcp 65001 >nul 2>&1', { stdio: 'ignore' })
    } catch (error) {
      // chcpの実行に失敗しても続行
      console.warn('[ensureUtf8Console] Failed to set code page:', error)
    }
  }

  // 環境変数を設定
  process.env.LC_ALL ??= 'C.UTF-8'
  process.env.LANG ??= 'C.UTF-8'
  
  // Node.jsの標準出力/エラー出力のエンコーディングをUTF-8に設定
  const stdout = process.stdout as unknown as { setDefaultEncoding?: (enc: BufferEncoding) => void }
  const stderr = process.stderr as unknown as { setDefaultEncoding?: (enc: BufferEncoding) => void }
  stdout.setDefaultEncoding?.('utf8')
  stderr.setDefaultEncoding?.('utf8')
  
  // Windowsの場合、コンソール出力のエンコーディングも設定
  if (process.platform === 'win32') {
    try {
      // PowerShellのOutputEncodingを設定（可能な場合）
      if (typeof process.stdout.write === 'function') {
        // バッファリングを無効にしてUTF-8を強制
        process.stdout.write('\x1b[?25h') // カーソルを表示（副作用なし）
      }
    } catch (error) {
      // 無視
    }
  }
}

// グローバル変数でサービスを保持
let serverService: ServerService | null = null
let webSocketService: WebSocketService | null = null
let aiService: AiService | null = null
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
  webSocketService = new WebSocketService()
  youtubeService = new YoutubeService(mainWindow, webSocketService)
  brainService = new BrainService(mainWindow, webSocketService)
  aiService = new AiService();

  ipcMain.handle('ai:save-settings', (_event, provider, apiKey) => {
    console.log(`🧠 AI設定を受信: ${provider}`);
    if (aiService) {
      aiService.configure(provider, apiKey);
    }
    return true; // 成功を返す
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    // 接続監視を開始
    if (serverService) {
      serverService.startConnectionMonitoring()
    }
    // WebSocketサーバーを起動
    const wsService = webSocketService
    if (wsService) {
      wsService.start().then(() => {
        console.log('✅ WebSocket server ready')
        // オーバーレイURLを更新
        if (serverService && wsService) {
          const status = serverService.getStatus()
          status.overlayUrl = wsService.getOverlayUrl()
          serverService['notifyStatusChange']()
        }
      }).catch((error) => {
        console.error('❌ Failed to start WebSocket server:', error)
      })
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

// モジュール読み込み時にUTF-8を設定（配布版でも確実に動作するように）
// app.whenReady()の前に実行することで、すべてのログ出力がUTF-8で処理される
ensureUtf8Console()

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
    try {
      const connected = await serverService.checkConnection()
      if (!connected) {
        const status = serverService.getStatus()
        return { 
          success: false, 
          error: `サーバーに接続できませんでした。URL: ${status.serverUrl || '未設定'}` 
        }
      }
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '接続チェック中にエラーが発生しました' 
      }
    }
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
  if (webSocketService) {
    webSocketService.stop()
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
  if (webSocketService) {
    webSocketService.stop()
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
