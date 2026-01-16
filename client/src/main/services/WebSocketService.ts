import { Server as HttpServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import express from 'express'
import { join } from 'path'
import { CommentPayload } from '../types/comment'

export class WebSocketService {
  private httpServer: HttpServer | null = null
  private io: SocketIOServer | null = null
  private app: express.Application
  private port: number = 3001 // Electronアプリ用のローカルポート

  constructor() {
    this.app = express()
    this.setupServer()
  }

  private setupServer() {
    // CORS設定
    this.app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.header('Access-Control-Allow-Headers', 'Content-Type')
      next()
    })

    // オーバーレイファイルを静的ファイルとして配信
    // 開発環境と本番環境でパスが異なる
    const isDev = process.env.NODE_ENV !== 'production'
    const overlayPath = isDev
      ? join(__dirname, '../../../../overlay')  // 開発環境
      : join(process.resourcesPath, 'overlay')  // 本番環境（app.asarの外）
    
    this.app.use('/overlay', express.static(overlayPath))
    this.app.use('/', express.static(overlayPath))

    // HTTPサーバーを作成
    this.httpServer = new HttpServer(this.app)

    // Socket.IOサーバーを作成
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      // UTF-8エンコーディングを明示的に指定
      transports: ['websocket', 'polling'],
      allowEIO3: true
    })

    // Socket.IO接続処理
    this.io.on('connection', (socket) => {
      console.log(`✅ Overlay connected: ${socket.id}`)

      socket.on('disconnect', () => {
        console.log(`❌ Overlay disconnected: ${socket.id}`)
      })
    })
  }

  /**
   * WebSocketサーバーを起動
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.httpServer) {
        reject(new Error('HTTP server not initialized'))
        return
      }

      // 既に起動している場合は何もしない
      if (this.httpServer.listening) {
        console.log(`⚠️ WebSocket server is already running on port ${this.port}`)
        resolve()
        return
      }

      this.httpServer.listen(this.port, () => {
        console.log(`🚀 WebSocket server started on http://localhost:${this.port}`)
        console.log(`📺 Overlay URL: http://localhost:${this.port}/overlay/index.html`)
        resolve()
      })

      this.httpServer.on('error', (error) => {
        // ERR_SERVER_ALREADY_LISTENエラーの場合は既に起動しているとみなす
        if ((error as NodeJS.ErrnoException).code === 'ERR_SERVER_ALREADY_LISTEN') {
          console.log(`⚠️ WebSocket server is already listening on port ${this.port}`)
          resolve()
        } else {
          console.error('❌ WebSocket server error:', error)
          reject(error)
        }
      })
    })
  }

  /**
   * UTF-8文字化けを修正する（latin1として誤解釈されたUTF-8を復元）
   */
  private fixUtf8Mojibake(text: string): string {
    // ASCII文字のみの場合は変換不要
    if (/^[\x00-\x7F]*$/.test(text)) {
      return text
    }
    
    // 文字化けの典型的なパターンを検出
    // "縺" などの文字化けした文字が含まれている場合
    const mojibakePatterns = [
      /縺/, /繧/, /繝/, /繧/, /・/, /｡/, /｢/, /｣/, /､/, /･/, /ｦ/, /ｧ/, /ｨ/, /ｩ/, /ｪ/, /ｫ/, /ｬ/, /ｭ/, /ｮ/, /ｯ/, /ｰ/, /ｱ/, /ｲ/, /ｳ/, /ｴ/, /ｵ/, /ｶ/, /ｷ/, /ｸ/, /ｹ/, /ｺ/, /ｻ/, /ｼ/, /ｽ/, /ｾ/, /ｿ/, /ﾀ/, /ﾁ/, /ﾂ/, /ﾃ/, /ﾄ/, /ﾅ/, /ﾆ/, /ﾇ/, /ﾈ/, /ﾉ/, /ﾊ/, /ﾋ/, /ﾌ/, /ﾍ/, /ﾎ/, /ﾏ/, /ﾐ/, /ﾑ/, /ﾒ/, /ﾓ/, /ﾔ/, /ﾕ/, /ﾖ/, /ﾗ/, /ﾘ/, /ﾙ/, /ﾚ/, /ﾛ/, /ﾜ/, /ﾝ/
    ]
    
    const hasMojibakePattern = mojibakePatterns.some(pattern => pattern.test(text))
    
    // 文字化けパターンが含まれている、またはUTF-8バイト列がlatin1として解釈された可能性がある場合
    if (hasMojibakePattern || /[ÃÂãâêîôû]/.test(text)) {
      try {
        // latin1として解釈されたUTF-8バイト列を復元
        const decoded = Buffer.from(text, 'latin1').toString('utf8')
        
        // 復元後の文字列を評価
        const originalJapaneseCount = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length
        const decodedJapaneseCount = (decoded.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length
        
        // 復元後に日本語が増え、置換文字がなく、文字化けパターンが減った場合は採用
        if (
          decodedJapaneseCount > originalJapaneseCount &&
          !decoded.includes('�') &&
          !mojibakePatterns.some(pattern => pattern.test(decoded))
        ) {
          return decoded
        }
      } catch (error) {
        // 変換に失敗した場合は元の文字列を返す
        console.error('[WebSocketService] UTF-8 fix failed:', error)
      }
    }
    
    return text
  }

  /**
   * コメントを配信
   */
  broadcastComment(comment: CommentPayload) {
    if (this.io) {
      // UTF-8文字化けを修正
      const originalName = comment.name
      const originalText = comment.text
      const fixedName = this.fixUtf8Mojibake(originalName)
      const fixedText = this.fixUtf8Mojibake(originalText)
      
      const fixedComment: CommentPayload = {
        ...comment,
        name: fixedName,
        text: fixedText
      }
      
      // デバッグ: 修正前後の比較
      if (originalName !== fixedName || originalText !== fixedText) {
        console.log(`[WebSocketService] Fixed mojibake:`)
        console.log(`  Name: "${originalName}" -> "${fixedName}"`)
        console.log(`  Text: "${originalText}" -> "${fixedText}"`)
      }
      
      this.io.emit('new-comment', fixedComment)
      
      // コンソールログ出力（Windowsコンソールの文字化け対策）
      // Bufferを使用してUTF-8として明示的に処理
      try {
        const nameBytes = Buffer.from(fixedName, 'utf8')
        const textBytes = Buffer.from(fixedText, 'utf8')
        const nameStr = nameBytes.toString('utf8')
        const textStr = textBytes.toString('utf8')
        console.log(`📤 Broadcasted comment: ${nameStr}: ${textStr}`)
      } catch (error) {
        // フォールバック: そのまま出力
        console.log(`📤 Broadcasted comment: ${fixedName}: ${fixedText}`)
      }
    }
  }

  /**
   * WebSocketサーバーを停止
   */
  stop() {
    if (this.io) {
      this.io.close()
      this.io = null
    }
    if (this.httpServer) {
      this.httpServer.close()
      this.httpServer = null
    }
    console.log('🛑 WebSocket server stopped')
  }

  /**
   * オーバーレイURLを取得
   * 開発環境: Vite dev server (http://localhost:5173/#/overlay)
   * 本番環境: Electronアプリ内のReact Router (http://localhost:5173/#/overlay または file://)
   */
  getOverlayUrl(): string {
    // 開発環境ではVite dev serverを使用
    // 本番環境でもElectronアプリが起動している限り、Vite dev serverは動いている
    // または、Electronアプリ内のレンダラープロセスを直接参照する方法もある
    return 'http://localhost:5173/#/overlay'
  }
}
