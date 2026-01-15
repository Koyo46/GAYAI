import { describe, it, expect } from 'vitest';
import type { CommentPayload } from '../src/main/types/comment';

describe('CommentPayload', () => {
  it('必須フィールドがすべて含まれている', () => {
    const comment: CommentPayload = {
      id: 'test-123',
      name: 'テストユーザー',
      text: 'テストコメント',
      isGaya: false,
      timestamp: Date.now()
    };

    expect(comment.id).toBe('test-123');
    expect(comment.name).toBe('テストユーザー');
    expect(comment.text).toBe('テストコメント');
    expect(comment.isGaya).toBe(false);
    expect(comment.timestamp).toBeTypeOf('number');
  });

  it('オプショナルフィールドを含むことができる', () => {
    const comment: CommentPayload = {
      id: 'test-456',
      name: 'テストユーザー2',
      text: 'テストコメント2',
      isGaya: true,
      timestamp: Date.now(),
      avatarUrl: 'https://example.com/avatar.png'
    };

    expect(comment.avatarUrl).toBe('https://example.com/avatar.png');
    expect(comment.isGaya).toBe(true);
  });

  it('ガヤコメントとして識別できる', () => {
    const gayaComment: CommentPayload = {
      id: 'gaya-123',
      name: 'GAYAIちゃん',
      text: '草',
      isGaya: true,
      timestamp: Date.now()
    };

    expect(gayaComment.isGaya).toBe(true);
    expect(gayaComment.name).toBe('GAYAIちゃん');
  });

  it('通常のコメントとして識別できる', () => {
    const normalComment: CommentPayload = {
      id: 'comment-123',
      name: '視聴者',
      text: '面白い！',
      isGaya: false,
      timestamp: Date.now()
    };

    expect(normalComment.isGaya).toBe(false);
  });
});
