"""
行业估值模型
- 银行: PB-ROE 模型
- 保险: PEV / PB
- 周期(钢铁、有色): 重置成本法 PB=1
- 消费(食品饮料): PEG 法
- 白酒: 品牌溢价PEG法（高PEG基准 + 品牌护城河溢价）
- 猪肉/养殖: 猪周期PB法 + 正常化盈利
- GPU/算力: 高PS法 + AI增长溢价
- 科技(计算机): PS 法
- 默认: PE=15
"""
from app.config import VALUATION_PARAMS, INDUSTRY_MODEL_MAP


def _pb_roe_model(financials: dict) -> float:
    """银行: 合理PB = (ROE - g) / (r - g), 内在价值 = 合理PB * 每股净资产"""
    roe = financials.get('roe', 0.10)
    bvps = financials.get('bvps', 10.0)  # 每股净资产
    r = VALUATION_PARAMS['equity_cost']
    g = VALUATION_PARAMS['growth_rate']
    if r <= g:
        fair_pb = 1.0
    else:
        fair_pb = max((roe - g) / (r - g), 0.5)
    return round(fair_pb * bvps, 2)


def _pev_model(financials: dict) -> float:
    """保险: PEV法, 若无内含价值数据则用PB"""
    ev_per_share = financials.get('ev_per_share', None)
    if ev_per_share and ev_per_share > 0:
        return round(ev_per_share * 1.0, 2)
    bvps = financials.get('bvps', 10.0)
    return round(bvps * 1.0, 2)


def _replacement_cost_model(financials: dict) -> float:
    """周期行业: 重置成本法, 合理PB≈1, 内在价值 = 每股净资产"""
    bvps = financials.get('bvps', 5.0)
    return round(bvps * 1.0, 2)


def _peg_model(financials: dict) -> float:
    """消费行业: PEG法, 合理PE = 增长率(%) * PEG基准"""
    growth = financials.get('net_profit_growth', 15.0)  # 净利润增长率%
    eps = financials.get('eps', 1.0)
    peg_base = VALUATION_PARAMS['peg_base']
    fair_pe = max(growth * peg_base, 10)
    return round(fair_pe * eps, 2)


def _ps_model(financials: dict) -> float:
    """科技行业: PS法, 内在价值 = 每股营收 * 行业PS倍数"""
    revenue_per_share = financials.get('revenue_per_share', 5.0)
    ps_ratio = VALUATION_PARAMS['tech_ps_ratio']
    return round(revenue_per_share * ps_ratio, 2)


def _baijiu_model(financials: dict) -> float:
    """白酒: 品牌溢价PEG法, 合理PE = 增长率 * PEG基准 * 品牌溢价系数"""
    growth = financials.get('net_profit_growth', 20.0)
    eps = financials.get('eps', 1.0)
    peg_base = VALUATION_PARAMS['baijiu_peg_base']
    brand_premium = VALUATION_PARAMS['baijiu_brand_premium']
    fair_pe = max(growth * peg_base * brand_premium, 15)
    return round(fair_pe * eps, 2)


def _pork_cycle_model(financials: dict) -> float:
    """猪肉/养殖: 猪周期估值, 取PB底部估值与正常化盈利估值的较高者"""
    bvps = financials.get('bvps', 5.0)
    eps = financials.get('eps', 0.5)
    pb_low = VALUATION_PARAMS['pork_cycle_pb_low']
    norm_mult = VALUATION_PARAMS['pork_normalized_eps_mult']
    # 方法1: 底部PB估值
    val_pb = bvps * pb_low
    # 方法2: 正常化盈利（取abs防止亏损年份负EPS）
    val_eps = abs(eps) * norm_mult
    return round(max(val_pb, val_eps), 2)


def _gpu_model(financials: dict) -> float:
    """GPU/算力: 高PS法 + AI增长溢价"""
    revenue_per_share = financials.get('revenue_per_share', 5.0)
    ps_ratio = VALUATION_PARAMS['gpu_ps_ratio']
    growth_premium = VALUATION_PARAMS['gpu_growth_premium']
    return round(revenue_per_share * ps_ratio * growth_premium, 2)


def _default_model(financials: dict) -> float:
    """默认: PE=15"""
    eps = financials.get('eps', 1.0)
    return round(VALUATION_PARAMS['default_pe'] * eps, 2)


_MODEL_FUNCS = {
    'pb_roe': _pb_roe_model,
    'pev': _pev_model,
    'replacement_cost': _replacement_cost_model,
    'peg': _peg_model,
    'baijiu': _baijiu_model,
    'pork_cycle': _pork_cycle_model,
    'gpu': _gpu_model,
    'ps': _ps_model,
}


def calculate_intrinsic_value(stock_code: str, industry: str, financials: dict,
                              market_data: dict = None) -> float:
    """
    计算内在价值（元/股）
    :param stock_code: 股票代码
    :param industry: 行业名称
    :param financials: 财务数据 dict (eps, bvps, roe, net_profit_growth, revenue_per_share, ev_per_share)
    :param market_data: 市场数据 dict (price, pe, pb)
    :return: 内在价值
    """
    model_name = INDUSTRY_MODEL_MAP.get(industry, 'default')
    func = _MODEL_FUNCS.get(model_name, _default_model)
    try:
        return func(financials)
    except Exception:
        return _default_model(financials)


