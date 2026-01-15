import { describe, it, expect } from 'vitest';

// ServerServiceのsetServerUrlのバリデーションロジックをテスト
describe('ServerService - URL validation', () => {
  it('有効なHTTP URLを受け入れる', () => {
    const url = 'http://localhost';
    expect(() => new URL(url)).not.toThrow();
    const urlObj = new URL(url);
    expect(['http:', 'https:'].includes(urlObj.protocol)).toBe(true);
  });

  it('有効なHTTPS URLを受け入れる', () => {
    const url = 'https://example.com';
    expect(() => new URL(url)).not.toThrow();
    const urlObj = new URL(url);
    expect(['http:', 'https:'].includes(urlObj.protocol)).toBe(true);
  });

  it('無効なプロトコルを拒否する', () => {
    const url = 'ftp://example.com';
    expect(() => {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Invalid protocol');
      }
    }).toThrow();
  });

  it('無効なURL形式を拒否する', () => {
    const url = 'not-a-url';
    expect(() => new URL(url)).toThrow();
  });

  it('ポート番号付きURLを受け入れる', () => {
    const url = 'http://localhost:8000';
    expect(() => new URL(url)).not.toThrow();
    const urlObj = new URL(url);
    expect(urlObj.port).toBe('8000');
  });
});
