# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A-share (Chinese stock market) announcement crawler and valuation analysis web application. The system crawls announcements from cninfo.com.cn, calculates company valuations using industry-specific models, and presents results via a web frontend.

## Tech Stack

- **Backend**: Python + Flask
- **Data storage**: Local CSV/JSON files via pandas (no database)
- **Scheduled tasks**: APScheduler (BackgroundScheduler)
- **Frontend**: Jinja2 templates + Bootstrap 5 + ECharts
- **Data sources**: akshare (stock lists, prices, financials) with fallback to simulated data

## Build & Run

```bash
pip install -r requirements.txt
python run.py
# Access at http://127.0.0.1:5000
```

## Architecture

The app follows Flask application factory pattern (`app/__init__.py`):

- `app/api/` — RESTful JSON endpoints (`/api/market/`, `/api/stock/`, `/api/announcements`, `/api/undervalued/`)
- `app/views/` — HTML page routes using Jinja2 templates
- `app/tasks/` — APScheduler jobs:
  - `crawler.py` — Daily 09:00, crawls announcements from cninfo/akshare
  - `valuation_updater.py` — Daily 18:00, computes valuations for all ~5000 A-share stocks
  - `scheduler.py` — Initializes and registers scheduled jobs
- `app/utils/file_storage.py` — Unified CSV/JSON read/write with auto directory creation
- `app/utils/valuation_models.py` — Industry-specific valuation models
- `data/` — All persistent data as dated CSV files (announcements, valuations, PE/PB history)
- `run.py` — Entry point, creates Flask app and starts scheduler

## Valuation Models

Each industry uses a different model in `valuation_models.py`:
- **Banking**: PB-ROE model
- **Insurance**: PEV (or PB fallback)
- **Cyclicals** (steel, metals): Replacement cost (PB-based)
- **Consumer** (food/beverage): PEG method
- **Tech** (computing): PS method
- **Default**: PE=15 for companies without sufficient financial data

## Key Design Decisions

- All data stored as local files — no database dependency. Date-based naming: `data/*/YYYY-MM-DD.csv`
- akshare API calls must be wrapped with exception handling; fall back to simulated data when unavailable
- Scheduler runs single-threaded to avoid file write conflicts
- Frontend loads data via AJAX calls to `/api/*` endpoints, renders charts with ECharts
