export interface CommentPayload {
  id: string // ユニークID
  name: string // 投稿者名
  text: string // コメント本文（AIガヤの場合はガヤが入る）
  isGaya: boolean // AIによるガヤならtrue
  avatarUrl?: string // アイコンURL
  timestamp: number
}
