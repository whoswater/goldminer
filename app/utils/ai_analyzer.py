"""
AI 业绩预期分析 — 支持多个 AI 提供商
- 豆包 (Doubao / 火山引擎 ARK)
- 通义千问 (Qwen / 阿里云 DashScope)
- Claude (Anthropic)

所有 provider 共享同一个 system prompt，输出统一的 JSON 结构。
"""
import os
import logging
import json
import re

logger = logging.getLogger(__name__)

# ── Provider 配置 ──────────────────────────────────────
# 可通过环境变量或直接修改此处配置
AI_PROVIDERS = {
    'doubao': {
        'name': '豆包',
        'api_key': os.environ.get('DOUBAO_API_KEY', 'fec315ed-fdff-4a99-91bf-fd6ccb9c69bf'),
        'base_url': os.environ.get('DOUBAO_BASE_URL', 'https://ark.cn-beijing.volces.com/api/v3'),
        'model': os.environ.get('DOUBAO_MODEL', 'doubao-seed-2-0-pro-260215'),
        'sdk': 'openai',
    },
    'qwen': {
        'name': '通义千问',
        'api_key': os.environ.get('QWEN_API_KEY', ''),
        'base_url': os.environ.get('QWEN_BASE_URL', 'https://dashscope.aliyuncs.com/compatible-mode/v1'),
        'model': os.environ.get('QWEN_MODEL', 'qwen-plus'),
        'sdk': 'openai',
    },
    'claude': {
        'name': 'Claude',
        'api_key': os.environ.get('ANTHROPIC_API_KEY', ''),
        'model': os.environ.get('CLAUDE_MODEL', 'claude-sonnet-4-20250514'),
        'sdk': 'anthropic',
    },
}

# 默认 provider（第一个有 API Key 的）
DEFAULT_PROVIDER = os.environ.get('DEFAULT_AI_PROVIDER', 'doubao')

SYSTEM_PROMPT = """你是一位专业的A股研究分析师。你的核心任务是：**预判该公司未来6~12个月的实际业绩，是否会超出当前市场一致预期。**

注意："超预期"不是指跟去年比增长多少，而是指实际业绩大概率会**高于**当前分析师一致预测值和市场定价隐含的预期；"低于预期"则相反。

请从以下维度进行前瞻性分析：

1. **分析师一致预期锚点** — 当前市场对该公司未来1~2年的EPS一致预期是多少？这是判断"超"还是"不及"的基准线。
2. **业绩趋势与拐点信号** — 近几期营收/净利润的增速是加速还是减速？毛利率/净利率有无拐点？趋势外推到未来半年会怎样？
3. **领先指标与催化剂** — 新闻中是否有产品提价、大额订单/合同、产能释放、行业政策利好、原材料成本下降等可能在未来几个季度兑现为超预期利润的信号？
4. **行业周期位置** — 行业处于上行期（需求扩张、量价齐升）还是下行期（库存高企、价格战）？周期位置对未来半年利润的影响方向？
5. **业绩预告/快报信号** — 如果已发业绩预告，预告类型和幅度是否暗示趋势延续？如果未发预告，以往这个时点未发预告本身意味着什么？
6. **估值隐含的增长预期** — 当前PE/PB隐含了多高的增长预期？如果实际增速高于隐含预期，就是超预期；反之则不及。
7. **风险因素** — 哪些因素可能导致未来业绩低于预期（政策风险、竞争加剧、原材料涨价、需求萎缩等）？

你需要完成两个任务：
**任务一：业绩预期判断**（未来6~12个月）
**任务二：合理估值测算**（未来2~3年）

请输出结构化的分析结论，格式为 JSON：
{
    "verdict": "超预期" / "符合预期" / "低于预期" / "不确定",
    "confidence": 1-5,
    "time_horizon": "预判适用的时间范围，如 2025Q3~2026Q1",
    "summary": "一句话总结：未来半年~一年业绩相对于市场预期的判断及核心理由",
    "analysis": "详细的前瞻性分析（3-5段），重点论证未来业绩可能偏离市场预期的方向和幅度",
    "key_factors": ["未来可能推动超预期的关键因素1", "因素2", ...],
    "risks": ["可能导致不及预期的风险1", "风险2", ...],
    "recommendation": "一句话操作建议",
    "valuation_forecast": {
        "method": "使用的估值方法，如 PE估值法、DCF、PEG、PB-ROE 等",
        "assumptions": "关键假设说明（增速、折现率、合理PE倍数等）",
        "years": [
            {
                "year": "2025",
                "eps_estimate": 预计EPS数值,
                "pe_low": 合理PE下限,
                "pe_mid": 合理PE中枢,
                "pe_high": 合理PE上限,
                "price_low": 对应合理股价下限,
                "price_mid": 对应合理股价中枢,
                "price_high": 对应合理股价上限
            },
            {"year": "2026", ...},
            {"year": "2027", ...}
        ],
        "current_price": 当前股价,
        "upside": "当前价相对于中枢估值的上涨/下跌空间百分比",
        "conclusion": "一句话估值结论，如：当前股价基本合理 / 低估20%建议关注 / 高估15%谨慎追高"
    }
}

要求：
- 核心是**前瞻预判**，不是回顾总结已知事实
- 明确给出你的判断基准：分析师一致预期EPS是多少，你预判的实际EPS大概在什么范围
- 如果有分析师预测数据，必须以此为锚点讨论超预期/不及预期的幅度
- 估值测算必须给出**具体数字**（EPS、PE倍数、目标价），不要只说"偏高/偏低"
- 估值要结合行业特点选择合适方法：消费股用PE/PEG，银行用PB-ROE，科技股可用PS
- 合理PE倍数要参考历史PE区间、行业均值、增速匹配度
- 如果数据不足以做出判断，诚实说明不确定性，不要强行给结论
- 分析要具体、有数据支撑，避免泛泛而谈
- 用中文回答"""


def get_available_providers() -> list[dict]:
    """返回所有已配置（有API Key）的 provider 列表"""
    result = []
    for key, cfg in AI_PROVIDERS.items():
        result.append({
            'id': key,
            'name': cfg['name'],
            'available': bool(cfg.get('api_key')),
            'model': cfg.get('model', ''),
        })
    return result


def analyze_with_ai(stock_data_text: str, code: str, provider: str = None) -> dict:
    """
    调用 AI 进行业绩预期分析
    :param stock_data_text: format_for_ai() 的输出
    :param code: 股票代码
    :param provider: AI provider 名称 (doubao/qwen/claude)，为空则用默认
    :return: AI分析结果 dict
    """
    provider = provider or DEFAULT_PROVIDER

    if provider not in AI_PROVIDERS:
        return _fallback_result(f'不支持的AI提供商: {provider}')

    cfg = AI_PROVIDERS[provider]
    api_key = cfg.get('api_key', '')
    if not api_key:
        return _fallback_result(f'{cfg["name"]} API Key 未配置')

    from datetime import datetime
    now = datetime.now().strftime('%Y年%m月')
    user_message = (
        f'当前时间: {now}\n'
        f'请预判以下股票（{code}）未来6~12个月的业绩是否会超出市场一致预期：\n\n'
        f'{stock_data_text}'
    )

    try:
        if cfg['sdk'] == 'openai':
            result = _call_openai_compatible(cfg, user_message)
        elif cfg['sdk'] == 'anthropic':
            result = _call_anthropic(cfg, user_message)
        else:
            return _fallback_result(f'未知SDK类型: {cfg["sdk"]}')

        result['provider'] = provider
        result['provider_name'] = cfg['name']
        result['model'] = cfg['model']
        logger.info(f'[{code}] AI分析完成 (provider={provider}, model={cfg["model"]})')
        return result

    except Exception as e:
        logger.error(f'[{code}] AI分析失败 ({provider}): {e}')
        return _fallback_result(f'{cfg["name"]} 调用失败: {str(e)[:200]}')


def _call_openai_compatible(cfg: dict, user_message: str) -> dict:
    """调用 OpenAI 兼容接口（豆包、千问都用这个）"""
    from openai import OpenAI

    client = OpenAI(
        api_key=cfg['api_key'],
        base_url=cfg['base_url'],
    )

    response = client.chat.completions.create(
        model=cfg['model'],
        messages=[
            {'role': 'system', 'content': SYSTEM_PROMPT},
            {'role': 'user', 'content': user_message},
        ],
        max_tokens=2000,
        temperature=0.3,
    )

    response_text = response.choices[0].message.content
    result = _parse_ai_response(response_text)
    result['raw_response'] = response_text
    return result


def _call_anthropic(cfg: dict, user_message: str) -> dict:
    """调用 Anthropic Claude API"""
    import anthropic

    client = anthropic.Anthropic(api_key=cfg['api_key'])

    message = client.messages.create(
        model=cfg['model'],
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{'role': 'user', 'content': user_message}],
    )

    response_text = message.content[0].text
    result = _parse_ai_response(response_text)
    result['raw_response'] = response_text
    return result


def _parse_ai_response(text: str) -> dict:
    """从AI响应中提取JSON结构"""
    # 尝试直接解析
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 尝试从markdown代码块中提取
    json_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # 尝试找 { ... } 块（支持嵌套）
    brace_start = text.find('{')
    if brace_start >= 0:
        depth = 0
        for i in range(brace_start, len(text)):
            if text[i] == '{':
                depth += 1
            elif text[i] == '}':
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[brace_start:i + 1])
                    except json.JSONDecodeError:
                        break

    # 解析失败，返回原始文本作为分析
    return {
        'verdict': '不确定',
        'confidence': 1,
        'summary': '未能结构化解析AI响应',
        'analysis': text,
        'key_factors': [],
        'risks': [],
        'recommendation': '请参考上述分析文本',
    }


def _fallback_result(reason: str) -> dict:
    """AI不可用时的回退结果"""
    return {
        'verdict': '不确定',
        'confidence': 0,
        'summary': reason,
        'analysis': reason,
        'key_factors': [],
        'risks': [],
        'recommendation': '',
        'ai_available': False,
    }
