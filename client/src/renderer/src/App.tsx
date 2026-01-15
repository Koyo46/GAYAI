import { useEffect, useState } from 'react'

interface Comment {
  id: string
  name: string
  text: string
  avatar?: string
}

interface ServerStatus {
  isConnected: boolean
  serverUrl: string | null
  overlayUrl: string | null
  lastChecked: number | null
}

function App(): React.JSX.Element {
  const [comments, setComments] = useState<Comment[]>([])
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    isConnected: false,
    serverUrl: null,
    overlayUrl: null,
    lastChecked: null
  })
  const [serverUrlInput, setServerUrlInput] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [liveId, setLiveId] = useState('')
  const [copied, setCopied] = useState(false)

  // サーバー状態を取得
  useEffect(() => {
    const loadStatus = async (): Promise<void> => {
      const status = await window.api.server.getStatus()
      setServerStatus(status)
      if (status.serverUrl) {
        setServerUrlInput(status.serverUrl)
      }
    }
    loadStatus()

    // サーバー状態変更を監視
    const unsubscribe = window.api.server.onStatusChange((status) => {
      setServerStatus(status)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // コメント受信
  useEffect(() => {
    const handleNewComment = (_event: unknown, comment: Comment): void => {
      console.log('📨 Received comment:', comment)
      setComments((prev) => [...prev, comment])
    }

    window.electron.ipcRenderer.on('new-comment', handleNewComment)

    return () => {
      window.electron.ipcRenderer.removeAllListeners('new-comment')
    }
  }, [])

  // サーバーURL設定
  const handleSetServerUrl = async (): Promise<void> => {
    if (!serverUrlInput.trim()) {
      alert('サーバーURLを入力してください')
      return
    }

    setIsConnecting(true)
    try {
      const result = await window.api.server.setUrl(serverUrlInput.trim())
      if (result.success) {
        console.log('✅ Server URL set:', serverUrlInput)
        // 接続をチェック
        await window.api.server.checkConnection()
      } else {
        alert(`サーバーURL設定に失敗しました: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to set server URL:', error)
      alert(`サーバーURL設定に失敗しました: ${error}`)
    } finally {
      setIsConnecting(false)
    }
  }

  // 接続テスト
  const handleTestConnection = async (): Promise<void> => {
    setIsConnecting(true)
    try {
      const result = await window.api.server.checkConnection()
      if (result.success) {
        alert('✅ サーバーに接続できました')
      } else {
        alert(`❌ サーバーに接続できませんでした: ${result.error || '接続タイムアウト'}`)
      }
    } catch (error) {
      console.error('Connection test failed:', error)
      alert(`接続テストに失敗しました: ${error}`)
    } finally {
      setIsConnecting(false)
    }
  }

  // YouTube配信開始
  const handleStartYouTube = async (): Promise<void> => {
    if (!liveId.trim()) {
      alert('ライブIDを入力してください')
      return
    }

    try {
      const result = await window.api.youtube.start(liveId.trim())
      if (result.success) {
        console.log('✅ YouTube chat started')
      } else {
        alert(`YouTube接続に失敗しました: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to start YouTube:', error)
      alert(`YouTube接続に失敗しました: ${error}`)
    }
  }

  // URLをクリップボードにコピー
  const handleCopyUrl = async (): Promise<void> => {
    if (serverStatus.overlayUrl) {
      await navigator.clipboard.writeText(serverStatus.overlayUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div style={{ 
      padding: 24, 
      background: '#1a1a1a', 
      color: '#ffffff',
      height: '100vh',
      overflow: 'auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, marginBottom: 8, fontSize: 28 }}>GAYAI Client</h1>
        <div style={{ fontSize: 14, color: '#888' }}>
          YouTube配信のガヤAIサービス
        </div>
      </div>

      {/* サーバー接続セクション */}
      <div style={{ 
        background: '#2a2a2a', 
        padding: 20, 
        borderRadius: 12, 
        marginBottom: 24 
      }}>
        <h2 style={{ margin: 0, marginBottom: 16, fontSize: 18 }}>サーバー接続</h2>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <div style={{ 
            width: 12, 
            height: 12, 
            borderRadius: '50%', 
            background: serverStatus.isConnected ? '#4caf50' : '#ff5722',
            boxShadow: serverStatus.isConnected ? '0 0 8px #4caf50' : 'none'
          }} />
          <span style={{ fontSize: 14 }}>
            {serverStatus.isConnected 
              ? `接続中 (${serverStatus.serverUrl})` 
              : serverStatus.serverUrl 
                ? `未接続 (${serverStatus.serverUrl})`
                : 'サーバーURL未設定'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={serverUrlInput}
            onChange={(e) => setServerUrlInput(e.target.value)}
            placeholder="サーバーURLを入力 (例: http://example.com)"
            style={{
              flex: 1,
              padding: '10px 12px',
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: 6,
              fontSize: 14
            }}
          />
          <button
            onClick={handleSetServerUrl}
            disabled={isConnecting}
            style={{
              padding: '10px 20px',
              background: '#2196f3',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: isConnecting ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 'bold',
              opacity: isConnecting ? 0.6 : 1
            }}
          >
            {isConnecting ? '接続中...' : '🔗 接続'}
          </button>
          {serverStatus.serverUrl && (
            <button
              onClick={handleTestConnection}
              disabled={isConnecting}
              style={{
                padding: '10px 20px',
                background: '#4caf50',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 'bold',
                opacity: isConnecting ? 0.6 : 1
              }}
            >
              ✓ テスト
            </button>
          )}
        </div>

        {/* OBSオーバーレイURL */}
        {serverStatus.isConnected && serverStatus.overlayUrl && (
          <div style={{ 
            marginTop: 16, 
            padding: 12, 
            background: '#1a1a1a', 
            borderRadius: 8 
          }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
              OBSブラウザソース用URL:
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <code style={{ 
                flex: 1, 
                padding: 8, 
                background: '#0a0a0a', 
                borderRadius: 4, 
                fontSize: 12,
                wordBreak: 'break-all'
              }}>
                {serverStatus.overlayUrl}
              </code>
              <button
                onClick={handleCopyUrl}
                style={{
                  padding: '8px 16px',
                  background: copied ? '#4caf50' : '#333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 12,
                  whiteSpace: 'nowrap'
                }}
              >
                {copied ? '✓ コピー済み' : '📋 コピー'}
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
              OBSで「ブラウザソース」を追加し、このURLを入力してください
            </div>
          </div>
        )}
      </div>

      {/* YouTube配信制御セクション */}
      <div style={{ 
        background: '#2a2a2a', 
        padding: 20, 
        borderRadius: 12, 
        marginBottom: 24 
      }}>
        <h2 style={{ margin: 0, marginBottom: 16, fontSize: 18 }}>YouTube配信</h2>
        
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={liveId}
            onChange={(e) => setLiveId(e.target.value)}
            placeholder="ライブIDを入力 (例: jfKfPfyJRdk)"
            style={{
              flex: 1,
              padding: '10px 12px',
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: 6,
              fontSize: 14
            }}
          />
          <button
            onClick={handleStartYouTube}
            disabled={!serverStatus.isConnected}
            style={{
              padding: '10px 20px',
              background: serverStatus.isConnected ? '#2196f3' : '#666',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: serverStatus.isConnected ? 'pointer' : 'not-allowed',
              fontSize: 14,
              fontWeight: 'bold'
            }}
          >
            ▶ 配信開始
          </button>
        </div>
        
            <div style={{ fontSize: 12, color: '#888' }}>
          {!serverStatus.isConnected 
            ? '⚠️ サーバーに接続してから配信を開始してください'
            : 'ライブIDは YouTube URL の v=xxxx の部分です'}
        </div>
      </div>

      {/* コメント表示セクション */}
      <div style={{ 
        background: '#2a2a2a', 
        padding: 20, 
        borderRadius: 12 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>コメント</h2>
          <div style={{ fontSize: 14, color: '#888' }}>
            {comments.length}件
            {comments.length > 0 && (
              <span style={{ color: '#4caf50', marginLeft: 8 }}>● 受信中</span>
            )}
          </div>
        </div>
        
        {comments.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: 40, 
            color: '#666',
            fontSize: 14
          }}>
            <p>コメントがまだありません</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>
              サーバーを起動し、YouTube配信を開始するとコメントが表示されます
            </p>
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 12,
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {comments.slice(-50).reverse().map((c) => (
              <div 
                key={c.id} 
                style={{
                  background: '#1a1a1a',
                  padding: 12,
                  borderRadius: 8,
                  borderLeft: '3px solid #4caf50',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start'
                }}
              >
                {c.avatar && (
                  <img 
                    src={c.avatar} 
                    alt={c.name}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    color: '#4caf50',
                    marginBottom: 4,
                    fontSize: 14
                  }}>
                    {c.name}
                  </div>
                  <div style={{ 
                    color: '#e0e0e0',
                    fontSize: 14,
                    wordBreak: 'break-word'
                  }}>
                    {c.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
