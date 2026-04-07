/**
 * API 请求封装
 * 统一调用后端 Flask API
 */

const app = getApp()

function getBaseUrl() {
  return app.globalData.baseUrl
}

/**
 * 通用请求方法
 */
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: getBaseUrl() + url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject({ statusCode: res.statusCode, data: res.data })
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

/**
 * 搜索建议
 */
function searchSuggest(query, limit = 10) {
  return request('/api/search/suggest', { data: { q: query, limit } })
}

/**
 * 触发股票分析（异步轮询）
 */
function analyzeStock(code, provider) {
  const params = {}
  if (provider) params.provider = provider
  return request(`/api/analyze/${code}`, { data: params })
}

/**
 * 获取搜索历史
 */
function getSearchHistory() {
  return request('/api/search/history')
}

/**
 * 记录搜索
 */
function recordSearch(code) {
  return request('/api/search/record', {
    method: 'POST',
    data: { code }
  })
}

/**
 * 清空搜索历史
 */
function clearHistory() {
  return request('/api/search/clear', { method: 'POST' })
}

/**
 * 获取股票基本信息
 */
function getStockInfo(code) {
  return request(`/api/stock/${code}/info`)
}

/**
 * 获取估值数据
 */
function getStockValuation(code) {
  return request(`/api/stock/${code}/valuation`)
}

/**
 * 获取实时行情
 */
function getRealtimeQuote(code) {
  return request(`/api/realtime/quote/${code}`)
}

/**
 * 获取K线数据
 */
function getKline(code, days = 180) {
  return request(`/api/realtime/kline/${code}`, { data: { days } })
}

/**
 * 获取AI提供商列表
 */
function getAiProviders() {
  return request('/api/ai/providers')
}

module.exports = {
  request,
  searchSuggest,
  analyzeStock,
  getSearchHistory,
  recordSearch,
  clearHistory,
  getStockInfo,
  getStockValuation,
  getRealtimeQuote,
  getKline,
  getAiProviders
}
