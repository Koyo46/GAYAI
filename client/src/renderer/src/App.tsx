import { useEffect, useState } from 'react'

interface Comment {
  id: string
  name: string
  text: string
  avatar?: string
}

function App(): React.JSX.Element {
  const [comments, setComments] = useState<Comment[]>([])

  useEffect(() => {
    // メインプロセスからの 'new-comment' を受信
    const handleNewComment = (_event: unknown, comment: Comment) => {
      console.log('📨 Received comment:', comment)
      setComments((prev) => [...prev, comment])
    }

    window.electron.ipcRenderer.on('new-comment', handleNewComment)

    // クリーンアップ
    return () => {
      window.electron.ipcRenderer.removeAllListeners('new-comment')
    }
  }, [])

  return (
    <div style={{ 
      padding: 20, 
      background: '#1a1a1a', 
      color: '#ffffff',
      height: '100vh',
      overflow: 'auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, marginBottom: 8 }}>GAYAI Client</h1>
        <div style={{ fontSize: 14, color: '#888' }}>
          コメント数: {comments.length} | 
          {comments.length > 0 ? (
            <span style={{ color: '#4caf50' }}> ● 接続中</span>
          ) : (
            <span style={{ color: '#ff9800' }}> ⚠ コメント待機中...</span>
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
            ライブ配信が開始され、コメントが投稿されるとここに表示されます
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 12 
        }}>
          {comments.slice(-50).map((c) => (
            <div 
              key={c.id} 
              style={{
                background: '#2a2a2a',
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
  )
}

export default App