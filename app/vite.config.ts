import path from "path"
import fs from "fs"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    {
      name: 'generate-version',
      closeBundle() {
        const version = {
          version: new Date().toISOString(),
          buildTime: Date.now(),
        };
        fs.writeFileSync(
          path.resolve(__dirname, 'dist', 'version.json'),
          JSON.stringify(version)
        );
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      // /loop 静态页由后端 Express 提供（论文网页），dev 下转发到后端端口
      '/loop': {
        target: 'http://localhost:3001',
        // 立绘等素材放在 app/public/loop/sprites，由 Vite 直接提供（生产构建会复制进 dist，由 Express 托管）
        bypass: (req: any) => {
          if (req.url && req.url.startsWith('/loop/sprites/')) return req.url;
          return undefined;
        },
      },
      // /ORACLESAIDTHATCIVILSWITHNOENDSANDNOBEGINS 节点0 终局页面由后端 Express 提供
      '/ORACLESAIDTHATCIVILSWITHNOENDSANDNOBEGINS': 'http://localhost:3001',
      // /BEFORETHESARCOPHAGUS 石棺之前页面由后端 Express 提供
      '/BEFORETHESARCOPHAGUS': 'http://localhost:3001',
    },
  },
});
