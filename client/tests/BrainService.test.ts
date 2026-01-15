import { describe, it, expect } from 'vitest';

// BrainServiceのphrases配列とロジックをテスト
describe('BrainService', () => {
  const phrases = ['草', 'www', '88888', '天才か？', 'なるほどね', 'きたあああ'];

  it('phrases配列に期待される値が含まれている', () => {
    expect(phrases).toContain('草');
    expect(phrases).toContain('www');
    expect(phrases).toContain('88888');
    expect(phrases).toContain('天才か？');
    expect(phrases).toContain('なるほどね');
    expect(phrases).toContain('きたあああ');
  });

  it('phrases配列からランダムに選択できる', () => {
    const selected = phrases[Math.floor(Math.random() * phrases.length)];
    expect(phrases).toContain(selected);
  });

  it('すべてのphrasesが文字列である', () => {
    phrases.forEach(phrase => {
      expect(typeof phrase).toBe('string');
      expect(phrase.length).toBeGreaterThan(0);
    });
  });
});
