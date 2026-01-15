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
    this.app.use((req, res, next) => {
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
      }
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

      this.httpServer.listen(this.port, () => {
        console.log(`🚀 WebSocket server started on http://localhost:${this.port}`)
        console.log(`📺 Overlay URL: http://localhost:${this.port}/overlay/index.html`)
        resolve()
      })

      this.httpServer.on('error', (error) => {
        console.error('❌ WebSocket server error:', error)
        reject(error)
      })
    })
  }

  /**
   * コメントを配信
   */
  broadcastComment(comment: CommentPayload) {
    if (this.io) {
      this.io.emit('new-comment', comment)
      console.log(`📤 Broadcasted comment: ${comment.name}: ${comment.text}`)
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
