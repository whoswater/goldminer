import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
LOG_DIR = os.path.join(BASE_DIR, 'logs')

ANNOUNCEMENTS_DIR = os.path.join(DATA_DIR, 'announcements')
STOCKS_DIR = os.path.join(DATA_DIR, 'stocks')
VALUATION_DIR = os.path.join(DATA_DIR, 'valuation')
PE_HISTORY_DIR = os.path.join(DATA_DIR, 'historical', 'pe_history')
PB_HISTORY_DIR = os.path.join(DATA_DIR, 'historical', 'pb_history')

EARNINGS_DIR = os.path.join(DATA_DIR, 'earnings')

ALL_DIRS = [
    ANNOUNCEMENTS_DIR, STOCKS_DIR, VALUATION_DIR,
    PE_HISTORY_DIR, PB_HISTORY_DIR, EARNINGS_DIR, LOG_DIR,
]

# 估值模型默认参数
VALUATION_PARAMS = {
    'default_pe': 15,
    'risk_free_rate': 0.03,       # 无风险利率
    'equity_cost': 0.10,          # 股权成本
    'growth_rate': 0.05,          # 长期增长率
    'peg_base': 1.0,              # PEG基准倍数
    'tech_ps_ratio': 5.0,         # 科技行业PS倍数
    # 白酒专属
    'baijiu_peg_base': 1.2,      # 白酒品牌溢价PEG基准（高于普通消费）
    'baijiu_brand_premium': 1.15, # 品牌护城河溢价系数
    # 猪肉专属
    'pork_cycle_pb_low': 1.5,    # 猪周期底部合理PB
    'pork_cycle_pb_high': 3.0,   # 猪周期顶部合理PB
    'pork_normalized_eps_mult': 12,  # 猪肉正常化EPS倍数
    # GPU/算力专属
    'gpu_ps_ratio': 8.0,         # GPU行业PS倍数（高于一般科技）
    'gpu_growth_premium': 1.3,   # AI算力增长溢价
}

# 行业分类映射
INDUSTRY_MODEL_MAP = {
    '银行': 'pb_roe',
    '保险': 'pev',
    '钢铁': 'replacement_cost',
    '有色金属': 'replacement_cost',
    '采掘': 'replacement_cost',
    '食品饮料': 'peg',
    '白酒': 'baijiu',
    '猪肉': 'pork_cycle',
    '养殖业': 'pork_cycle',
    'GPU': 'gpu',
    '算力': 'gpu',
    '家用电器': 'peg',
    '医药生物': 'peg',
    '计算机': 'ps',
    '电子': 'ps',
    '通信': 'ps',
    '传媒': 'ps',
}

# 重点关注板块
FOCUS_SECTORS = {
    '白酒': {
        'label': '白酒',
        'color': '#c0392b',
        'icon': '',
        'desc': '高端白酒品牌溢价 + PEG模型',
    },
    '猪肉': {
        'label': '猪肉/养殖',
        'color': '#e67e22',
        'icon': '',
        'desc': '猪周期PB估值 + 正常化盈利',
    },
    'GPU': {
        'label': 'GPU/算力',
        'color': '#2980b9',
        'icon': '',
        'desc': 'PS估值 + AI算力增长溢价',
    },
}

# 股票代码 -> 细分行业（用于给akshare拿到的股票打标签）
STOCK_SECTOR_MAP = {
    # 白酒
    '600519': '白酒', '000858': '白酒', '000568': '白酒', '002304': '白酒',
    '600809': '白酒', '000799': '白酒', '603369': '白酒', '600559': '白酒',
    '000596': '白酒', '600702': '白酒', '603589': '白酒', '600779': '白酒',
    '000860': '白酒', '603198': '白酒',
    # 猪肉/养殖
    '002714': '猪肉', '300498': '猪肉', '002157': '猪肉', '600975': '猪肉',
    '603363': '猪肉', '002567': '猪肉', '001209': '猪肉', '002311': '猪肉',
    '300735': '猪肉', '600985': '猪肉',
    # GPU/算力
    '300474': 'GPU', '688256': 'GPU', '300223': 'GPU', '688047': 'GPU',
    '002049': 'GPU', '688037': 'GPU', '603019': 'GPU', '300101': 'GPU',
    '688041': 'GPU', '002371': 'GPU',
}
