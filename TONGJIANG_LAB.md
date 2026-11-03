# 铜匠实验室集成

访问路径：`/k1-k12/tongjiang-lab/`。教育 Tab（`/k1-k12/`）总览与顶栏提供入口。

原始课件通过 `vendor/tongjiang-lab` Git 子模块固定到 `4d63ce0a72d987c850ec6d919e570bdb752c87a6`。
`pnpm dev` 和 `pnpm build` 会初始化该固定版本，并复制课程、封面与许可证到 `public/k1-k12/tongjiang-lab/`。
构建环境需要 Git 和访问 GitHub 的网络；现有 GitHub Pages 工作流无需更改。

本地首次使用可运行 `git submodule update --init -- vendor/tongjiang-lab`。更新时，在子模块中检出经过验证的新提交，更新准备脚本中的 PINNED 常量，再提交父仓库中的 gitlink 变化。

上游：https://github.com/smithjohn78390/tongjiang-lab  
许可证：CC BY-NC 4.0（课件 / 封面 / 目录）；署名「铜匠实验室 / Tongjiang Lab (https://lab.tongjiang.app)」。第三方代码见仓库内 `THIRD_PARTY_NOTICES.md`。
