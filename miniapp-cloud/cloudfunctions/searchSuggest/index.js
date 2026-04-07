/**
 * 云函数：股票搜索建议
 * 直接调东方财富搜索 API，无需本地数据库
 */
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.eastmoney.com/' },
      timeout: 5000,
    }, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    }).on('error', reject)
  })
}

exports.main = async (event) => {
  const keyword = (event.keyword || '').trim()
  const limit = event.limit || 10
  if (!keyword) return []

  try {
    // 东方财富搜索接口（和网页版一样）
    const url = `https://searchadapter.eastmoney.com/api/suggest/get?input=${encodeURIComponent(keyword)}&type=14&count=${limit}`
    const raw = await httpGet(url)
    const json = JSON.parse(raw)

    if (!json.QuotationCodeTable || !json.QuotationCodeTable.Data) {
      return []
    }

    return json.QuotationCodeTable.Data
      .filter(item => {
        const code = item.Code || ''
        // 只保留 A 股（6/0/3/4/8 开头的6位数字）
        return /^\d{6}$/.test(code) && /^[0368]/.test(code)
      })
      .slice(0, limit)
      .map(item => ({
        code: item.Code,
        name: item.Name,
      }))
  } catch (e) {
    console.error('搜索失败:', e.message)
    return []
  }
}
