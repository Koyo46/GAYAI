export interface CommentPayload {
  id: string      // ユニークID
  name: string    // 投稿者名
  text: string    // コメント本文
  isGaya: boolean // AIによるガヤならtrue
  avatarUrl?: string // アイコンURL
  timestamp: number
}
