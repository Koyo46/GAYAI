import { BrowserWindow } from 'electron'
import { CommentPayload } from '../types/comment'
import { WebSocketService } from './WebSocketService'

export class BrainService {
  private mainWindow: BrowserWindow | null = null
  private gayaInterval: NodeJS.Timeout | null = null
  private webSocketService?: WebSocketService
  
  private readonly phrases = ['草', 'www', '88888', '天才か？', 'なるほどね', 'きたあああ']

  constructor(mainWindow: BrowserWindow, webSocketService?: WebSocketService) {
    this.mainWindow = mainWindow
    this.webSocketService = webSocketService
    this.startGayaLoop()
  }

  private startGayaLoop() {
    // 5〜15秒のランダムな間隔でガヤを飛ばす
    const nextInterval = () => Math.floor(Math.random() * 10000) + 5000

    const tick = () => {
      this.gayaInterval = setTimeout(() => {
        this.emitGaya()
        tick()
      }, nextInterval())
    }
    tick()
  }

  private emitGaya() {
    const text = this.phrases[Math.floor(Math.random() * this.phrases.length)]
    const payload: CommentPayload = {
      id: `gaya-${Date.now()}`,
      name: 'GAYAIちゃん',
      text: text,
      isGaya: true, // ここが重要
      timestamp: Date.now(),
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=GAYAI', // 仮のAIアイコン
    }

    // ElectronアプリのUIに送信
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('new-comment', payload)
    }

    // WebSocketでオーバーレイに配信
    if (this.webSocketService) {
      this.webSocketService.broadcastComment(payload)
    }

    console.log(`[Gaya] Generated: ${text}`)
  }

  /**
   * ガヤ生成を停止
   */
  stop() {
    if (this.gayaInterval) {
      clearTimeout(this.gayaInterval)
      this.gayaInterval = null
    }
  }
}
