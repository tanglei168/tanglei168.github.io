# 江山时序集成

访问路径：/jiangshan-map/。首页提供入口。

原始代码通过 vendor/jiangshan-map Git 子模块固定到 f1520c2ef5b3455b4ce34aba27359f1a12f198ac。
pnpm dev 和 pnpm build 会初始化该固定版本，并复制静态资源到 public/jiangshan-map/。
构建环境需要 Git 和访问 GitHub 的网络；现有 GitHub Pages 工作流无需更改。

本地首次使用可运行 git submodule update --init。更新时，在子模块中检出经过验证的新提交，再提交父仓库中的 gitlink 变化。

构建脚本将地图内部指向 https://deanchen.me/jiangshan-map 的绝对地址改为本站地址，保留作者署名、原始 README 和 LICENSE。

上游：https://github.com/DeanChensj/jiangshan-map
许可证：GPL-3.0；部分 CHGIS / Hartwell 数据另受学术、非商业用途条款约束。保留原许可，不将这些数据用于商业服务。
