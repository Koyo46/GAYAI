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
    // 初期化時に環境変数からAPIキーを取得
    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    if (deepgramKey) {
      this.deepgram = createClient(deepgramKey);
    } else {
      console.warn('⚠️ DEEPGRAM_API_KEYが環境変数に設定されていません');
    }

    // GeminiのAPIキーも環境変数から取得（デフォルトプロバイダーがgeminiの場合）
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && this.currentProvider === 'gemini') {
      this.gemini = new GoogleGenerativeAI(geminiKey);
      this.modelName = 'gemini-2.5-flash';
    } else if (!geminiKey) {
      console.warn('⚠️ GEMINI_API_KEYが環境変数に設定されていません');
    }
  }

  // 設定更新
  public configure(provider: AiProvider, apiKey: string, deepgramKey?: string) {
    this.currentProvider = provider;
    
    // 脳みその設定
    // apiKeyが空の場合は環境変数から取得を試みる
    let actualApiKey = apiKey;
    if (!actualApiKey || actualApiKey.trim() === '') {
      if (provider === 'openai') {
        actualApiKey = process.env.OPENAI_API_KEY || '';
      } else {
        actualApiKey = process.env.GEMINI_API_KEY || '';
      }
    }

    if (provider === 'openai') {
      if (actualApiKey) {
        this.openai = new OpenAI({ apiKey: actualApiKey, dangerouslyAllowBrowser: true });
        this.modelName = 'gpt-4o-mini';
      }
    } else {
      if (actualApiKey) {
        this.gemini = new GoogleGenerativeAI(actualApiKey);
        this.modelName = 'gemini-2.5-flash'; // gemini-1.5-flashは非推奨のため更新
      }
    }

    // ★耳の設定 (Deepgram)
    // deepgramKeyが提供された場合はそれを使用、なければ環境変数から取得
    const actualDeepgramKey = deepgramKey || process.env.DEEPGRAM_API_KEY;
    if (actualDeepgramKey) {
      this.deepgram = createClient(actualDeepgramKey);
    }
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
        return gaya || '';

      } else if (this.currentProvider === 'gemini' && this.gemini) {
        // Geminiの場合
        try {
          const model = this.gemini.getGenerativeModel({ model: this.modelName });
          const result = await model.generateContent(fullPrompt);
          let gaya = result.response.text();
          // 「」や""を除去（文の最初と最後が括弧で囲まれている場合）
          gaya = gaya.replace(/^[「"「『](.*?)[」"」』]$/, '$1').trim();
          return gaya || '';
        } catch (geminiError: any) {
          // Gemini APIのエラーを詳細に表示
          const errorMessage = geminiError?.message || String(geminiError);
          const statusCode = geminiError?.status || geminiError?.statusCode;
          
          if (statusCode === 429 || errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
            console.error('⏱️ Gemini APIのレート制限に達しました');
            console.error('   無料プランの1日20リクエスト制限に達した可能性があります');
            return '（レート制限: しばらく待ってください）';
          } else if (statusCode === 401 || errorMessage.includes('401') || errorMessage.includes('API key not valid')) {
            console.error('🔑 Gemini APIキーが無効です。.envファイルのGEMINI_API_KEYを確認してください。');
            return '（APIキーエラー: 設定を確認してください）';
          } else if (statusCode === 403 || errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
            console.error('🔑 Gemini APIキーに権限がありません。APIキーを確認してください。');
            return '（APIキーエラー: 権限を確認してください）';
          } else if (errorMessage.includes('leaked')) {
            console.error('🔑 Gemini APIキーが漏洩として報告されています。新しいAPIキーを取得してください。');
            return '（APIキーエラー: 新しいキーが必要です）';
          } else {
            console.error('❌ Gemini APIエラー:', errorMessage);
            throw geminiError;
          }
        }
      }

      console.warn('⚠️ AIの設定がされていません');
      return '（AIの設定がされていません）';
    } catch (error) {
      console.error('❌ AI Error:', error);
      return '（AIが混乱しています...）';
    }
  }
}