// バックエンドのURL（ローカル開発時）
const BACKEND_URL = 'http://localhost:3000';

// 表示するコメントの最大数
const MAX_COMMENTS = 8;

// コメントが消えるまでの時間（ミリ秒）
const COMMENT_LIFETIME = 15000;

// Socket.IO 接続
const socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('✅ Connected to GAYAI backend');
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from backend');
});

// 新しいコメントを受信
socket.on('new-comment', (comment) => {
  console.log('📝 New comment:', comment);
  addComment(comment);
});

// コメントをUIに追加
function addComment(comment) {
  const container = document.getElementById('comment-container');
  
  // 要素を作成
  const el = document.createElement('div');
  el.className = 'comment' + (comment.isGaya ? ' gaya' : '');
  
  // デフォルトアバター
  const avatarUrl = comment.avatarUrl || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(comment.name)}`;
  
  el.innerHTML = `
    <img class="comment-avatar" src="${avatarUrl}" alt="" />
    <div class="comment-content">
      <div class="comment-name">${escapeHtml(comment.name)}</div>
      <div class="comment-text">${escapeHtml(comment.text)}</div>
    </div>
  `;
  
  // コンテナに追加
  container.appendChild(el);
  
  // 最大数を超えたら古いものを削除
  while (container.children.length > MAX_COMMENTS) {
    container.removeChild(container.firstChild);
  }
  
  // 一定時間後にフェードアウトして削除
  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, 500); // フェードアウトアニメーションの時間
  }, COMMENT_LIFETIME);
}

// XSS対策
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
