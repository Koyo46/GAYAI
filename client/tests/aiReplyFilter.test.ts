import { describe, expect, it } from 'vitest';
import { evaluateAiReplyDecision } from '../src/renderer/src/utils/aiReplyFilter';

describe('evaluateAiReplyDecision', () => {
  it('クールダウン中は送信しない', () => {
    const decision = evaluateAiReplyDecision({
      now: 1000,
      lastReplyTime: 500,
      cooldownMs: 600,
      replyChance: 1,
      randomValue: 0
    });

    expect(decision).toEqual({ allow: false, reason: 'cooldown' });
  });

  it('確率判定でスルーできる', () => {
    const decision = evaluateAiReplyDecision({
      now: 2000,
      lastReplyTime: 0,
      cooldownMs: 500,
      replyChance: 0.5,
      randomValue: 0.9
    });

    expect(decision).toEqual({ allow: false, reason: 'random' });
  });

  it('条件を満たすと送信する', () => {
    const decision = evaluateAiReplyDecision({
      now: 2000,
      lastReplyTime: 0,
      cooldownMs: 500,
      replyChance: 0.5,
      randomValue: 0.2
    });

    expect(decision).toEqual({ allow: true });
  });
});
