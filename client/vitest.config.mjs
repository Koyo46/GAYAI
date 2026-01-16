import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
    // 統合テスト用の設定
    testTimeout: 120000, // 2分（統合テストは時間がかかるため）
  }
});
