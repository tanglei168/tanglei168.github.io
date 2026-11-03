# 铜匠实验室 · 本站镜像

教育页入口：`/k1-k12/tongjiang-lab/`。导航与总览卡片也会指向这里。

## 内容来源

上游仓库：https://github.com/smithjohn78390/tongjiang-lab  
在线原站：https://lab.tongjiang.app  

本站通过 `vendor/tongjiang-lab` Git 子模块固定上游提交，构建时由 `scripts/prepare-tongjiang-lab.mjs` 复制课件 HTML、封面、`catalog.json`、许可证与第三方声明到本目录。

课件、封面与目录按 **CC BY-NC 4.0** 使用；请保留对「铜匠实验室 / Tongjiang Lab (https://lab.tongjiang.app)」的署名。课件内嵌的 three.js 等第三方代码仍按其原许可，见 `THIRD_PARTY_NOTICES.md`。本站镜像仅用于非商业学习展示，不宣称与人民教育出版社有关联。

## 构建

`pnpm dev` / `pnpm build` 会初始化子模块并准备本目录资源。首次本地使用可先运行：

```sh
git submodule update --init -- vendor/tongjiang-lab
node scripts/prepare-tongjiang-lab.mjs
```

更新上游时：在子模块中检出经过验证的新提交，同步修改 `scripts/prepare-tongjiang-lab.mjs` 中的 PINNED 常量，再提交父仓库的 gitlink 变化。

## 页面说明

本目录下的 `index.html` 为本站课程目录页（风格贴近 K1–K12 教育页）。点击课程卡片会打开对应的自包含 HTML 课件。
