const api = require('../../utils/api')
const util = require('../../utils/util')

let pollTimer = null

Page({
  data: {
    stockCode: '',
    stockName: '',
    loading: true,
    error: '',
    statusText: '正在采集数据...',
    step: 0,
    stockInfo: null,
    priceClass: '',
    quoteDetail: null,
    klineTrend: null,
    aiResult: null,
    verdictCls: '',
    financials: [],
    earningsForecast: null,
    earningsExpress: [],
    analystForecast: [],
    fundFlow: null,
    topHolders: null,
    news: [],
    announcements: [],
    valuation: null,
  },

  onLoad(options) {
    const code = options.code || ''
    const name = decodeURIComponent(options.name || '')
    this.setData({ stockCode: code, stockName: name })
    wx.setNavigationBarTitle({ title: name ? `${name} (${code})` : code })
    this.startAnalysis(code)
  },

  onUnload() {
    this.stopPolling()
  },

  onShareAppMessage() {
    const code = this.data.stockCode
    const name = this.data.stockInfo?.name || this.data.stockName || code
    const verdict = this.data.aiResult?.verdict || ''
    const desc = verdict ? `${name} - 业绩情况：${verdict}` : `${name} - 查看AI分析`
    return {
      title: `【精准析查】${name}(${code})`,
      path: `/pages/result/result?code=${code}&name=${encodeURIComponent(name)}`,
      desc,
    }
  },

  onShareTimeline() {
    const code = this.data.stockCode
    const name = this.data.stockInfo?.name || this.data.stockName || code
    return {
      title: `【精准析查】${name}(${code}) AI分析`,
      query: `code=${code}&name=${encodeURIComponent(name)}`,
    }
  },

  stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  },

  startAnalysis(code) {
    this.setData({ loading: true, error: '', step: 0, statusText: '正在采集数据...' })
    api.recordSearch(code).catch(() => {})
    this.pollAnalysis(code)
    pollTimer = setInterval(() => this.pollAnalysis(code), 2000)
  },

  async pollAnalysis(code) {
    try {
      const app = getApp()
      const res = await api.analyzeStock(code, app.globalData.aiProvider)

      if (res.status === 'running') {
        this.setData({ step: 1, statusText: res.message || '正在采集数据...' })
      } else if (res.status === 'data_ready') {
        this.setData({ step: 2, statusText: 'AI正在分析中...' })
        const d = res.data || {}
        if (d.stock_data) this.renderStockData(d.stock_data)
      } else if (res.status === 'done') {
        this.stopPolling()
        this.setData({ loading: false, step: 3 })
        const d = res.data || {}
        if (d.stock_data) this.renderStockData(d.stock_data)
        if (d.ai_analysis) this.renderAiResult(d.ai_analysis)
      } else if (res.status === 'error') {
        this.stopPolling()
        this.setData({ loading: false, error: res.message || '分析失败' })
      }
    } catch (e) {
      console.error('轮询失败', e)
      this.stopPolling()
      this.setData({ loading: false, error: '网络请求失败，请检查后端服务是否运行' })
    }
  },

  renderStockData(data) {
    this._renderBasicInfo(data)
    this._renderQuote(data)
    this._renderKline(data)
    this._renderFinancials(data)
    this._renderEarnings(data)
    this._renderAnalyst(data)
    this._renderFundFlow(data)
    this._renderHolders(data)
    this._renderNews(data)
    this._renderAnnouncements(data)
    this._renderValuation(data)
  },

  _renderBasicInfo(data) {
    const info = { metrics: [] }
    if (data.basic_info) {
      const b = data.basic_info
      // akshare stock_individual_info_em 返回中文 key
      info.name = b.name || b['股票简称'] || this.data.stockName
      info.industry = b.industry || b['行业'] || ''
      const pe = b.pe || b['市盈率(动态)']
      const pb = b.pb || b['市净率']
      const cap = b.total_market_cap || b['总市值']
      const roe = b.roe || b['净资产收益率']
      if (pe) info.metrics.push({ label: 'PE(动)', value: Number(pe).toFixed(2) })
      if (pb) info.metrics.push({ label: 'PB', value: Number(pb).toFixed(2) })
      if (cap) info.metrics.push({ label: '总市值', value: util.formatNumber(cap) })
      if (roe) info.metrics.push({ label: 'ROE', value: Number(roe).toFixed(2) + '%' })
    }
    if (data.realtime_quote) {
      const q = data.realtime_quote
      info.price = q.price
      const pct = q.pct_change || 0
      info.changeStr = (pct > 0 ? '+' : '') + Number(pct).toFixed(2) + '%'
      this.setData({ priceClass: util.priceColorClass(pct) })
    }
    this.setData({ stockInfo: info })
    if (info.name) {
      wx.setNavigationBarTitle({ title: `${info.name} (${this.data.stockCode})` })
    }
  },

  _renderQuote(data) {
    const q = data.realtime_quote
    if (!q) return
    this.setData({
      quoteDetail: {
        open: q.open || '--',
        high: q.high || '--',
        low: q.low || '--',
        prevClose: q.prev_close || '--',
        volume: util.formatNumber(q.volume),
        amount: util.formatNumber(q.amount),
      }
    })
  },

  _renderKline(data) {
    const k = data.kline_trend
    if (!k) return
    const fmt = (v) => (v > 0 ? '+' : '') + Number(v).toFixed(2) + '%'
    this.setData({
      klineTrend: {
        change30d: fmt(k.change_30d_pct),
        change90d: fmt(k.change_90d_pct),
        c30cls: util.priceColorClass(k.change_30d_pct),
        c90cls: util.priceColorClass(k.change_90d_pct),
        high180: k.high_180d,
        low180: k.low_180d,
        ma20: k.ma20,
        ma60: k.ma60,
      }
    })
  },

  _renderFinancials(data) {
    const fs = data.financial_summary
    if (!fs) return
    const list = []
    const add = (label, val, isMoney, isPct) => {
      if (val === null || val === undefined) return
      let display, cls = ''
      if (isPct) {
        const n = Number(val)
        display = (n > 0 ? '+' : '') + n.toFixed(2) + '%'
        cls = util.priceColorClass(n)
      } else if (isMoney) {
        display = util.formatNumber(val)
      } else {
        display = String(val)
      }
      list.push({ label, value: display, cls })
    }
    add('净利润', fs.net_profit || fs['净利润'], true)
    add('营业收入', fs.revenue || fs['营业总收入'], true)
    add('毛利率', fs.gross_margin || fs['销售毛利率'], false, true)
    add('净利润同比', fs.net_profit_yoy || fs['净利润同比增长率'], false, true)
    add('营收同比', fs.revenue_yoy || fs['营业总收入同比增长率'], false, true)
    add('每股收益', fs.eps || fs['基本每股收益'], false)
    add('每股净资产', fs.bps || fs['每股净资产'], false)
    this.setData({ financials: list })
  },

  _renderEarnings(data) {
    // 业绩预告
    if (data.earnings_forecast && data.earnings_forecast.length > 0) {
      const list = data.earnings_forecast.map(item => {
        const t = item.forecast_type || ''
        let typeCls = 'tag-gray'
        if (/预增|扭亏|略增|续盈/.test(t)) typeCls = 'tag-red'
        if (/预减|首亏|略减|续亏/.test(t)) typeCls = 'tag-green'
        return {
          ...item,
          typeCls,
          changeCls: item.change_pct > 0 ? 'text-rise' : (item.change_pct < 0 ? 'text-fall' : ''),
        }
      })
      this.setData({ earningsForecast: list })
    }

    // 业绩快报
    if (data.earnings_express && data.earnings_express.length > 0) {
      const exp = data.earnings_express[0]
      const list = []
      if (exp.eps) list.push({ label: '每股收益', value: exp.eps, cls: '' })
      if (exp.revenue) list.push({ label: '营业收入', value: util.formatNumber(exp.revenue), cls: '' })
      if (exp.revenue_yoy !== undefined) {
        const y = Number(exp.revenue_yoy)
        list.push({ label: '营收同比', value: (y > 0 ? '+' : '') + y.toFixed(2) + '%', cls: util.priceColorClass(y) })
      }
      if (exp.net_profit_yoy !== undefined) {
        const y = Number(exp.net_profit_yoy)
        list.push({ label: '净利润同比', value: (y > 0 ? '+' : '') + y.toFixed(2) + '%', cls: util.priceColorClass(y) })
      }
      this.setData({ earningsExpress: list })
    }
  },

  _renderAnalyst(data) {
    if (!data.analyst_forecast || data.analyst_forecast.length === 0) return
    const list = data.analyst_forecast.map(item => ({
      year: item.year,
      count: item.analyst_count || 0,
      mean: item.eps_mean != null ? Number(item.eps_mean).toFixed(2) : '--',
      min: item.eps_min != null ? Number(item.eps_min).toFixed(2) : '--',
      max: item.eps_max != null ? Number(item.eps_max).toFixed(2) : '--',
    }))
    this.setData({ analystForecast: list })
  },

  _renderFundFlow(data) {
    if (!data.fund_flow) return
    const ff = data.fund_flow
    const days = (ff.days || []).map(d => {
      const main = d.main_net || 0
      const pct = d.pct_change || 0
      return {
        dateShort: (d.date || '').slice(5),
        pctStr: (pct > 0 ? '+' : '') + Number(pct).toFixed(2) + '%',
        pctCls: util.priceColorClass(pct),
        mainStr: util.formatNumber(main),
        mainCls: util.priceColorClass(main),
      }
    }).reverse()
    const total = ff.main_net_total || 0
    this.setData({
      fundFlow: {
        dayCount: days.length,
        days,
        totalStr: util.formatNumber(total),
        totalCls: util.priceColorClass(total),
      }
    })
  },

  _renderHolders(data) {
    if (!data.top_holders) return
    const h = data.top_holders
    const list = (h.holders || []).map(item => ({
      name: item.name,
      sharesStr: util.formatNumber(item.shares),
      pct: item.pct != null ? Number(item.pct).toFixed(2) : '--',
    }))
    this.setData({
      topHolders: { date: h.date || '--', list }
    })
  },

  _renderNews(data) {
    if (!data.news || !Array.isArray(data.news)) return
    const news = data.news.slice(0, 8).map(item => ({
      title: item.title || item['新闻标题'] || '',
      time: item.time || item['发布时间'] || '',
      source: item.source || item['文章来源'] || '',
    }))
    this.setData({ news })
  },

  _renderAnnouncements(data) {
    if (!data.announcements || !Array.isArray(data.announcements)) return
    const list = data.announcements.slice(0, 6).map(item => ({
      title: item.title || item['公告标题'] || '',
      date: item.date || item['公告日期'] || '',
    }))
    this.setData({ announcements: list })
  },

  _renderValuation(data) {
    if (!data.valuation) return
    const v = data.valuation
    const list = []
    const add = (label, val) => {
      if (val !== null && val !== undefined && val !== '') {
        list.push({ label, value: String(val) })
      }
    }
    add('估值模型', v.model || v.valuation_model)
    add('当前PE', v.pe || v.current_pe)
    add('行业PE中位数', v.industry_pe_median)
    add('当前PB', v.pb || v.current_pb)
    add('估值状态', v.status || v.valuation_status)
    add('安全边际', v.margin_of_safety)
    if (list.length > 0) this.setData({ valuation: list })
  },

  renderAiResult(ai) {
    const verdict = util.verdictTag(ai.verdict)
    this.setData({
      aiResult: {
        verdict: ai.verdict || '未知',
        summary: ai.summary || '',
        analysis: ai.analysis || '',
        key_factors: ai.key_factors || [],
        risks: ai.risks || [],
        recommendation: ai.recommendation || ''
      },
      verdictCls: verdict.cls
    })
  },

  retry() {
    this.startAnalysis(this.data.stockCode)
  }
})
