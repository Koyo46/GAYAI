# テスト用音声ファイル

このディレクトリには、統合テストで使用する音声ファイルを配置します。

## WebM音声ファイルの作成方法

### 方法1: ブラウザのMediaRecorder APIを使用（推奨）

1. ブラウザの開発者ツールのコンソールで以下を実行：

```javascript
// マイクから録音
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    const chunks = [];
    
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'test-audio.webm';
      a.click();
    };
    
    recorder.start();
    console.log('録音開始... 5秒後に自動停止します');
    setTimeout(() => recorder.stop(), 5000);
  });
```

2. ダウンロードされた `test-audio.webm` を `tests/fixtures/` に配置

### 方法2: FFmpegを使用（コマンドライン）

```bash
# FFmpegをインストール（未インストールの場合）
# Windows: choco install ffmpeg
# macOS: brew install ffmpeg
# Linux: sudo apt-get install ffmpeg

# 既存の音声ファイルをWebMに変換
ffmpeg -i input.wav -c:a libopus test-audio.webm

# または、マイクから直接録音（5秒間）
ffmpeg -f dshow -i audio="マイク名" -t 5 -c:a libopus test-audio.webm
```

### 方法3: オンラインツールを使用

1. [Online Audio Converter](https://online-audio-converter.com/) などのツールを使用
2. 音声ファイルをアップロードしてWebM形式に変換
3. ダウンロードして `tests/fixtures/` に配置

### 方法4: 既存の音声ファイルを変換

```bash
# MP3 → WebM
ffmpeg -i input.mp3 -c:a libopus test-audio.webm

# WAV → WebM
ffmpeg -i input.wav -c:a libopus test-audio.webm

# M4A → WebM
ffmpeg -i input.m4a -c:a libopus test-audio.webm
```

## 推奨設定

- **長さ**: 3-10秒程度（短すぎると認識されない可能性）
- **形式**: `audio/webm` (Opusコーデック)
- **サイズ**: 10KB以上（1000バイト未満はスキップされる）
- **内容**: 日本語の音声（「こんにちは」「今日はいい天気ですね」など）

## ファイル名

テストコードは `test-audio.webm` という名前を期待しています。
別の名前を使用する場合は、テストコードを修正してください。
