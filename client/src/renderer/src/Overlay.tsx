// src/renderer/src/Overlay.tsx
import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

// ▼▼▼ デザイン設定 (ここを変えると雰囲気が変わります) ▼▼▼
const STYLES = {
  // 全体の文字色
  textColor: '#ffffff',
  // 配信者/視聴者の吹き出しの色 (少し透けた黒)
  userBubbleBg: 'rgba(0, 0, 0, 0.6)',
  // AIの吹き出しの色 (ネオンパープル～青のグラデーション)
  aiBubbleBg: 'linear-gradient(135deg, #b000f0, #0048ff)',
  // AIの光る影の色
  aiGlowColor: 'rgba(120, 50, 255, 0.7)',
};
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// ポート番号は合わせてください
const SOCKET_URL = 'http://localhost:3001';

interface Comment {
  id: string;
  name: string;
  text: string;
  avatar?: string;
  isGaya?: boolean; // AIによるガヤかどうか
  timestamp: number; // 表示時間管理用
}

export default function Overlay() {
  const [comments, setComments] = useState<Comment[]>([]);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('connect', () => console.log('Overlay Connected!'));

    socket.on('new-comment', (comment: Comment) => {
      // タイムスタンプを付与して追加
      const newComment = { ...comment, timestamp: Date.now() };
      setComments((prev) => [...prev, newComment].slice(-20)); // 最新20件だけ保持
    });

    return () => { socket.disconnect(); };
  }, []);

  // 新しいコメントが来たら自動スクロール
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  return (
    <>
      {/* ▼▼▼ CSSアニメーション定義 ▼▼▼ */}
      <style>{`
        /* 全体が左からスッと入ってくるアニメーション */
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        /* AIの吹き出しがポンッと飛び出すアニメーション */
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.8) translateY(10px); }
          80% { transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        /* AIアイコンがゆっくり脈打つアニメーション */
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 ${STYLES.aiGlowColor}; }
          70% { box-shadow: 0 0 10px 10px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
      `}</style>

      {/* ▼▼▼ メイン表示エリア ▼▼▼ */}
      <div style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden', // スクロールバーを出さない
        padding: '20px',
        background: 'transparent', // OBSで背景を透過させるための重要設定
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end', // 下から積み上げる
        color: STYLES.textColor,
        fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", sans-serif',
        pointerEvents: 'none', // ★重要: これでクリックが透過して背後のゲームを操作できます
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {comments.map((c) => (
            // コメントのペア（配信者発言 + AIツッコミ）のコンテナ
            <div key={c.id} style={{
              animation: 'slideInLeft 0.4s ease-out forwards',
              maxWidth: '85%', // 画面幅いっぱいにしない
            }}>
              
              {/* === 上段：配信者/視聴者のコメント（AIガヤの場合は非表示） === */}
              {!c.isGaya && (
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                }}>
                  {/* アバター */}
                  <img 
                    src={c.avatar || 'https://cdn-icons-png.flaticon.com/512/847/847969.png'} 
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      marginRight: '12px', border: '2px solid rgba(255,255,255,0.2)'
                    }}
                  />
                  {/* 名前と本文 */}
                  <div style={{
                    background: STYLES.userBubbleBg,
                    padding: '8px 14px',
                    borderRadius: '18px',
                    borderTopLeftRadius: '4px', // 吹き出しっぽく左上を尖らせる
                    backdropFilter: 'blur(4px)', // すりガラス効果
                  }}>
                    <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '2px' }}>{c.name}</div>
                    <div style={{ fontSize: '16px', lineHeight: '1.4' }}>{c.text}</div>
                  </div>
                </div>
              )}

              {/* === 下段：AIのツッコミ (Gaya) - AIガヤの場合はここだけ表示 === */}
              {c.isGaya && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  marginLeft: '48px', // アバター分ずらす
                  animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.3s both', // 0.3秒遅れて登場
                }}>
                  <div style={{
                    background: STYLES.aiBubbleBg,
                    padding: '10px 18px',
                    borderRadius: '24px',
                    borderTopLeftRadius: '0px', // 逆向きの吹き出し
                    boxShadow: `0 4px 15px ${STYLES.aiGlowColor}`, // 光る影
                    display: 'flex', alignItems: 'center',
                    maxWidth: '100%',
                    position: 'relative',
                    border: '1px solid rgba(255,255,255,0.3)'
                  }}>
                    {/* AIアイコン */}
                    <div style={{
                      position: 'absolute', left: '-14px', top: '-14px',
                      background: '#fff', borderRadius: '50%', padding: '4px',
                      boxShadow: `0 0 10px ${STYLES.aiGlowColor}`,
                      animation: 'pulse 2s infinite'
                    }}>
                      <span style={{ fontSize: '18px' }}>🤖</span>
                    </div>
                    
                    {/* ツッコミ本文 - textにガヤが入っている */}
                    <div style={{ 
                      fontSize: '20px', // AIの声は少し大きく
                      fontWeight: 'bold',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                    }}>
                      {c.text}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={commentsEndRef} /> {/* 自動スクロール用の見えない壁 */}
        </div>
      </div>
    </>
  );
}
