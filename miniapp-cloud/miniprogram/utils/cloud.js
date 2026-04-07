/**
 * 云函数调用封装
 */

function callCloud(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: res => resolve(res.result),
      fail: err => {
        console.error(`云函数 ${name} 调用失败:`, err)
        reject(err)
      }
    })
  })
}

/** 搜索建议 */
function searchSuggest(keyword, limit = 10) {
  return callCloud('searchSuggest', { keyword, limit })
}

/** 第1步：数据采集（快，5-10s） */
function collectData(code) {
  return callCloud('collectData', { code })
}

/** 第2步：AI分析（慢，10-30s） */
function analyzeAi(code, dataText, provider) {
  return callCloud('analyzeAi', { code, data_text: dataText, provider })
}

/** 获取搜索历史 */
function getSearchHistory() {
  return callCloud('searchHistory', { action: 'list' })
}

/** 记录搜索 */
function recordSearch(code) {
  return callCloud('searchHistory', { action: 'record', code })
}

/** 清空搜索历史 */
function clearHistory() {
  return callCloud('searchHistory', { action: 'clear' })
}

module.exports = {
  callCloud,
  searchSuggest,
  collectData,
  analyzeAi,
  getSearchHistory,
  recordSearch,
  clearHistory,
}
