# 人体结构 · Learning MVP

基于 [thebuggeddev/anatomy](https://github.com/thebuggeddev/anatomy) 的可运行产品改造版。保留原有视觉风格与器官探索，补齐人体总览、Systems、Lessons、Library、Notes。

## 本地运行

需要 Node.js **22.13+**（建议 24）。

```bash
npm ci
npm run dev:local
```

打开 http://127.0.0.1:4317/zh 。`dev:local` 无需云端账号或数据库；原有 Cloudflare 模式仍可通过 `npm run dev` 启动。

## 已实现

- 真人比例的 3D 人体外框，复用 8 份器官库 GLB；选中高亮、旋转缩放、正侧背观察、单独查看、展开关系、进入对应器官 3D。
- 肤色 3D 外层支持显示/隐藏与 10–100% 不透明度；骨骼独立开关。修正尾骨误用手部变换造成的悬空位置。
- 20 项主要器官/结构的区域、空间位置和多系统归属；11 个系统。
- 4 条跨系统协作链路，5 节带先修条件与检查题的课程。
- 29 项长期知识资源；搜索、分类和收藏。
- 关联笔记、标签、编辑、归档恢复、本地持久化与 JSON 导入导出。
- URL hash 导航支持刷新和浏览器前进后退；3D 按需加载。

## 验证

```bash
npm run typecheck
npm test
npm run build
# 启动本地服务后：
npm run test:ssr
```

测试覆盖内容关系完整性、导航、答题条件、收藏、笔记持久化、归档恢复、损坏数据保护、深链接、实际服务响应与 GLB 文件完整性。DOM 测试使用模拟的 3D 容器，不替代浏览器 WebGL 与视觉验收。

## 说明文档

- [信息架构与数据模型](docs/PRODUCT-ARCHITECTURE.md)
- [3D 资产来源](docs/ASSET-SOURCES.md)
- [MakeHuman 原始许可](docs/MAKEHUMAN-LICENSE.md)

新增内容为中文。个人学习数据保存在当前浏览器，不支持账号同步。人体总览使用独立器官模型的空间组合，不是同一次人体扫描的医学配准结果。

## 仓库来源

本地基于上游 main 源码快照建立了 Git 仓库，`upstream` 指向原项目。GitHub 远程 fork 尚待完成，不能把本地副本当成已建立的 GitHub fork。

## 个人网站发布

线上入口：`https://tanglei168.github.io/k1-k12/human-body/`，显示名称为“人体结构”。

使用 Node.js 22.13 或更新版本：

```sh
npm ci
npm run build:pages
npm run preview:pages
```

`dist-pages/` 为完整静态产物，包含全部模型、图片及 12 个语言目录。复制到个人网站仓库的 `public/k1-k12/human-body/`，由现有 Astro / GitHub Pages 流程发布。源码保存在个人网站仓库的 `projects/human-body/`。

可通过 `PAGES_BASE_PATH` 覆盖发布目录。学习记录仍保存在浏览器本地，可导出和导入；服务端预览方式继续保留。
