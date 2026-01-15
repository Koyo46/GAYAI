import { createClient } from '@deepgram/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export type AiProvider = 'openai' | 'gemini';

export class AiService {
  private openai: OpenAI | null = null;
  private gemini: GoogleGenerativeAI | null = null;
  private deepgram: ReturnType<typeof createClient> | null = null;

  private currentProvider: AiProvider = 'gemini';
  private modelName: string = 'gemini-2.5-flash'; // gemini-1.5-flashは非推奨のため更新

  constructor() {
    // 初期化時にDeepgramを設定（ハードコードされたキー）
    // TODO: 後でダッシュボードから設定できるようにする
    this.deepgram = createClient('e6ffa632ccce18baf6abef2251d410be6daa8555');
  }

  // 設定更新
  public configure(provider: AiProvider, apiKey: string, deepgramKey?: string) {
    this.currentProvider = provider;
    
    // 脳みその設定 (既存)
    if (provider === 'openai') {
      this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      this.modelName = 'gpt-4o-mini';
    } else {
      this.gemini = new GoogleGenerativeAI(apiKey);
      this.modelName = 'gemini-2.5-flash'; // gemini-1.5-flashは非推奨のため更新
    }

    // ★耳の設定 (Deepgram)
    // ダッシュボードでDeepgramキーも保存できるようにする必要がありますが
    // 一旦ハードコードか、OpenAIキーとは別に管理するのが理想です。
    if (deepgramKey) {
      this.deepgram = createClient(deepgramKey);
    }
    // キーが提供されない場合は、コンストラクタで設定されたデフォルトキーを使用
  }

  // ★Deepgramで高速文字起こし
  public async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    if (!this.deepgram) {
      console.error('❌ Deepgram APIキーが設定されていません');
      return '';
    }

    try {
      // 音声データが小さすぎる場合はスキップ（不完全なデータの可能性）
      if (audioBuffer.length < 1000) {
        console.log('⚠️ 音声データが小さすぎます（不完全な可能性）:', audioBuffer.length, 'bytes');
        return '';
      }

      console.log(`🔊 Deepgram API呼び出し: ${(audioBuffer.length / 1024).toFixed(2)}KB`);
      // Bufferを直接送信 (ファイル保存不要！)
      // audio/webm形式で送信、MIMEタイプを明示的に指定
      const { result, error } = await this.deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: "nova-2",     // 爆速・高精度モデル
          language: "ja",      // 日本語
          smart_format: true,  // 句読点などを自動調整
          filler_words: false, // 「えー」「あー」を除去
          mimetype: "audio/webm", // MIMEタイプを明示的に指定
        }
      );

      if (error) {
        console.error('❌ Deepgram API Error:', error);
        // エラーの詳細を表示
        if (error.message) {
          console.error('エラーメッセージ:', error.message);
        }
        throw error;
      }

      // 結果を取り出す
      const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
      if (transcript) {
        console.log(`✅ Deepgram 文字起こし成功: "${transcript}"`);
      }
      return transcript;

    } catch (error) {
      console.error('❌ Deepgram Error:', error);
      return '';
    }
  }
  // ガヤを生成するメソッド
  public async generateGaya(systemPrompt: string, userComment: string): Promise<string> {
    try {
      const fullPrompt = `
        ${systemPrompt}
        
        配信者の独り言: "${userComment}"
        これに対するツッコミ:
      `;

      if (this.currentProvider === 'openai' && this.openai) {
        // OpenAIの場合
        console.log(`🤖 OpenAI (${this.modelName}) でガヤ生成中...`);
        const response = await this.openai.chat.completions.create({
          model: this.modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userComment }
          ],
        });
        let gaya = response.choices[0].message.content || '';
        // 「」や""を除去（文の最初と最後が括弧で囲まれている場合）
        gaya = gaya.replace(/^[「"「『](.*?)[」"」』]$/, '$1').trim();
        console.log(`✅ OpenAI ガヤ生成完了`);
        return gaya || '';

      } else if (this.currentProvider === 'gemini' && this.gemini) {
        // Geminiの場合
        console.log(`🤖 Gemini (${this.modelName}) でガヤ生成中...`);
        const model = this.gemini.getGenerativeModel({ model: this.modelName });
        const result = await model.generateContent(fullPrompt);
        let gaya = result.response.text();
        // 「」や""を除去（文の最初と最後が括弧で囲まれている場合）
        gaya = gaya.replace(/^[「"「『](.*?)[」"」』]$/, '$1').trim();
        console.log(`✅ Gemini ガヤ生成完了`);
        return gaya || '';
      }

      console.warn('⚠️ AIの設定がされていません');
      return '（AIの設定がされていません）';
    } catch (error) {
      console.error('❌ AI Error:', error);
      return '（AIが混乱しています...）';
    }
  }
}