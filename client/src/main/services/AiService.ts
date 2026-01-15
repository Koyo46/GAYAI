import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type AiProvider = 'openai' | 'gemini';

export class AiService {
  private openai: OpenAI | null = null;
  private gemini: GoogleGenerativeAI | null = null;
  private currentProvider: AiProvider = 'gemini'; // デフォルト
  private modelName: string = 'gemini-1.5-flash'; // デフォルトモデル

  // 設定を更新するメソッド
  public configure(provider: AiProvider, apiKey: string) {
    this.currentProvider = provider;
    
    if (provider === 'openai') {
      this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      this.modelName = 'gpt-4o-mini'; // コスパ最強モデル
    } else {
      this.gemini = new GoogleGenerativeAI(apiKey);
      this.modelName = 'gemini-1.5-flash'; // 高速・無料枠あり
    }
  }

  // ガヤを生成するメソッド
  public async generateGaya(systemPrompt: string, userComment: string): Promise<string> {
    try {
      const fullPrompt = `
        ${systemPrompt}
        
        視聴者のコメント: "${userComment}"
        これに対する短いツッコミ:
      `;

      if (this.currentProvider === 'openai' && this.openai) {
        // OpenAIの場合
        const response = await this.openai.chat.completions.create({
          model: this.modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userComment }
          ],
        });
        return response.choices[0].message.content || '...';

      } else if (this.currentProvider === 'gemini' && this.gemini) {
        // Geminiの場合
        const model = this.gemini.getGenerativeModel({ model: this.modelName });
        const result = await model.generateContent(fullPrompt);
        return result.response.text();
      }

      return '（AIの設定がされていません）';
    } catch (error) {
      console.error('AI Error:', error);
      return '（AIが混乱しています...）';
    }
  }
}