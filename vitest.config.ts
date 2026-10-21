import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    env: {
      // 测试使用独立的数据库，避免污染开发库 dev.db
      DATABASE_URL: "file:./test.db",
    },
    // 全量并行时 jsdom 环境创建与路由模块冷启动导入较慢，
    // 默认 5s 会误报超时，放宽到 30s
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
