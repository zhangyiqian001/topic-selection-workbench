# 贡献指南

使用Node.js 24，运行`npm ci`、`npm run build`、`npm start`。结构和隔离配置见[开发指南](docs/DEVELOPMENT.md)。

修复前明确触发条件和预期行为。新增来源时说明统计口径、日期含义、缓存及权限限制，不将演示数字、空榜或错误页当作成功数据。

提交前执行`npm run check`、`npm test`、`npm run build`；影响交互时执行`npm run test:browser`，必要时设置`CHROME_PATH`。使用隔离数据库，排除数据库、备份、Cookie、密钥和个人资料，更新文档和变更记录。

避免无关重构，保留人工整理内容、历史评分和来源口径。PR说明最终行为、验证和限制。第三方资源应说明来源及许可，不改变权利归属。
