export type AiReplyDecision =
  | { allow: true }
  | { allow: false; reason: 'cooldown' | 'random' };

interface AiReplyDecisionParams {
  now: number;
  lastReplyTime: number;
  cooldownMs: number;
  replyChance: number;
  randomValue: number;
}

export const evaluateAiReplyDecision = (
  params: AiReplyDecisionParams
): AiReplyDecision => {
  const { now, lastReplyTime, cooldownMs, replyChance, randomValue } = params;

  if (now - lastReplyTime < cooldownMs) {
    return { allow: false, reason: 'cooldown' };
  }

  if (randomValue > replyChance) {
    return { allow: false, reason: 'random' };
  }

  return { allow: true };
};
