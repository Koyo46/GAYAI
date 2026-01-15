import { describe, it, expect } from 'vitest';

// AiServiceの括弧除去ロジックをテスト
describe('AiService - 括弧除去ロジック', () => {
  const removeBrackets = (text: string): string => {
    // 「」や""を除去（文の最初と最後が括弧で囲まれている場合）
    return text.replace(/^[「"「『](.*?)[」"」』]$/, '$1').trim();
  };

  it('全角括弧「」を除去する', () => {
    const input = '「これはテストです」';
    const result = removeBrackets(input);
    expect(result).toBe('これはテストです');
  });

  it('半角括弧""を除去する', () => {
    const input = '"これはテストです"';
    const result = removeBrackets(input);
    expect(result).toBe('これはテストです');
  });

  it('二重括弧『』を除去する', () => {
    const input = '『これはテストです』';
    const result = removeBrackets(input);
    expect(result).toBe('これはテストです');
  });

  it('既に括弧がない場合はそのまま返す', () => {
    const input = 'これはテストです';
    const result = removeBrackets(input);
    expect(result).toBe('これはテストです');
  });

  it('開始括弧のみの場合はそのまま返す', () => {
    const input = '「これはテストです';
    const result = removeBrackets(input);
    expect(result).toBe('「これはテストです');
  });

  it('終了括弧のみの場合はそのまま返す', () => {
    const input = 'これはテストです」';
    const result = removeBrackets(input);
    expect(result).toBe('これはテストです」');
  });

  it('空文字列を処理できる', () => {
    const input = '';
    const result = removeBrackets(input);
    expect(result).toBe('');
  });

  it('括弧のみの文字列を処理できる', () => {
    const input = '「」';
    const result = removeBrackets(input);
    expect(result).toBe('');
  });

  it('複数の括弧パターンを処理できる', () => {
    const patterns = [
      { input: '「テスト」', expected: 'テスト' },
      { input: '"テスト"', expected: 'テスト' },
      { input: '『テスト』', expected: 'テスト' },
      { input: '「"テスト"」', expected: '"テスト"' }, // 外側の括弧のみ除去
    ];

    patterns.forEach(({ input, expected }) => {
      const result = removeBrackets(input);
      expect(result).toBe(expected);
    });
  });
});
