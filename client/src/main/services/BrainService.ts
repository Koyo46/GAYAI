import { BrowserWindow } from 'electron'
// import { CommentPayload } from '../types/comment'
import { WebSocketService } from './WebSocketService'

export class BrainService {
  // private _mainWindow: BrowserWindow | null = null
  private gayaInterval: NodeJS.Timeout | null = null
  // private _webSocketService?: WebSocketService

  // private readonly _phrases = ['草', 'www', '88888', '天才か？', 'なるほどね', 'きたあああ']

  constructor(_mainWindow: BrowserWindow, _webSocketService?: WebSocketService) {
    // this._mainWindow = mainWindow
    // this._webSocketService = webSocketService
    // 固定文言のガヤ生成を一時的に無効化
    // this.startGayaLoop()
  }

  /*
  private startGayaLoop(): void {
    // 5〜15秒のランダムな間隔でガヤを飛ばす
    const nextInterval = (): number => Math.floor(Math.random() * 10000) + 5000

    const tick = (): void => {
      this.gayaInterval = setTimeout(() => {
        this.emitGaya()
        tick()
      }, nextInterval())
    }
    tick()
  }
  */

  /*
  private emitGaya(): void {
    const text = this.phrases[Math.floor(Math.random() * this.phrases.length)]
    const payload: CommentPayload = {
      id: `gaya-${Date.now()}`,
      name: 'GAYAIちゃん',
      text: text,
      isGaya: true, // ここが重要
      timestamp: Date.now(),
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=GAYAI' // 仮のAIアイコン
    }

    // ElectronアプリのUIに送信
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('new-comment', payload)
    }

    // WebSocketでオーバーレイに配信
    if (this.webSocketService) {
      this.webSocketService.broadcastComment(payload)
    }

    // コンソールログをUTF-8として正しく出力
    const logText = Buffer.from(text, 'utf8').toString('utf8')
    console.log(`[Gaya] Generated: ${logText}`)
  }
  */

  /**
   * ガヤ生成を停止
   */
  stop(): void {
    if (this.gayaInterval) {
      clearTimeout(this.gayaInterval)
      this.gayaInterval = null
    }
  }
}
