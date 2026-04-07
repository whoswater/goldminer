# 精准析查 微信小程序

## 目录结构

```
miniapp/
├── app.js / app.json / app.wxss   # 小程序入口
├── project.config.json             # 项目配置
├── images/                         # tabBar图标（需自行添加）
├── pages/
│   ├── index/     # 首页 - 搜索股票
│   ├── result/    # 结果页 - 数据展示 + AI分析
│   └── history/   # 历史页 - 搜索记录
└── utils/
    ├── api.js     # 后端API封装
    └── util.js    # 工具函数
```

## 使用说明

### 1. 准备工作

- 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 注册微信小程序，获取 AppID
- 修改 `project.config.json` 中的 `appid` 字段

### 2. 配置后端地址

编辑 `app.js` 中的 `baseUrl`：

```js
globalData: {
  baseUrl: 'https://your-server.com',  // 上线时替换为HTTPS地址
}
```

**开发阶段**：在微信开发者工具中勾选「不校验合法域名」即可使用 `http://127.0.0.1:8818`。

### 3. 添加 tabBar 图标

在 `images/` 目录中放入以下 4 张图标（建议 81x81px PNG）：
- `search.png` / `search-active.png`
- `history.png` / `history-active.png`

### 4. 导入项目

打开微信开发者工具 → 导入项目 → 选择 `miniapp/` 目录。

### 5. 后端跨域配置

Flask 后端需要允许小程序的请求。在 `app/__init__.py` 中添加 CORS 支持：

```bash
pip install flask-cors
```

```python
from flask_cors import CORS
CORS(app)
```

### 6. 上线部署

小程序正式上线需要：
1. 后端部署到有 HTTPS 证书的服务器
2. 在小程序后台「开发管理 → 服务器域名」配置 request 合法域名
3. 提交小程序审核

## 功能对照

| Web 版功能 | 小程序版 | 说明 |
|-----------|---------|------|
| 股票搜索 | ✅ | 搜索建议 + 历史记录 |
| AI 分析 | ✅ | 轮询异步分析 |
| 财务数据 | ✅ | 表格展示 |
| 新闻列表 | ✅ | 文字列表 |
| K线图表 | ❌ | 需集成 ec-canvas |
| PE/PB图表 | ❌ | 需集成 ec-canvas |
| PDF导出 | ❌ | 小程序不支持 |

> K线图表可后续通过 [echarts-for-weixin](https://github.com/ecomfe/echarts-for-weixin) 集成。
