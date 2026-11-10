import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const BASE = '/hudiequan/'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // autoUpdate：新版本部署后自动接管并刷新。
      // 本地工具天天在改，让用户手动点「有新版本」不现实；
      // 代价是可能刷掉正在输入的编辑框 —— 编辑是模态的、状态都在 store 里，风险可接受。
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: '蝴蝶泉',
        short_name: '蝴蝶泉',
        description: '四象限任务管理 —— 立即执行 / 计划安排 / 委托处理 / 尽量减少',
        lang: 'zh-CN',
        // 和 index.html 的 theme-color 保持一致：启动画面与状态栏都是浅色。
        // 不要填主色紫，否则一进 App 顶上就是一道紫条。
        theme_color: '#F8F9FE',
        background_color: '#F8F9FE',
        display: 'standalone',
        orientation: 'portrait',
        // 部署在 GitHub Pages 子路径下，这三处都必须带前缀，否则装完是白屏
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        // 带 hash 的 assets 走 precache；导航请求回退到 index.html，
        // 否则子路径下直接刷新会 404
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  base: BASE,
})
