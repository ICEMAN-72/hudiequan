# 蝴蝶泉

四象限待办清单。左上是任务列表、右上是四象限、左下是周期任务、右下是日历 —— 一屏四格，都在视线里。

在线版：https://iceman-72.github.io/hudiequan/

## 技术栈

- React 19 + TypeScript 6 + Vite 8
- Tailwind CSS 4（`@theme` + 语义表面类，无 CSS-in-JS）
- Zustand 5 + persist（localStorage，带版本迁移链）
- Supabase（可选，跨设备同步）

## 开发

```bash
npm install
npm run dev        # 本地开发
npm run build      # tsc -b + vite build
npm run lint       # oxlint
npm test           # 日期逻辑回归测试（30 项）
npm run shots      # 拍全套界面截图到 tools/shots/
npm run deploy     # 构建并发布到 gh-pages
```

## 目录

```
src/
├── components/
│   ├── ui/Modal.tsx        统一呼出容器（圆角在外壳，body 独立滚动）
│   ├── TaskList.tsx        左上：任务树
│   ├── QuadrantView.tsx    右上：四象限
│   ├── RecurringTasksPanel.tsx  左下：周期任务（按 templateId 归组）
│   ├── Calendar.tsx        右下：月 / 周 / 日三视图
│   └── …                   统计、设置、存储柜、帮助、云同步、新建任务
├── lib/
│   ├── date.ts             日期唯一真源
│   ├── autoBackup.ts       File System Access API 自动备份
│   └── supabase.ts         云同步字段映射
├── hooks/useDailyReview.ts 每日复盘定时器
├── store/                  taskStore / settingsStore
└── index.css               设计令牌 + 语义表面 + 动效
```

## 写代码前请先读这几条

这几条都是踩过坑总结出来的，违反任何一条都会立刻出问题：

**1. `index.css` 里不要写无层级的全局重置**

像 `* { margin: 0; padding: 0 }` 这种，无层级样式优先级高于任何 `@layer`，
会把 Tailwind 全部 `p-* / m-* / space-y-*` 压成 0。表现出来就是面板没内边距、
文字顶在圆角上、卡片互相粘连。Tailwind 的 preflight 已经在 `@layer base` 做过了，
不需要再写一遍。

改完重置记得 grep 一遍负 margin（`-my-` / `-mt-` 等）—— 它们会从「无效但看起来正常」
变成「真的叠上去」。

**2. 日期一律走 `src/lib/date.ts`**

禁止 `toISOString().slice(0, 10)` 取日期。`new Date(2026, 10, 1)` 是本地时间，
转 UTC 在东八区会退回前一天，周期任务的下期日期就会一直错成当月最后一天。

**3. 判断周期任务用 `isRecurringTask(t)`**

不能写 `!t.recurrence`。`recurrence` 可能是 `'none'`，字符串 `'none'` 是 truthy，
会让带这个值的普通任务从列表和四象限里凭空消失。

**4. 表面层级：面板要虚，卡片要实**

`.surface-panel` 是外层容器（半透明 + 毛玻璃），`.surface-card` 是内容卡片（纯白 + 细边）。
两者不能同色，否则卡片浮不起来，视觉上会糊成一片。

**5. 呼出面板一律用 `ui/Modal.tsx`**

自带 Esc 关闭、锁背景滚动、header 固定、body 独立滚动、`max-height` 兜底。
不要自己拼 `rounded-[24px] + p-7 + overflow-y-auto` —— 圆角和滚动作用在同一元素上，
滚起来内容会顶到圆角上被切掉。

**6. 字号用语义类 `fs-2xs ~ fs-xl`**

全部是 rem，跟随设置里的字号缩放。不要写 `text-[9px]` 这种绝对像素。

## 数据与备份

三层，互相独立：

| 层 | 机制 | 说明 |
|---|---|---|
| 本地 | localStorage（Zustand persist） | 每次改动即时写入，带 `migrate` 版本链 |
| 自动备份 | File System Access API | 用户选一个文件夹，每天首次打开时写一份 JSON，保留最近 14 份 |
| 云同步 | Supabase | 可选，需要用户自备项目 URL + anon key |

自动备份的目录句柄存在 IndexedDB（`hudiequan-fs` / `handles` / `backup-dir`），
因为 `localStorage` 存不了 `FileSystemHandle`。授权由浏览器管理，
页面只能读写用户选中的那个目录，需要 Chrome / Edge。

## 版本

- v1.x 基础功能
- v2.0 布局重做
- v3.0 四象限 + 周期任务 + 日历三视图 + 统计
- v3.1 数据加固（本地自愈备份、损坏检测、导入反馈）
- v3.2 云同步重做
- v3.3 呼吸感根因修复（全局重置）+ 自动备份 + 统一 Modal
