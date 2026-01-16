import { describe, it, expect, beforeAll } from 'vitest';
import { AiService } from '../../src/main/services/AiService';
import { ServerService } from '../../src/main/services/ServerService';
import { BrowserWindow } from 'electron';

/**
 * エンドツーエンドの処理時間を測定するテスト
 * 
 * 実際のAPIを呼び出すため、以下が必要です：
 * - Deepgram APIキー（AiServiceのコンストラクタで設定済み）
 * - GeminiまたはOpenAI APIキー（以下でハードコーディング）
 * 
 * 実行方法:
 *   npm test -- endToEnd
 */

// ============================================
// APIキーをここに設定してください
// ============================================
const GEMINI_API_KEY = 'hoge'; // Gemini APIキー
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE'; // OpenAI APIキー（オプション）

// 使用するプロバイダーを選択: 'gemini' または 'openai'
const AI_PROVIDER: 'gemini' | 'openai' = 'gemini';
// ============================================

describe('エンドツーエンド処理時間測定', () => {
  let aiService: AiService;
  let serverService: ServerService | null = null;

  // モックのBrowserWindow（実際のウィンドウは不要）
  const mockWindow = {
    webContents: {
      send: () => {},
      isDestroyed: () => false
    },
    isDestroyed: () => false
  } as unknown as BrowserWindow;

  beforeAll(() => {
    aiService = new AiService();
    
    // APIキーを設定
    const hasGeminiKey = GEMINI_API_KEY && GEMINI_API_KEY.trim() !== '' && !GEMINI_API_KEY.includes('YOUR_');
    const hasOpenAiKey = OPENAI_API_KEY && OPENAI_API_KEY.trim() !== '' && !OPENAI_API_KEY.includes('YOUR_');
    
    if (AI_PROVIDER === 'gemini') {
      if (hasGeminiKey) {
        aiService.configure('gemini', GEMINI_API_KEY);
        console.log('✅ Gemini APIキーを設定しました');
      } else {
        console.warn('⚠️  Gemini APIキーが設定されていません。AI返答生成テストはスキップされます。');
      }
    } else {
      if (hasOpenAiKey) {
        aiService.configure('openai', OPENAI_API_KEY);
        console.log('✅ OpenAI APIキーを設定しました');
      } else {
        console.warn('⚠️  OpenAI APIキーが設定されていません。AI返答生成テストはスキップされます。');
      }
    }
    
    // ServerServiceは実際のLaravelサーバーに接続するため、オプション
    // serverService = new ServerService(mockWindow);
  });

  it('音声データ → 文字起こし → Laravelプロンプト取得 → AI返答生成の全体フロー', async () => {
    // ダミーの音声データ（実際のテストでは実際の音声ファイルを使用）
    const audioBuffer = Buffer.alloc(5000); // 5KBのダミーデータ
    
    const timings = {
      transcription: 0,
      promptFetch: 0,
      aiGeneration: 0,
      total: 0
    };

    const overallStart = Date.now();

    try {
      // ステップ1: 文字起こし
      const transcriptionStart = Date.now();
      const transcript = await aiService.transcribeAudio(audioBuffer);
      timings.transcription = Date.now() - transcriptionStart;

      if (!transcript || transcript.length < 2) {
        console.log('⏭️  スキップ: 文字起こし結果が空です（ダミーデータのため）');
        return;
      }

      // ステップ2: Laravelからプロンプト取得（モック）
      const promptFetchStart = Date.now();
      // 実際のLaravelサーバーがない場合はデフォルトプロンプトを使用
      const systemPrompt = "あなたは配信者の友人です。短く、面白おかしく相槌やツッコミを入れてください。";
      timings.promptFetch = Date.now() - promptFetchStart;

      // ステップ3: AI返答生成
      const aiGenerationStart = Date.now();
      const gaya = await aiService.generateGaya(systemPrompt, transcript);
      timings.aiGeneration = Date.now() - aiGenerationStart;

      timings.total = Date.now() - overallStart;

      // 結果を表示
      console.log('\n' + '='.repeat(70));
      console.log('📊 エンドツーエンド処理時間測定結果');
      console.log('='.repeat(70));
      console.log(`1️⃣  文字起こし処理: ${timings.transcription}ms`);
      console.log(`   認識結果: "${transcript}"`);
      console.log(`2️⃣  プロンプト取得: ${timings.promptFetch}ms`);
      console.log(`3️⃣  AI返答生成: ${timings.aiGeneration}ms`);
      console.log(`   AI返答: "${gaya}"`);
      console.log('─'.repeat(70));
      console.log(`⏱️  全体処理時間: ${timings.total}ms (${(timings.total / 1000).toFixed(2)}秒)`);
      console.log(`   内訳:`);
      console.log(`   - 文字起こし: ${((timings.transcription / timings.total) * 100).toFixed(1)}%`);
      console.log(`   - プロンプト取得: ${((timings.promptFetch / timings.total) * 100).toFixed(1)}%`);
      console.log(`   - AI生成: ${((timings.aiGeneration / timings.total) * 100).toFixed(1)}%`);
      console.log('='.repeat(70));

      // パフォーマンス評価
      if (timings.total < 3000) {
        console.log('✅ 優秀: 3秒以内で完了');
      } else if (timings.total < 5000) {
        console.log('✅ 良好: 5秒以内で完了');
      } else if (timings.total < 10000) {
        console.log('⚠️  やや遅い: 10秒以内で完了');
        console.log('   改善提案:');
        if (timings.transcription > timings.aiGeneration) {
          console.log('   - 文字起こし処理がボトルネックです。音声データサイズを小さくするか、');
          console.log('     より高速な文字起こしサービスを検討してください。');
        } else {
          console.log('   - AI生成処理がボトルネックです。より高速なモデル（例: gpt-4o-mini）を');
          console.log('     検討するか、プロンプトを短くしてください。');
        }
      } else {
        console.log('❌ 遅い: 10秒以上かかっています');
        console.log('   改善提案:');
        console.log('   - ネットワーク接続を確認してください');
        console.log('   - APIキーの設定を確認してください');
        console.log('   - 音声データサイズを小さくしてください');
      }

      expect(timings.total).toBeGreaterThan(0);
    } catch (error) {
      console.error('❌ エンドツーエンド処理エラー:', error);
      if (error instanceof Error && error.message.includes('設定がされていません')) {
        console.log('⏭️  スキップ: AI設定がされていません');
        return;
      }
      throw error;
    }
  }, 60000); // 60秒のタイムアウト

  it('異なる音声データサイズでの処理時間比較', async () => {
    const sizes = [
      { name: '小 (2KB)', size: 2000 },
      { name: '中 (5KB)', size: 5000 },
      { name: '大 (10KB)', size: 10000 }
    ];

    const results: Array<{ name: string; time: number }> = [];

    for (const { name, size } of sizes) {
      const audioBuffer = Buffer.alloc(size);
      const startTime = Date.now();

      try {
        const transcript = await aiService.transcribeAudio(audioBuffer);
        const time = Date.now() - startTime;
        
        if (transcript) {
          results.push({ name, time });
          console.log(`${name}: ${time}ms`);
        } else {
          console.log(`${name}: スキップ（認識結果なし）`);
        }
      } catch (error) {
        console.error(`${name}: エラー`, error);
      }

      // レート制限回避のため待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (results.length > 0) {
      console.log('\n📊 データサイズ別処理時間:');
      results.forEach(({ name, time }) => {
        console.log(`  ${name}: ${time}ms`);
      });
    }
  }, 120000); // 2分のタイムアウト
});
