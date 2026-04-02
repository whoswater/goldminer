# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY="your-key-here"  # 用于AI分析功能
python run.py
# Access at http://127.0.0.1:8080
```

On first launch, the scheduler automatically crawls 7 days of announcements and generates initial valuation data.

## Architecture

Flask app, 2 pages only:
- **首页 (`/`)** — 搜索股票代码，触发综合分析（数据采集 + AI判断业绩是否超预期）
- **搜索记录 (`/history`)** — 历史搜索列表

### Core Analysis Flow

```
用户输入股票代码 → /api/analyze/<code> (异步)
  → stock_data_collector.collect_stock_data()  # 采集11类数据
  → format_for_ai()                           # 格式化为文本
  → ai_analyzer.analyze_with_ai()             # 调用Claude API分析
  → 返回结构化判断结果
```

前端通过轮询 `/api/analyze/<code>` 获取进度和结果。

### Data Collection (`app/utils/stock_data_collector.py`)

从 akshare 采集的数据源（每个独立 try/except，互不影响）：
1. `stock_individual_info_em` — 基本信息（市值、行业、上市时间）
2. `stock_zh_a_daily` — 实时行情 + K线趋势
3. `stock_financial_abstract` — 财务摘要（净利润、营收、毛利率等多期数据）
4. `stock_yjyg_em` — 业绩预告（预增/预减/扭亏/首亏等）
5. `stock_yjkb_em` — 业绩快报（EPS、营收同比、净利润同比）
6. `stock_profit_forecast_ths` — 分析师盈利预测（机构数、EPS均值/范围）
7. `stock_news_em` — 个股新闻
8. 本地公告数据、业绩信号分析、估值数据

### AI Analysis (`app/utils/ai_analyzer.py`)

调用 Claude API (claude-sonnet-4-20250514)，输入所有采集数据的文本摘要，输出结构化 JSON：
- verdict: 超预期/符合预期/低于预期/不确定
- confidence: 1-5
- summary, analysis, key_factors, risks, recommendation

API Key 通过 `ANTHROPIC_API_KEY` 环境变量读取。未设置时降级为"AI不可用"提示。

### Background Tasks (APScheduler)

- 09:00 daily: 爬取公告 + 分析业绩信号
- 18:00 daily: 更新估值数据
- Scheduler is single-threaded (`use_reloader=False` required)

### Data Storage

All CSV files under `data/`, date-stamped:
- `data/announcements/YYYY-MM-DD.csv`
- `data/earnings/YYYY-MM-DD.csv` (业绩信号)
- `data/valuation/YYYY-MM-DD.csv`
- `data/historical/pe_history/<code>.csv`
- `data/search_history.json`

### Key Conventions

- akshare API calls must be wrapped in try/except — unreliable, app must degrade gracefully
- Stock code: 6-digit string, exchange prefix (`sh`/`sz`/`bj`) only for 新浪 APIs
- `/api/analyze/<code>` is async: first call starts background thread, frontend polls until done
- Earnings signal keywords in `app/utils/earnings_analyzer.py`: 预增/扭亏 = positive, 预减/首亏 = negative
