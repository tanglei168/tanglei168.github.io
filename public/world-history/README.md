# 世界历史模式

教育页和网站首页进入 /world-history/；无参数的 /jiangshan-map/ 进入世界模式。
中国详图使用 /jiangshan-map/?view=china&year=1500。旧的带 year/place/person 等参数的链接仍可访问中国详图。

## 内容与数据

- 时间轴：公元前3000年至2010年，公元纪年，没有公元0年。
- 49个世界历史疆域快照。中间年份采用不晚于选定年份的最近快照，并展示快照年份；不对边界做插值。
- 八个地理分组只是便于浏览，按几何中心粗分。跨区域政体不代表只属于某一洲。
- 地图记录涵盖政体与文化区域；数据集仍在校订，不能作为精确边界、现代主权或政体起讫的权威依据。
- 探索线索附 UNESCO 来源，日期范围表示主题覆盖时期。

全球地图来源：A. Ourednik 等，https://github.com/aourednik/historical-basemaps
固定提交与每个原始文件的 Git blob SHA 见 snapshots.json。
数据按 GPL-3.0 分发；构建会同时保存 DATA-LICENSE.txt 和 DATA-README.md。
D3 7.9.0 按 ISC 许可使用，许可证随本地分发的脚本一起保存。
本目录新增应用代码按 GPL-3.0 分发。

## 构建

pnpm build 会依次准备中国地图、全球数据并构建 Astro。
scripts/prepare-world-history.mjs 下载固定版本数据，校验 Git blob SHA，确认 GeoJSON 有效。
全球数据和 D3 发布到本站，浏览者不需要连接第三方地图 API。
构建时需访问 GitHub raw 与 jsDelivr。下载或校验失败会使构建失败，不发布缺失数据的版本。

## 交互

年份滑块、年份输入、相邻快照、自动播放、地区聚焦、缩放、当前快照中英文名称搜索、政体详情、同年地区对照、深链接与中国详图切换。
搜索与地图来源名称保持对应；尚未翻译的名称显示原始名称。
地图错误提供重试；异步年份请求只渲染最新选择，避免快速拖动时显示过期地图。
