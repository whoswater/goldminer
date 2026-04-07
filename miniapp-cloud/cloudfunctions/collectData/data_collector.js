/**
 * 数据采集模块 — 10类数据并行采集
 * 腾讯财经: 实时行情  |  新浪: K线  |  东方财富 emweb/datacenter: 财务、股东、资金、业绩预告、营收分解、新闻
 */
const http = require('http')
const https = require('https')

// ========== HTTP ==========

function httpGet(url, opts = {}) {
  const { timeout = 4000, encoding = 'utf-8' } = opts
  const mod = url.startsWith('https') ? https : http
  return new Promise((resolve, reject) => {
    const req = mod.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://finance.eastmoney.com/' },
      timeout,
    }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const buf = Buffer.concat(chunks)
        resolve(encoding === 'gbk' ? new TextDecoder('gbk').decode(buf) : buf.toString('utf-8'))
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
  })
}

async function fetchJson(url) { return JSON.parse(await httpGet(url)) }
function sf(v) { if (v == null || v === '' || v === '-') return null; const n = Number(v); return isNaN(n) ? null : n }
function rd(n, d = 2) { return Math.round(n * 10 ** d) / 10 ** d }
function sina(code) { return (code[0] === '6' || code[0] === '5') ? 'sh' + code : 'sz' + code }
function emPfx(code) { return (code[0] === '6' || code[0] === '5') ? 'SH' : 'SZ' }
function emMkt(code) { return (code[0] === '6' || code[0] === '5') ? '1' : '0' }

// ========== 1. 腾讯实时行情 ==========
async function fetchRealtimeQuote(code) {
  const raw = await httpGet(`https://qt.gtimg.cn/q=${sina(code)}`, { encoding: 'gbk' })
  const m = raw.match(/"([^"]+)"/); if (!m) return null
  const p = m[1].split('~'); if (p.length < 50) return null
  return { name: p[1], code: p[2], price: sf(p[3]), prev_close: sf(p[4]), open: sf(p[5]), volume: sf(p[6]), high: sf(p[33]), low: sf(p[34]), amount: sf(p[37]), pct_change: sf(p[32]), change: sf(p[31]) }
}

// ========== 2. 腾讯基本信息 ==========
async function fetchBasicInfo(code) {
  const raw = await httpGet(`https://qt.gtimg.cn/q=${sina(code)}`, { encoding: 'gbk' })
  const m = raw.match(/"([^"]+)"/); if (!m) return null
  const p = m[1].split('~'); if (p.length < 50) return null
  return { name: p[1], code: p[2], pe: sf(p[39]), pb: sf(p[46]), total_market_cap: sf(p[45]), circulating_market_cap: sf(p[44]) }
}

// ========== 3. 新浪K线 ==========
async function fetchKlineTrend(code) {
  const raw = await httpGet(`https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${sina(code)}&scale=240&ma=no&datalen=180`)
  let d; try { d = JSON.parse(raw) } catch { return null }
  if (!Array.isArray(d) || d.length < 5) return null
  const c = d.map(x => parseFloat(x.close)), l = c.length
  return {
    days: l, latest_close: c[l - 1], high_180d: rd(Math.max(...c)), low_180d: rd(Math.min(...c)),
    change_30d_pct: l > 30 ? rd((c[l - 1] / c[l - 30] - 1) * 100) : 0,
    change_90d_pct: l > 90 ? rd((c[l - 1] / c[l - 90] - 1) * 100) : 0,
    ma5: rd(c.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, l)),
    ma10: rd(c.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, l)),
    ma20: rd(c.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, l)),
    ma60: rd(c.slice(-60).reduce((a, b) => a + b, 0) / Math.min(60, l)),
  }
}

// ========== 4. 东方财富：财务摘要（多期） ==========
async function fetchFinancialSummary(code) {
  const j = await fetchJson(`https://emweb.securities.eastmoney.com/PC_HSF10/NewFinanceAnalysis/ZYZBAjaxNew?type=0&code=${emPfx(code)}${code}`)
  if (!j.data || !j.data.length) return null
  const fmt = (d) => ({
    report_date: d.REPORT_DATE_NAME || '',
    eps: sf(d.EPSJB), bps: sf(d.BPS),
    net_profit: sf(d.PARENTNETPROFIT), revenue: sf(d.TOTALOPERATEREVE),
    gross_margin: sf(d.XSMLL), net_margin: sf(d.XSJLL),
    roe: sf(d.ROEJQ),
    net_profit_yoy: sf(d.PARENTNETPROFITTZ), revenue_yoy: sf(d.TOTALOPERATEREVETZ),
    debt_ratio: sf(d.ZCFZL), current_ratio: sf(d.LD),
  })
  const result = fmt(j.data[0])
  if (j.data[1]) { const p = fmt(j.data[1]); result.prev_report_date = p.report_date; result.prev_net_profit = p.net_profit; result.prev_revenue = p.revenue; result.prev_roe = p.roe; result.prev_gross_margin = p.gross_margin }
  return result
}

// ========== 5. 东方财富：十大流通股东 ==========
async function fetchTopHolders(code) {
  const j = await fetchJson(`https://emweb.securities.eastmoney.com/PC_HSF10/ShareholderResearch/PageAjax?code=${emPfx(code)}${code}`)
  const h = j.sdltgd; if (!h || !h.length) return null
  const dt = h[0].HOLD_DATE, latest = h.filter(x => x.HOLD_DATE === dt)
  return { date: dt ? dt.slice(0, 10) : '', holders: latest.map(x => ({ name: x.HOLDER_NAME || '', shares: sf(x.HOLD_NUM), pct: sf(x.FREE_RATIO), type: x.SHARES_TYPE || '' })) }
}

// ========== 6. 东方财富：主力资金 ==========
async function fetchFundFlow(code) {
  const j = await fetchJson(`https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get?secid=${emMkt(code)}.${code}&fields1=f1,f2,f3&fields2=f51,f52,f53,f54,f55,f56,f57&lmt=10`)
  if (!j.data?.klines) return null
  const days = j.data.klines.map(line => {
    const p = line.split(',')
    return { date: p[0], main_net: sf(p[1]), super_large_net: sf(p[4]), large_net: sf(p[5]), pct_change: sf(p[6]) }
  })
  return { days, main_net_total: days.reduce((s, d) => s + (d.main_net || 0), 0) }
}

// ========== 7. 东方财富：新闻 ==========
async function fetchNews(code) {
  const txt = await httpGet(`https://search-api-web.eastmoney.com/search/jsonp?type=14&pageindex=1&pagesize=10&keyword=${code}&name=default`, { timeout: 5000 })
  const j = JSON.parse(txt.replace(/^default\(/, '').replace(/\)$/, ''))
  if (!j.Data?.List) return null
  return j.Data.List.map(x => ({ title: (x.Title || '').replace(/<[^>]+>/g, ''), time: x.Date || '', source: x.MediaName || '' }))
}

// ========== 8. 东方财富：业绩预告 ==========
async function fetchEarningsForecast(code) {
  const j = await fetchJson(`https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=NOTICE_DATE&sortTypes=-1&pageSize=10&pageNumber=1&reportName=RPT_PUBLIC_OP_NEWPREDICT&columns=ALL&filter=(SECURITY_CODE%3D%22${code}%22)`)
  if (!j.result?.data?.length) return null
  return j.result.data.slice(0, 5).map(x => ({
    forecast_type: x.PREDICT_TYPE || '',
    indicator: x.PREDICT_FINANCE || '',
    change_pct: sf(x.INCREASE_JZ),
    content: x.PREDICT_CONTENT || '',
    period: x.REPORT_DATE ? x.REPORT_DATE.slice(0, 10) : '',
    announce_date: x.NOTICE_DATE ? x.NOTICE_DATE.slice(0, 10) : '',
  }))
}

// ========== 9. 东方财富：营收分解 ==========
async function fetchBusinessAnalysis(code) {
  const j = await fetchJson(`https://emweb.securities.eastmoney.com/PC_HSF10/BusinessAnalysis/PageAjax?code=${emPfx(code)}${code}`)
  if (!j.zygcfx || !j.zygcfx.length) return null

  // 按报告期分组，优先选有毛利率数据的（中报/年报），否则取最新
  const dates = [...new Set(j.zygcfx.map(x => x.REPORT_DATE))].sort().reverse()
  let chosen = null
  for (const dt of dates) {
    const items = j.zygcfx.filter(x => x.REPORT_DATE === dt && x.MAINOP_TYPE === '2')
    if (!items.length) continue
    // 有毛利率数据优先
    if (items.some(x => x.GROSS_RPOFIT_RATIO != null)) {
      chosen = { date: dt, items }
      break
    }
    if (!chosen) chosen = { date: dt, items }
  }
  if (!chosen) return null

  return {
    period: chosen.date ? chosen.date.slice(0, 10) : '',
    items: chosen.items.slice(0, 8).map(x => {
      const ratio = sf(x.MBI_RATIO)
      const gm = sf(x.GROSS_RPOFIT_RATIO)
      const rev = sf(x.MAIN_BUSINESS_INCOME)
      return {
        name: x.ITEM_NAME || '',
        revenue: rev,
        revenue_yi: rev ? rd(rev / 1e8) : null,
        ratio: ratio != null ? rd(ratio * 100, 1) : null,      // 小数→百分比
        gross_margin: gm != null ? rd(gm * 100, 1) : null,     // 小数→百分比
      }
    })
  }
}

// ========== 10. 东方财富：机构持仓 ==========
async function fetchInstitutionHolding(code) {
  try {
    const j = await fetchJson(`https://emweb.securities.eastmoney.com/PC_HSF10/ShareholderResearch/PageAjax?code=${emPfx(code)}${code}`)
    if (!j.jgcc || !j.jgcc.length) return null
    const latestDate = j.jgcc[0].REPORT_DATE
    const latest = j.jgcc.filter(x => x.REPORT_DATE === latestDate)
    return {
      date: latestDate ? latestDate.slice(0, 10) : '',
      total_ratio: latest.reduce((s, x) => s + (sf(x.TOTAL_SHARES_RATIO) || 0), 0),
      count: latest.length,
      list: latest.slice(0, 5).map(x => ({ name: x.HOLDER_NAME || '', ratio: sf(x.TOTAL_SHARES_RATIO) }))
    }
  } catch { return null }
}

// ========== 超时包装 ==========
function withTimeout(promise, ms, name) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${name} timeout ${ms}ms`)), ms))
  ])
}

// ========== 并行采集 ==========
async function fetchAllData(code) {
  const T = 4000 // 单任务超时4s，全部并行总共也就4s
  const tasks = {
    basic_info: withTimeout(fetchBasicInfo(code), T, 'basic_info'),
    realtime_quote: withTimeout(fetchRealtimeQuote(code), T, 'realtime_quote'),
    kline_trend: withTimeout(fetchKlineTrend(code), T, 'kline_trend'),
    financial_summary: withTimeout(fetchFinancialSummary(code), T, 'financial_summary'),
    top_holders: withTimeout(fetchTopHolders(code), T, 'top_holders'),
    fund_flow: withTimeout(fetchFundFlow(code), T, 'fund_flow'),
    news: withTimeout(fetchNews(code), T, 'news'),
    earnings_forecast: withTimeout(fetchEarningsForecast(code), T, 'earnings_forecast'),
    business_analysis: withTimeout(fetchBusinessAnalysis(code), T, 'business_analysis'),
    institution_holding: withTimeout(fetchInstitutionHolding(code), T, 'institution_holding'),
  }
  const keys = Object.keys(tasks)
  const results = await Promise.allSettled(Object.values(tasks))
  const data = {}
  keys.forEach((k, i) => {
    data[k] = results[i].status === 'fulfilled' ? results[i].value : null
    if (results[i].status === 'rejected') console.warn(`${k} FAIL:`, results[i].reason?.message)
    else if (data[k]) console.log(`${k} OK`)
    else console.log(`${k} empty`)
  })
  return data
}

// ========== 格式化 ==========
function formatForAi(code, d) {
  const L = [`股票代码: ${code}`]
  if (d.basic_info) { const b = d.basic_info; L.push(`\n【基本信息】名称:${b.name}, PE:${b.pe}, PB:${b.pb}, 总市值:${b.total_market_cap}亿`) }
  if (d.realtime_quote) { const q = d.realtime_quote; L.push(`\n【行情】价格:${q.price}, 涨跌:${q.pct_change}%, 今开:${q.open}, 高:${q.high}, 低:${q.low}, 量:${q.volume}, 额:${q.amount}`) }
  if (d.kline_trend) { const k = d.kline_trend; L.push(`\n【走势】30日:${k.change_30d_pct}%, 90日:${k.change_90d_pct}%, 180日高:${k.high_180d}, 低:${k.low_180d}, MA5:${k.ma5}, MA10:${k.ma10}, MA20:${k.ma20}, MA60:${k.ma60}`) }
  if (d.financial_summary) {
    const f = d.financial_summary; L.push(`\n【财务(${f.report_date})】`)
    if (f.net_profit != null) L.push(`净利润:${rd(f.net_profit/1e8)}亿, 同比:${f.net_profit_yoy}%`)
    if (f.revenue != null) L.push(`营收:${rd(f.revenue/1e8)}亿, 同比:${f.revenue_yoy}%`)
    L.push(`EPS:${f.eps}, ROE:${f.roe}%, 毛利率:${rd(f.gross_margin)}%, 净利率:${rd(f.net_margin)}%, 负债率:${rd(f.debt_ratio)}%`)
    if (f.prev_report_date) L.push(`上期(${f.prev_report_date}): 净利润${rd(f.prev_net_profit/1e8)}亿, 营收${rd(f.prev_revenue/1e8)}亿, ROE:${f.prev_roe}%, 毛利率:${rd(f.prev_gross_margin)}%`)
  }
  if (d.earnings_forecast?.length) { L.push(`\n【业绩预告】`); d.earnings_forecast.forEach(e => L.push(`${e.indicator}: ${e.forecast_type}, 变动:${e.change_pct}%, ${e.content?.slice(0,150)}`)) }
  if (d.business_analysis) { L.push(`\n【营收结构(${d.business_analysis.period})】`); d.business_analysis.items.forEach(x => { let s = `${x.name}: 营收${x.revenue_yi}亿, 占比${x.ratio}%`; if (x.gross_margin != null) s += `, 毛利率${x.gross_margin}%`; L.push(s) }) }
  if (d.fund_flow) { const ff = d.fund_flow; L.push(`\n【主力资金】合计:${rd(ff.main_net_total/1e4)}万`); ff.days.slice(-5).forEach(x => L.push(`${x.date}: ${rd((x.main_net||0)/1e4)}万`)) }
  if (d.top_holders) { L.push(`\n【十大股东(${d.top_holders.date})】`); d.top_holders.holders.slice(0,5).forEach((h,i) => L.push(`${i+1}.${h.name}: ${h.shares}股,${h.pct}%`)) }
  if (d.institution_holding) { const ih = d.institution_holding; L.push(`\n【机构持仓(${ih.date})】${ih.count}家机构, 合计占比${rd(ih.total_ratio)}%`) }
  if (d.news?.length) { L.push(`\n【新闻】`); d.news.slice(0,6).forEach(n => L.push(`- ${n.title} (${n.time})`)) }
  return L.join('\n')
}

module.exports = { fetchAllData, formatForAi }
