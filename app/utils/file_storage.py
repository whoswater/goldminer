import os
import pandas as pd
from app.config import (
    ANNOUNCEMENTS_DIR, STOCKS_DIR, VALUATION_DIR,
    PE_HISTORY_DIR, PB_HISTORY_DIR, EARNINGS_DIR,
)


def _ensure_dir(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)


# ── 公告 ──────────────────────────────────────────────
def save_announcements(df: pd.DataFrame, date: str):
    path = os.path.join(ANNOUNCEMENTS_DIR, f'{date}.csv')
    _ensure_dir(path)
    df.to_csv(path, index=False, encoding='utf-8-sig')


def load_announcements(date: str) -> pd.DataFrame:
    path = os.path.join(ANNOUNCEMENTS_DIR, f'{date}.csv')
    if os.path.exists(path):
        return pd.read_csv(path, encoding='utf-8-sig', dtype=str)
    return pd.DataFrame()


def load_latest_announcements(n: int = 5) -> pd.DataFrame:
    files = sorted(
        [f for f in os.listdir(ANNOUNCEMENTS_DIR) if f.endswith('.csv')],
        reverse=True,
    )
    frames = []
    for f in files:
        df = pd.read_csv(os.path.join(ANNOUNCEMENTS_DIR, f), encoding='utf-8-sig', dtype=str)
        frames.append(df)
        if len(pd.concat(frames)) >= n:
            break
    if not frames:
        return pd.DataFrame()
    return pd.concat(frames).head(n)


def load_all_announcements() -> pd.DataFrame:
    files = sorted(
        [f for f in os.listdir(ANNOUNCEMENTS_DIR) if f.endswith('.csv')],
        reverse=True,
    )
    if not files:
        return pd.DataFrame()
    frames = [
        pd.read_csv(os.path.join(ANNOUNCEMENTS_DIR, f), encoding='utf-8-sig', dtype=str)
        for f in files
    ]
    return pd.concat(frames, ignore_index=True)


# ── 股票列表 ──────────────────────────────────────────
def save_stock_list(df: pd.DataFrame):
    path = os.path.join(STOCKS_DIR, 'stock_list.csv')
    _ensure_dir(path)
    df.to_csv(path, index=False, encoding='utf-8-sig')


def load_stock_list() -> pd.DataFrame:
    path = os.path.join(STOCKS_DIR, 'stock_list.csv')
    if os.path.exists(path):
        return pd.read_csv(path, encoding='utf-8-sig', dtype=str)
    return pd.DataFrame()


# ── 估值快照 ──────────────────────────────────────────
def save_valuation_snapshot(df: pd.DataFrame, date: str):
    path = os.path.join(VALUATION_DIR, f'{date}.csv')
    _ensure_dir(path)
    df.to_csv(path, index=False, encoding='utf-8-sig')


def load_valuation_snapshot(date: str) -> pd.DataFrame:
    path = os.path.join(VALUATION_DIR, f'{date}.csv')
    if os.path.exists(path):
        return pd.read_csv(path, encoding='utf-8-sig')
    return pd.DataFrame()


def load_latest_valuation() -> pd.DataFrame:
    files = sorted(
        [f for f in os.listdir(VALUATION_DIR) if f.endswith('.csv')],
        reverse=True,
    )
    if files:
        return pd.read_csv(os.path.join(VALUATION_DIR, files[0]), encoding='utf-8-sig')
    return pd.DataFrame()


# ── 历史 PE / PB ─────────────────────────────────────
def update_historical_pe(code: str, date: str, pe: float):
    path = os.path.join(PE_HISTORY_DIR, f'{code}.csv')
    if os.path.exists(path):
        df = pd.read_csv(path)
    else:
        df = pd.DataFrame(columns=['date', 'pe'])
    new_row = pd.DataFrame([{'date': date, 'pe': pe}])
    df = pd.concat([df, new_row], ignore_index=True)
    df.drop_duplicates(subset='date', keep='last', inplace=True)
    df.sort_values('date', inplace=True)
    df.to_csv(path, index=False)


def update_historical_pb(code: str, date: str, pb: float):
    path = os.path.join(PB_HISTORY_DIR, f'{code}.csv')
    if os.path.exists(path):
        df = pd.read_csv(path)
    else:
        df = pd.DataFrame(columns=['date', 'pb'])
    new_row = pd.DataFrame([{'date': date, 'pb': pb}])
    df = pd.concat([df, new_row], ignore_index=True)
    df.drop_duplicates(subset='date', keep='last', inplace=True)
    df.sort_values('date', inplace=True)
    df.to_csv(path, index=False)


def load_historical_pe(code: str) -> pd.DataFrame:
    path = os.path.join(PE_HISTORY_DIR, f'{code}.csv')
    if os.path.exists(path):
        return pd.read_csv(path)
    return pd.DataFrame(columns=['date', 'pe'])


def load_historical_pb(code: str) -> pd.DataFrame:
    path = os.path.join(PB_HISTORY_DIR, f'{code}.csv')
    if os.path.exists(path):
        return pd.read_csv(path)
    return pd.DataFrame(columns=['date', 'pb'])


# ── 业绩超预期 ──────────────────────────────────────
def save_earnings(df: pd.DataFrame, date: str):
    path = os.path.join(EARNINGS_DIR, f'{date}.csv')
    _ensure_dir(path)
    df.to_csv(path, index=False, encoding='utf-8-sig')


def load_earnings(date: str) -> pd.DataFrame:
    path = os.path.join(EARNINGS_DIR, f'{date}.csv')
    if os.path.exists(path):
        return pd.read_csv(path, encoding='utf-8-sig', dtype=str)
    return pd.DataFrame()


def load_latest_earnings(days: int = 30) -> pd.DataFrame:
    """加载最近N天的业绩信号数据"""
    if not os.path.exists(EARNINGS_DIR):
        return pd.DataFrame()
    files = sorted(
        [f for f in os.listdir(EARNINGS_DIR) if f.endswith('.csv')],
        reverse=True,
    )[:days]
    if not files:
        return pd.DataFrame()
    frames = [
        pd.read_csv(os.path.join(EARNINGS_DIR, f), encoding='utf-8-sig', dtype=str)
        for f in files
    ]
    return pd.concat(frames, ignore_index=True)


# ── PE趋势（全市场平均PE） ───────────────────────────
def load_pe_trend(days: int = 30) -> list:
    """从估值快照中提取近N天的全市场平均PE"""
    files = sorted(
        [f for f in os.listdir(VALUATION_DIR) if f.endswith('.csv')],
        reverse=True,
    )[:days]
    result = []
    for f in reversed(files):
        date = f.replace('.csv', '')
        df = pd.read_csv(os.path.join(VALUATION_DIR, f), encoding='utf-8-sig')
        if 'pe' in df.columns:
            avg_pe = df['pe'].dropna().mean()
            result.append({'date': date, 'avg_pe': round(avg_pe, 2)})
    return result
