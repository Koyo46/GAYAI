import { useEffect, useState } from 'react';
import io from 'socket.io-client';

// ★重要：ポート番号をLocalServer.tsと合わせる
const SOCKET_URL = 'http://localhost:3001';

interface Comment {
  id: string;
  name: string;
  text: string;
  avatar?: string;
}

export default function Overlay() {
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    // 接続
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('Overlay Connected to Socket Server');
    });

    socket.on('new-comment', (comment: Comment) => {
      console.log('Overlay Received:', comment);
      setComments((prev) => [...prev, comment]);
      
      // (オプション) 10秒後に消す
      setTimeout(() => {
        setComments((current) => current.filter(c => c.id !== comment.id));
      }, 10000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    // 背景を透明にするためのスタイル
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden',
      padding: '20px',
      background: 'transparent' // OBSではこれが重要
    }}>
      {comments.map((c, i) => (
        <div key={c.id || i} style={{
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '20px',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          maxWidth: '80%',
          animation: 'fadeIn 0.5s ease-out',
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          fontSize: '24px', // OBS用に文字は大きめに
          textShadow: '2px 2px 4px black'
        }}>
          {c.avatar && (
            <img 
              src={c.avatar} 
              style={{ width: 40, height: 40, borderRadius: '50%', marginRight: 15 }} 
            />
          )}
          <span>{c.text}</span>
        </div>
      ))}
      
      {/* デバッグ用：何もコメントがなくても文字が出るかテスト */}
      {comments.length === 0 && (
        <div style={{ color: 'red', fontSize: 20 }}>
          待機中... (URL: {SOCKET_URL})
        </div>
      )}
    </div>
  );
}