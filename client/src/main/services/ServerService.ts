import { BrowserWindow } from 'electron'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

export interface ServerStatus {
  isConnected: boolean
  serverUrl: string | null
  overlayUrl: string | null
  lastChecked: number | null
}

export class ServerService {
  private status: ServerStatus = {
    isConnected: false,
    serverUrl: null,
    overlayUrl: null,
    lastChecked: null
  }
  private mainWindow: BrowserWindow | null = null
  private checkInterval: NodeJS.Timeout | null = null
  private configPath: string

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    
    // 設定ファイルのパス
    const userDataPath = app.getPath('userData')
    this.configPath = join(userDataPath, 'server-config.json')
    
    // 設定を読み込む
    this.loadConfig()
  }

  /**
   * 設定ファイルを読み込む
   */
  private loadConfig(): void {
    try {
      if (existsSync(this.configPath)) {
        const config = JSON.parse(readFileSync(this.configPath, 'utf-8'))
        if (config.serverUrl) {
          this.status.serverUrl = config.serverUrl
          // オーバーレイURLは後でWebSocketServiceから設定される
          // 接続状態をチェック
          this.checkConnection()
        }
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  /**
   * 設定ファイルを保存
   */
  private saveConfig(): void {
    try {
      const config = {
        serverUrl: this.status.serverUrl
      }
      writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to save config:', error)
    }
  }

  /**
   * サーバーURLを設定
   */
  async setServerUrl(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      // URLの形式を検証
      const urlObj = new URL(url)
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { success: false, error: 'URLは http:// または https:// で始まる必要があります' }
      }

      this.status.serverUrl = url
      // オーバーレイURLは後でWebSocketServiceから設定される
      // ここでは設定しない（LaravelサーバーのURLではない）
      this.saveConfig()

      // 接続をチェック
      await this.checkConnection()

      this.notifyStatusChange()
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '無効なURLです' 
      }
    }
  }

  /**
   * サーバーへの接続をチェック
   */
  async checkConnection(): Promise<boolean> {
    if (!this.status.serverUrl) {
      this.status.isConnected = false
      this.status.lastChecked = Date.now()
      this.notifyStatusChange()
      return false
    }

    // 複数のエンドポイントを試す
    const endpoints = [
      '/health',
      '/api/health',
      '/',  // ルートパスも試す
    ]

    for (const endpoint of endpoints) {
      try {
        const url = `${this.status.serverUrl}${endpoint}`
        console.log(`[ServerService] Checking: ${url}`)
        
        const response = await fetch(url, {
          method: 'GET',
          signal: AbortSignal.timeout(5000), // 5秒タイムアウト
          headers: {
            'Accept': 'application/json',
          }
        })

        // 200-299 または 404でもサーバーが応答していると判断
        if (response.status < 500) {
          console.log(`[ServerService] ✅ Connected via ${endpoint} (status: ${response.status})`)
          this.status.isConnected = true
          this.status.lastChecked = Date.now()
          this.notifyStatusChange()
          return true
        }
      } catch (error) {
        // ネットワークエラーの場合は次のエンドポイントを試す
        if (error instanceof Error && error.name === 'AbortError') {
          console.log(`[ServerService] ⏱️ Timeout on ${endpoint}`)
        } else {
          console.log(`[ServerService] ❌ Error on ${endpoint}:`, error)
        }
        continue
      }
    }

    // すべてのエンドポイントで失敗
    console.error(`[ServerService] ❌ All connection attempts failed for ${this.status.serverUrl}`)
    console.error('[ServerService] 確認事項:')
    console.error('  1. Laravel Sailが起動しているか (./vendor/bin/sail up)')
    console.error('  2. URLが正しいか (例: http://localhost)')
    console.error('  3. ポート番号が必要な場合 (例: http://localhost:8000)')
    console.error('  4. CORS設定が正しいか')
    this.status.isConnected = false
    this.status.lastChecked = Date.now()
    this.notifyStatusChange()
    return false
  }

  /**
   * 定期的な接続チェックを開始
   */
  startConnectionMonitoring(intervalMs: number = 30000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    this.checkInterval = setInterval(() => {
      this.checkConnection()
    }, intervalMs)

    // 最初のチェック
    this.checkConnection()
  }

  /**
   * 接続監視を停止
   */
  stopConnectionMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  /**
   * サーバーの状態を取得
   */
  getStatus(): ServerStatus {
    return { ...this.status }
  }

  /**
   * Rendererプロセスに状態変更を通知
   */
  private notifyStatusChange(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('server-status-changed', this.status)
    }
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.stopConnectionMonitoring()
  }
}
