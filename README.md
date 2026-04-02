# GoldMiner — A股业绩预期分析系统

基于 Flask + AI 的 A 股上市公司业绩预期分析工具。输入股票代码，系统自动采集 14 类数据，调用 AI 预判未来 6~12 个月业绩是否会超出市场一致预期。

## 核心功能

- **股票搜索** — 支持代码/名称模糊搜索，预缓存全部 5000+ 只 A 股
- **多源数据采集** — 并行采集 14 类数据（财务报表、业绩预告、分析师预测、资金流向、新闻等），耗时约 8~15 秒
- **AI 预期分析** — 将采集数据输入 AI（支持豆包/千问/Claude 切换），判断业绩超预期/符合预期/低于预期
- **两阶段渲染** — 数据就绪后先展示，AI 分析完成后自动补充，减少用户等待
- **PDF 导出** — 一键导出完整分析报告为 PDF
- **搜索记录** — 保留历史查询，一键再次分析

## 数据源（14 类，全部并行采集）

| 数据 | 来源 | 用途 |
|------|------|------|
| 基本信息 | `stock_individual_info_em` | 市值、行业、上市时间 |
| 实时行情 | 全市场实时缓存 / `stock_zh_a_daily` | 最新价、涨跌幅、成交额 |
| 财务摘要 | `stock_financial_abstract` | 多期净利润、营收、毛利率等 |
| 利润表 | `stock_financial_benefit_ths` | 季度级营收/净利润趋势 |
| 现金流量表 | `stock_financial_cash_ths` | 盈利质量验证 |
| 业绩预告 | `stock_yjyg_em` | 预增/预减/扭亏/首亏等信号 |
| 业绩快报 | `stock_yjkb_em` | EPS、营收/净利润同比 |
| 分析师预测 | `stock_profit_forecast_ths` | 一致预期 EPS（超预期判断锚点） |
| 主力资金流向 | `stock_individual_fund_flow` | 聪明资金动向 |
| 十大流通股东 | `stock_circulate_stock_holder` | 机构持仓变化 |
| 个股新闻 | `stock_news_em` | 催化剂信号 |
| K线趋势 | `stock_zh_a_daily` | 30/90 天涨跌、均线 |
| 公告/业绩信号 | 本地爬取数据 | 公告标题中的业绩关键词 |
| 估值 | 本地模型计算 | PE/PB、内在价值 |

## 安装与运行

```bash
pip install -r requirements.txt
python run.py
```

浏览器访问 http://127.0.0.1:8080

### AI 配置

豆包 API Key 已内置。如需使用其他 AI：

```bash
# 通义千问
export QWEN_API_KEY="sk-xxx"

# Claude
export ANTHROPIC_API_KEY="sk-ant-xxx"
```

可通过环境变量覆盖模型：
```bash
export DOUBAO_MODEL="doubao-seed-2-0-pro-260215"
export QWEN_MODEL="qwen-plus"
export CLAUDE_MODEL="claude-sonnet-4-20250514"
```

## 页面

| 路径 | 说明 |
|------|------|
| `/` | 首页：搜索股票 → 展示完整分析（AI 判断、财务数据、资金流向、新闻等） |
| `/history` | 搜索记录，支持一键再次分析 |

## 技术栈

- **后端**: Python + Flask
- **数据源**: akshare（A股行情、财务、公告）
- **AI**: 豆包/千问 (OpenAI 兼容) + Claude (Anthropic SDK)
- **前端**: Bootstrap 5 + ECharts
- **存储**: 本地 CSV/JSON，无需数据库
- **定时任务**: APScheduler（09:00 爬公告，18:00 更新估值）
