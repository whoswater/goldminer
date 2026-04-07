const cloud = require('../../utils/cloud')
const util = require('../../utils/util')

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
    aiLoading: true,
    currentProvider: 'doubao',
    providerName: '豆包',
    _dataText: '',
    businessAnalysis: null,
    institutionHolding: null,
  },

  onLoad(options) {
    const code = options.code || ''
    const name = decodeURIComponent(options.name || '')
    this.setData({ stockCode: code, stockName: name })
    wx.setNavigationBarTitle({ title: name ? `${name} (${code})` : code })
    this.startAnalysis(code)
  },

  async startAnalysis(code) {
    const provider = getApp().globalData.aiProvider || 'doubao'
    const providerNames = { doubao: '豆包', qwen: '通义千问', claude: 'Claude' }
    this.setData({
      loading: true, error: '', step: 1, statusText: '正在采集数据...',
      aiLoading: true, aiResult: null,
      currentProvider: provider, providerName: providerNames[provider] || provider,
    })

    cloud.recordSearch(code).catch(() => {})

    // 第1步：数据采集
    try {
      console.log('[1] collectData', code)
      const dataRes = await cloud.collectData(code)
      console.log('[1] 返回:', Object.keys(dataRes.stock_data || {}).filter(k => dataRes.stock_data[k]).join(','))

      if (dataRes.error) {
        this.setData({ loading: false, error: dataRes.error })
        return
      }

      // 数据到了，立即渲染（用户无需等AI）
      if (dataRes.stock_data) {
        this.renderStockData(dataRes.stock_data)
      }
      this.setData({ loading: false, step: 2, statusText: 'AI正在分析中...' })

      // 第2步：AI分析（后台进行，数据已展示）
      const dataText = dataRes.data_text || ''
      this._dataText = dataText
      if (dataText) {
        console.log('[2] analyzeAi', code, 'textLen:', dataText.length)
        try {
          const aiRes = await cloud.analyzeAi(code, dataText, this.data.currentProvider)
          console.log('[2] AI完成:', aiRes.verdict)
          this.renderAiResult(aiRes)
        } catch (aiErr) {
          console.error('[2] AI失败:', aiErr)
          this.renderAiResult({
            verdict: '不确定',
            summary: 'AI分析超时，请稍后重试',
            analysis: '', key_factors: [], risks: [], recommendation: ''
          })
        }
      }
      this.setData({ step: 3, aiLoading: false })

    } catch (e) {
      console.error('采集失败', e)
      const msg = e.message || e.errMsg || JSON.stringify(e)
      this.setData({ loading: false, error: '数据采集失败: ' + msg })
    }
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

  renderStockData(data) {
    this._renderBasicInfo(data)
    this._renderQuote(data)
    this._renderKline(data)
    this._renderFinancials(data)
    this._renderEarnings(data)
    this._renderFundFlow(data)
    this._renderHolders(data)
    this._renderNews(data)
    this._renderBusiness(data)
    this._renderInstitution(data)
  },

  _renderBasicInfo(data) {
    const info = { metrics: [] }
    const b = data.basic_info || {}
    const fs = data.financial_summary || {}

    info.name = b.name || b['股票简称'] || this.data.stockName
    info.industry = b.industry || b['行业'] || ''

    const pe = b.pe || b['市盈率(动态)']
    const pb = b.pb || b['市净率']
    const cap = b.total_market_cap || b['总市值']
    // 腾讯返回市值单位是亿，直接显示
    const roe = fs.roe || b.roe || b['净资产收益率']

    if (pe) info.metrics.push({ label: 'PE(动)', value: Number(pe).toFixed(2) })
    if (pb) info.metrics.push({ label: 'PB', value: Number(pb).toFixed(2) })
    if (cap) info.metrics.push({ label: '总市值', value: Number(cap).toFixed(0) + '亿' })
    if (roe) info.metrics.push({ label: 'ROE', value: Number(roe).toFixed(2) + '%' })

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
    // 腾讯: volume 单位是手, amount 单位是万元
    const volStr = q.volume ? (q.volume >= 10000 ? (q.volume / 10000).toFixed(1) + '万手' : q.volume + '手') : '--'
    const amtStr = q.amount ? (q.amount >= 10000 ? (q.amount / 10000).toFixed(1) + '亿' : (q.amount).toFixed(0) + '万') : '--'
    this.setData({
      quoteDetail: {
        open: q.open || '--',
        high: q.high || '--',
        low: q.low || '--',
        prevClose: q.prev_close || '--',
        volume: volStr,
        amount: amtStr,
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
        ma5: k.ma5,
        ma10: k.ma10,
        ma20: k.ma20,
        ma60: k.ma60,
      }
    })
  },

  _renderFinancials(data) {
    const fs = data.financial_summary
    if (!fs) return
    const list = []
    const add = (label, val, opts = {}) => {
      if (val === null || val === undefined) return
      let display, cls = ''
      const n = Number(val)
      if (opts.pct) {
        display = (n > 0 ? '+' : '') + n.toFixed(2) + '%'
        cls = util.priceColorClass(n)
      } else if (opts.billion) {
        display = (n / 1e8).toFixed(2) + '亿'
      } else if (opts.suffix) {
        display = n.toFixed(2) + opts.suffix
      } else {
        display = isNaN(n) ? String(val) : n.toFixed(2)
      }
      list.push({ label: (fs.report_date ? label : label), value: display, cls })
    }

    if (fs.report_date) {
      list.push({ label: '报告期', value: fs.report_date, cls: '' })
    }
    add('归母净利润', fs.net_profit, { billion: true })
    add('营业收入', fs.revenue, { billion: true })
    add('每股收益(EPS)', fs.eps)
    add('每股净资产', fs.bps)
    add('净利润同比', fs.net_profit_yoy, { pct: true })
    add('营收同比', fs.revenue_yoy, { pct: true })
    add('销售毛利率', fs.gross_margin, { suffix: '%' })
    add('销售净利率', fs.net_margin, { suffix: '%' })
    add('ROE(加权)', fs.roe, { suffix: '%' })
    add('资产负债率', fs.debt_ratio, { suffix: '%' })
    add('流动比率', fs.current_ratio)

    // 上期对比
    if (fs.prev_report_date) {
      list.push({ label: '', value: '', cls: '' }) // 分隔
      list.push({ label: '上期(' + fs.prev_report_date + ')', value: '', cls: 'section-label' })
      add('上期净利润', fs.prev_net_profit, { billion: true })
      add('上期营收', fs.prev_revenue, { billion: true })
      add('上期ROE', fs.prev_roe, { suffix: '%' })
      add('上期毛利率', fs.prev_gross_margin, { suffix: '%' })
    }

    this.setData({ financials: list.filter(item => item.label || item.value) })
  },

  _renderEarnings(data) {
    if (!data.earnings_forecast || !data.earnings_forecast.length) return
    const list = data.earnings_forecast.map(item => {
      const t = item.forecast_type || ''
      let typeCls = 'tag-gray'
      if (/预增|扭亏|略增|续盈/.test(t)) typeCls = 'tag-red'
      if (/预减|首亏|略减|续亏/.test(t)) typeCls = 'tag-green'
      return { ...item, typeCls }
    })
    this.setData({ earningsForecast: list })
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
    const fmtWan = (v) => { const n = (v || 0) / 10000; return (n > 0 ? '+' : '') + n.toFixed(0) + '万' }
    const fmtPct = (v) => { if (!v) return '--'; return (v > 0 ? '+' : '') + Number(v).toFixed(2) + '%' }
    const days = (ff.days || []).map(d => ({
      dateShort: (d.date || '').slice(5),
      mainStr: fmtWan(d.main_net),
      mainCls: util.priceColorClass(d.main_net || 0),
      pctStr: fmtPct(d.pct_change),
      pctCls: util.priceColorClass(d.pct_change || 0),
    })).reverse()
    const total = ff.main_net_total || 0
    this.setData({ fundFlow: { dayCount: days.length, days, totalStr: fmtWan(total), totalCls: util.priceColorClass(total) } })
  },

  _renderHolders(data) {
    if (!data.top_holders) return
    const h = data.top_holders
    const list = (h.holders || []).map(item => ({
      name: item.name,
      sharesStr: util.formatNumber(item.shares),
      pct: item.pct != null ? Number(item.pct).toFixed(2) : '--',
    }))
    this.setData({ topHolders: { date: h.date || '--', list } })
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

  _renderBusiness(data) {
    if (!data.business_analysis) return
    const ba = data.business_analysis
    const hasMargin = (ba.items || []).some(x => x.gross_margin != null)
    this.setData({
      businessAnalysis: {
        period: ba.period,
        hasMargin,
        items: (ba.items || []).map(x => ({
          name: x.name,
          revenueStr: x.revenue_yi != null ? x.revenue_yi.toFixed(1) : '--',
          ratio: x.ratio != null ? x.ratio : '--',
          grossMarginStr: x.gross_margin != null ? x.gross_margin + '%' : '--',
        }))
      }
    })
  },

  _renderInstitution(data) {
    if (!data.institution_holding) return
    const ih = data.institution_holding
    this.setData({
      institutionHolding: {
        date: ih.date || '--',
        count: ih.count || 0,
        totalRatio: ih.total_ratio != null ? Number(ih.total_ratio).toFixed(2) : '--',
      }
    })
  },

  async switchProvider(e) {
    const provider = e.currentTarget.dataset.provider
    if (provider === this.data.currentProvider) return

    const providerNames = { doubao: '豆包', qwen: '通义千问', claude: 'Claude' }
    this.setData({
      currentProvider: provider,
      providerName: providerNames[provider] || provider,
      aiResult: null,
      aiLoading: true,
    })

    // 用已有的 dataText 重新调 AI，不需要重新采集数据
    const dataText = this._dataText
    if (!dataText) {
      this.setData({ aiLoading: false })
      return
    }

    try {
      const aiRes = await cloud.analyzeAi(this.data.stockCode, dataText, provider)
      this.renderAiResult(aiRes)
    } catch (e) {
      this.renderAiResult({
        verdict: '不确定', summary: 'AI分析超时，请稍后重试',
        analysis: '', key_factors: [], risks: [], recommendation: ''
      })
    }
    this.setData({ aiLoading: false })
  },

  retry() {
    this.startAnalysis(this.data.stockCode)
  }
})
