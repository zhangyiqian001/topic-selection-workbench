# 开发指南

浏览器React界面通过`/api/*`访问本机Node.js服务；后端负责SQLite、备份、采集调度和可选本地模型。

| 路径 | 职责 |
|---|---|
| `src/App.jsx` | 页面、表单和交互 |
| `src/inbox-filters.js` | 联动筛选、标签和发布时间回退 |
| `src/readability.css` | 字号、对比度与移动端可读性 |
| `backend/http.mjs` | 服务和API |
| `backend/store.mjs` | 数据库、迁移、去重、历史与备份 |
| `backend/collector.mjs` | 调度、范围、并发、公开请求及日志 |
| `backend/platforms.mjs` | 平台解析与抖音一日榜 |
| `backend/bili-ranking.mjs` | B站分区配置和排行榜 |
| `backend/rsshub.mjs` | 厂商路由和订阅类别 |
| `backend/xhs-public.mjs` | 小红书第三方每日话题快照 |
| `backend/assessment.mjs` | 自动初筛v2 |
| `backend/legacy-assessment.mjs` | 旧六维兼容规则 |
| `backend/model.mjs` | 本地模型请求与校验 |
| `feeds.mjs` | RSS/Atom和纯文本摘要 |
| `tests-v01/` | 当前单元与浏览器测试 |
| `legacy-v1/`、`tests/` | 历史实现和测试，非默认入口 |

## 隔离开发

PowerShell：

```powershell
$env:STUDIO_DATA_DIR = Join-Path (Get-Location) 'work/dev-data'
$env:STUDIO_NO_SCHEDULE = '1'
npm start
```

另一终端运行`npm run dev`。Vite代理固定到本机4173，修改后端端口需同步调整开发代理。

API见`backend/http.mjs`，包括状态、素材、选题、评分、来源、采集、备份与恢复；内部字段不承诺稳定对外API。

## 数据与发布约定

采用可重复增量迁移，兼容旧库和JSON；区分发布、统计、快照、入库时间；真实返回后入库，不把累计指标冒充增长；保留人工编辑与历史；恢复先校验、保存恢复前备份并在失败时回滚。

验证：`npm run check`、`npm test`、`npm run build`、`npm run test:browser`。测试默认Chrome路径适用于Windows，其他环境设置`CHROME_PATH`；CI安装Chromium后设置该变量。

发布时同步包版本、锁文件、CHANGELOG及发布说明。后端行为变更同步`backend/runtime.mjs`版本标识，避免旧服务与新页面错配。

本地提交后创建注释标签；明确授权后才推送远程或创建GitHub Release。构建可重建，不提交个人数据库、依赖与临时产物。
