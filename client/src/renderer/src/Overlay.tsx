import { useEffect, useState } from 'react'
import io from 'socket.io-client'

const SOCKET_URL = 'http://localhost:3001'

interface Comment {
  id: string
  name: string
  text: string
  avatar?: string
  gaya?: string
}

export default function Overlay(): JSX.Element {
  const [comments, setComments] = useState<Comment[]>([])

  useEffect(() => {
    const socket = io(SOCKET_URL)
    socket.on('new-comment', (c) => {
      setComments((prev) => [...prev, c])
      // 10秒後に消す（画面が埋まるのを防ぐ）
      setTimeout(() => {
        setComments((current) => current.filter((item) => item.id !== c.id))
      }, 10000)
    })
    return () => {
      socket.disconnect()
    }
  }, [])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        padding: '20px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column-reverse', // 新しいものを下に表示（チャット欄っぽく）
        alignItems: 'flex-start', // 左寄せ
        pointerEvents: 'none' // ★重要: これでクリックが透過して背後のゲームを操作できます
      }}
    >
      {/* リストを反転させて、下から積み上がるようにする */}
      {[...comments].reverse().map((c) => (
        <div
          key={c.id}
          style={{
            marginBottom: '10px',
            animation: 'slideIn 0.3s ease-out',
            maxWidth: '80%'
          }}
        >
          {/* 1. 配信者の声 (文字起こし) */}
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.9)',
              textShadow: '2px 2px 4px #000, -1px -1px 0 #000', // 強力な縁取り
              fontSize: '18px',
              fontFamily: '"M PLUS Rounded 1c", sans-serif',
              fontWeight: 'bold',
              background: 'rgba(0, 0, 0, 0.4)', // うっすら黒背景
              padding: '4px 12px',
              borderRadius: '12px',
              display: 'inline-block'
            }}
          >
            🎤 {c.text}
          </div>

          {/* 2. AIのツッコミ */}
          {c.gaya && (
            <div
              style={{
                marginTop: '4px',
                marginLeft: '20px',
                color: '#ffeb3b', // 黄色（目立つ）
                textShadow: '2px 2px 0px #000', // くっきりした影
                fontSize: '24px',
                fontWeight: '900',
                fontFamily: '"Arial Black", sans-serif',
                // AIの発言は漫画の吹き出しっぽく
                background: 'rgba(255, 0, 85, 0.8)', // 鮮やかなピンク赤
                padding: '8px 16px',
                borderRadius: '20px',
                border: '2px solid #fff',
                transform: 'rotate(-2deg)', // 少し傾けて勢いを出す
                display: 'inline-block',
                animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' // 弾むアニメーション
              }}
            >
              {c.gaya}
            </div>
          )}
        </div>
      ))}

      {/* アニメーション定義 (styleタグを直接埋め込む) */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.5) rotate(-10deg); }
          to { opacity: 1; transform: scale(1) rotate(-2deg); }
        }
      `}</style>
    </div>
  )
}
