import { describe, it, expect, beforeAll } from 'vitest';
import { AiService } from '../../src/main/services/AiService';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * 音声入力からAI返答までの処理時間を測定する統合テスト
 * 
 * 注意: このテストは実際のAPIを呼び出すため、以下が必要です：
 * - Deepgram APIキー（AiServiceのコンストラクタで設定済み）
 * - GeminiまたはOpenAI APIキー（以下でハードコーディング）
 * 
 * 実行方法:
 *   npm test -- audioToAiResponse
 */

// ============================================
// APIキーをここに設定してください
// ============================================
const GEMINI_API_KEY = 'AIzaSyBQjhWMLAkhzh5lFROBxi7Wsn5m3_r71FY'; // Gemini APIキー
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE'; // OpenAI APIキー（オプション）

// 使用するプロバイダーを選択: 'gemini' または 'openai'
const AI_PROVIDER: 'gemini' | 'openai' = 'gemini';
// ============================================

describe('音声入力 → AI返答までの処理時間測定', () => {
  let aiService: AiService;
  let audioBuffer: Buffer;

  beforeAll(() => {
    // AiServiceを初期化
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
    
    // テスト用の音声ファイルを読み込む（存在しない場合はダミーデータを使用）
    try {
      // 実際の音声ファイルがある場合は使用
      const audioPath = join(__dirname, '../fixtures/test-audio.webm');
      audioBuffer = readFileSync(audioPath);
      console.log(`✅ テスト用音声ファイルを読み込みました: ${(audioBuffer.length / 1024).toFixed(2)}KB`);
    } catch {
      // 音声ファイルがない場合は、最小限のWebMヘッダーを含むダミーデータを作成
      // 実際のAPIテストには不十分ですが、構造の確認には使えます
      console.warn('⚠️ テスト用音声ファイルが見つかりません。ダミーデータを使用します。');
      console.warn('   音声ファイルを作成する方法: tests/fixtures/README.md を参照してください');
      console.warn('   または: tests/fixtures/create-test-audio.html をブラウザで開いて録音してください');
      audioBuffer = Buffer.alloc(2000); // 2KBのダミーデータ
    }
  });

  it('文字起こし処理時間を測定', async () => {
    if (!audioBuffer || audioBuffer.length < 1000) {
      console.log('⏭️  スキップ: 有効な音声データがありません');
      return;
    }

    const startTime = Date.now();
    
    try {
      const transcript = await aiService.transcribeAudio(audioBuffer);
      const transcriptionTime = Date.now() - startTime;
      
      console.log(`\n📊 文字起こし処理時間: ${transcriptionTime}ms`);
      console.log(`   音声データサイズ: ${(audioBuffer.length / 1024).toFixed(2)}KB`);
      console.log(`   認識結果: "${transcript}"`);
      
      // 処理時間を記録（アサーションはしない - ネットワーク状況により変動するため）
      expect(transcriptionTime).toBeGreaterThan(0);
      
      if (transcriptionTime > 10000) {
        console.warn(`⚠️  文字起こしに10秒以上かかっています。ネットワーク状況を確認してください。`);
      }
    } catch (error) {
      console.error('❌ 文字起こしエラー:', error);
      throw error;
    }
  }, 30000); // 30秒のタイムアウト

  it('AI返答生成処理時間を測定', async () => {
    const testText = 'こんにちは、今日はいい天気ですね';
    const systemPrompt = 'あなたは配信者の友人です。短く、面白おかしく相槌やツッコミを入れてください。';
    
    const startTime = Date.now();
    
    try {
      const gaya = await aiService.generateGaya(systemPrompt, testText);
      const generationTime = Date.now() - startTime;
      
      console.log(`\n📊 AI返答生成処理時間: ${generationTime}ms`);
      console.log(`   入力テキスト: "${testText}"`);
      console.log(`   AI返答: "${gaya}"`);
      
      expect(generationTime).toBeGreaterThan(0);
      
      if (generationTime > 15000) {
        console.warn(`⚠️  AI返答生成に15秒以上かかっています。APIの応答が遅い可能性があります。`);
      }
    } catch (error) {
      console.error('❌ AI返答生成エラー:', error);
      // AI設定がされていない場合はスキップ
      if (error instanceof Error && error.message.includes('設定がされていません')) {
        console.log('⏭️  スキップ: AI設定がされていません');
        return;
      }
      throw error;
    }
  }, 30000); // 30秒のタイムアウト

  it('音声入力 → 文字起こし → AI返答の全体処理時間を測定', async () => {
    if (!audioBuffer || audioBuffer.length < 1000) {
      console.log('⏭️  スキップ: 有効な音声データがありません');
      return;
    }

    const systemPrompt = 'あなたは配信者の友人です。短く、面白おかしく相槌やツッコミを入れてください。';
    const overallStartTime = Date.now();
    
    try {
      // ステップ1: 文字起こし
      const transcriptionStartTime = Date.now();
      const transcript = await aiService.transcribeAudio(audioBuffer);
      const transcriptionTime = Date.now() - transcriptionStartTime;
      
      if (!transcript || transcript.length < 2) {
        console.log('⏭️  スキップ: 文字起こし結果が空です');
        return;
      }
      
      // ステップ2: AI返答生成
      const generationStartTime = Date.now();
      const gaya = await aiService.generateGaya(systemPrompt, transcript);
      const generationTime = Date.now() - generationStartTime;
      
      const overallTime = Date.now() - overallStartTime;
      
      // 結果を表示
      console.log('\n' + '='.repeat(60));
      console.log('📊 全体処理時間測定結果');
      console.log('='.repeat(60));
      console.log(`1️⃣  文字起こし処理時間: ${transcriptionTime}ms`);
      console.log(`   認識結果: "${transcript}"`);
      console.log(`2️⃣  AI返答生成処理時間: ${generationTime}ms`);
      console.log(`   AI返答: "${gaya}"`);
      console.log('─'.repeat(60));
      console.log(`⏱️  全体処理時間: ${overallTime}ms (${(overallTime / 1000).toFixed(2)}秒)`);
      console.log(`   内訳:`);
      console.log(`   - 文字起こし: ${((transcriptionTime / overallTime) * 100).toFixed(1)}%`);
      console.log(`   - AI生成: ${((generationTime / overallTime) * 100).toFixed(1)}%`);
      console.log('='.repeat(60));
      
      // パフォーマンス評価
      if (overallTime < 3000) {
        console.log('✅ 優秀: 3秒以内で完了');
      } else if (overallTime < 5000) {
        console.log('✅ 良好: 5秒以内で完了');
      } else if (overallTime < 10000) {
        console.log('⚠️  やや遅い: 10秒以内で完了');
      } else {
        console.log('❌ 遅い: 10秒以上かかっています');
      }
      
      expect(overallTime).toBeGreaterThan(0);
      
    } catch (error) {
      console.error('❌ 全体処理エラー:', error);
      // AI設定がされていない場合はスキップ
      if (error instanceof Error && error.message.includes('設定がされていません')) {
        console.log('⏭️  スキップ: AI設定がされていません');
        return;
      }
      throw error;
    }
  }, 60000); // 60秒のタイムアウト

  it('複数回の処理時間を測定して平均を計算', async () => {
    const testTexts = [
      'こんにちは',
      '今日はいい天気ですね',
      '配信お疲れ様です'
    ];
    const systemPrompt = 'あなたは配信者の友人です。短く、面白おかしく相槌やツッコミを入れてください。';
    
    const times: number[] = [];
    
    for (let i = 0; i < testTexts.length; i++) {
      const text = testTexts[i];
      const startTime = Date.now();
      
      try {
        const gaya = await aiService.generateGaya(systemPrompt, text);
        const time = Date.now() - startTime;
        times.push(time);
        
        console.log(`\n試行 ${i + 1}/${testTexts.length}:`);
        console.log(`  入力: "${text}"`);
        console.log(`  返答: "${gaya}"`);
        console.log(`  処理時間: ${time}ms`);
        
        // 各試行の間に少し待機（レート制限回避）
        if (i < testTexts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`試行 ${i + 1} でエラー:`, error);
        if (error instanceof Error && error.message.includes('設定がされていません')) {
          console.log('⏭️  スキップ: AI設定がされていません');
          return;
        }
        // エラーが発生した試行はスキップ
        continue;
      }
    }
    
    if (times.length > 0) {
      const average = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      
      console.log('\n' + '='.repeat(60));
      console.log('📊 複数回測定結果');
      console.log('='.repeat(60));
      console.log(`試行回数: ${times.length}`);
      console.log(`平均処理時間: ${average.toFixed(2)}ms`);
      console.log(`最短処理時間: ${min}ms`);
      console.log(`最長処理時間: ${max}ms`);
      console.log('='.repeat(60));
      
      expect(average).toBeGreaterThan(0);
    }
  }, 120000); // 2分のタイムアウト
});
