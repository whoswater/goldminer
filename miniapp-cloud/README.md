# 精准析查 - 微信云开发版

无需服务器、无需域名、无需ICP备案。

## 目录结构

```
miniapp-cloud/
├── miniprogram/              # 小程序前端
│   ├── pages/
│   │   ├── index/            # 首页（搜索）
│   │   ├── result/           # 分析结果
│   │   └── history/          # 搜索历史
│   └── utils/
│       ├── cloud.js          # 云函数调用封装
│       └── util.js           # 工具函数
├── cloudfunctions/           # 云函数（Node.js）
│   ├── initStockList/        # 初始化股票列表到云数据库
│   ├── searchSuggest/        # 搜索建议
│   ├── searchHistory/        # 搜索历史管理
│   └── analyzeStock/         # 核心：数据采集 + AI分析
│       ├── data_collector.js # 东方财富 HTTP API 数据采集
│       └── ai_analyzer.js    # AI分析（豆包/通义千问/Claude）
└── project.config.json
```

## 部署步骤

### 1. 开通云开发

微信开发者工具 → 云开发 → 开通 → 创建环境（选基础版，免费额度够用）

### 2. 创建云数据库集合

在云开发控制台 → 数据库 → 创建 2 个集合：
- `stock_list` — 股票列表（权限：所有用户可读）
- `search_history` — 搜索历史（权限：仅创建者可读写）

### 3. 部署云函数

在开发者工具中，右键每个云函数目录 → 上传并部署（云端安装依赖）：
1. `initStockList`
2. `searchSuggest`
3. `searchHistory`
4. `analyzeStock`

### 4. 初始化股票列表

在开发者工具中，右键 `initStockList` → 云端测试 → 执行一次
（约写入 5000+ 条股票数据，需等待几分钟）

### 5. 配置 AI API Key

云开发控制台 → 云函数 → `analyzeStock` → 编辑 → 环境变量：

| 变量名 | 说明 |
|--------|------|
| `DOUBAO_API_KEY` | 豆包 API Key（推荐，国内最快） |
| `DOUBAO_MODEL` | 豆包模型，默认 `doubao-pro-32k` |
| `QWEN_API_KEY` | 通义千问 API Key（备选） |
| `ANTHROPIC_API_KEY` | Claude API Key（备选） |

至少配置一个即可。在 `miniprogram/app.js` 的 `aiProvider` 中选择对应的提供商。

### 6. 完成

编译运行即可。

## 与原版（miniapp/）的区别

| | miniapp（原版） | miniapp-cloud（云开发版） |
|---|---|---|
| 后端 | Flask 服务器 | 无，云函数替代 |
| 域名/备案 | 需要 | 不需要 |
| 数据采集 | Python akshare | Node.js 直调东方财富 API |
| 数据存储 | 本地 CSV/JSON | 云数据库 |
| AI调用 | 服务端 Python | 云函数 Node.js |
| 调用方式 | wx.request | wx.cloud.callFunction |
| 费用 | 服务器费用 | 基础版免费 |

## 免费额度（基础版）

- 云函数：40万次/月
- 云数据库：2GB 存储 + 500次/天读写
- 云存储：5GB

日常使用完全够用。
