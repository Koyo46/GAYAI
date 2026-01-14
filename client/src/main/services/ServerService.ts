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
          this.status.overlayUrl = `${config.serverUrl}/overlay/index.html`
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
      this.status.overlayUrl = `${url}/overlay/index.html`
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

    try {
      const response = await fetch(`${this.status.serverUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5秒タイムアウト
      })

      this.status.isConnected = response.ok
      this.status.lastChecked = Date.now()
      this.notifyStatusChange()
      return response.ok
    } catch (error) {
      console.error('Connection check failed:', error)
      this.status.isConnected = false
      this.status.lastChecked = Date.now()
      this.notifyStatusChange()
      return false
    }
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
