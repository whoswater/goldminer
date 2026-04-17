# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

潘记制衣厂管理系统 — garment OEM recording system for a small subcontracting factory. Tracks the full lifecycle: receiving materials → configurable processing steps → return to contractor → QC → rework. Phone-based login with admin/worker roles.

## Tech Stack

- **Backend**: Python + Flask (monolithic, server-rendered Jinja2 templates)
- **Frontend**: Bootstrap 5 (CDN) + vanilla JS
- **Database**: SQLite (local file, cloud-ready via config)
- **Auth**: Phone + SHA256 password, session-based
- **Production**: gunicorn + Docker

## Build & Run

```bash
pip install -r requirements.txt
python run.py
# Access at http://127.0.0.1:5001
# Default admin: 15026841070 / 841070 (phone last 6 digits)
# Default admin: 13851234080 / 234080
```

Cloud/production deployment:
```bash
FLASK_ENV=production SECRET_KEY=xxx DB_PATH=/data/garment.db gunicorn -b 0.0.0.0:5001 run:app
# Or via Docker:
docker build -t garment . && docker run -p 5001:5001 -v /data:/data garment
```

## Architecture

### Config (`config.py`)
Environment-based config selection via `FLASK_ENV`. All secrets and paths from env vars in production. SQLite for now — designed to swap to PostgreSQL/MySQL by changing `models.py` to use SQLAlchemy with `DATABASE_URL`.

### Core Data Flow
```
拿料(Material Pickup) → 加工(Processing, steps from flow_step) → 送回(Return) → 质检(QC) → 返工(Rework if failed) → loop back
```

### Data Model
- **contractor** — 总包方, the upstream partner
- **flow_step** — per-contractor configurable process steps (e.g. 缝制→剪线头→熨烫→打包)
- **worker** + **worker_skill** — workers with multi-skill support
- **material_pickup** → **processing** → **processing_step** (one row per flow step)
- **return_record** → **qc_record** → **rework**

Key relationships:
- material_pickup 1:N processing (batch splitting)
- processing 1:N processing_step (dynamic, from flow_step)
- processing 1:N return_record → 1:1 qc_record → 1:1 rework

### Auth & Permissions
- Phone + password login, default password = phone last 6 digits, forced change on first login
- **Admin**: full access (settings, flow management, all stats, all records)
- **Worker**: sees only own processing records (filtered by processing_step.worker_id), own stats, and shared modules (material, returns, QC)
- `g.user` available in all templates via `@bp.before_app_request`

### Blueprints
| Blueprint | URL prefix | Access |
|-----------|-----------|--------|
| auth | / | public |
| material | /material | all users |
| processing | /processing | all (worker-filtered) |
| returns | /returns | all |
| qc | /qc | all |
| stats | /stats | all (different views) |
| flow | /flow | admin only |
| settings | /settings | admin only |

### Material Detail Page (`/material/<id>`)
Full lifecycle view: basic info → processing batches with flow step timeline → return/QC/rework chain per batch. Used for end-to-end traceability.

## Key Design Decisions

- Processing steps are **dynamic per contractor** via `flow_step` table, not hardcoded
- Worker skill system decoupled from flow steps — skills stored in `worker_skill` junction table
- Stats page renders different templates for admin (full analytics) vs worker (personal stats)
- All data isolated by contractor dimension in stats and filters
- Config externalized to env vars for zero-code cloud migration
