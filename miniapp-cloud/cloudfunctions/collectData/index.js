/**
 * 云函数：数据采集（纯数据，不含AI）
 * 预期耗时 3-6 秒
 */
const { fetchAllData, formatForAi } = require('./data_collector')

exports.main = async (event) => {
  const code = (event.code || '').trim()
  if (!code || !/^\d{6}$/.test(code)) {
    return { error: '请输入有效的6位股票代码' }
  }

  console.log(`[${code}] collectData 开始`)
  const stockData = await fetchAllData(code)

  const ok = Object.keys(stockData).filter(k => stockData[k])
  const fail = Object.keys(stockData).filter(k => !stockData[k])
  console.log(`[${code}] OK: ${ok.join(',')}`)
  if (fail.length) console.log(`[${code}] FAIL: ${fail.join(',')}`)

  const dataText = formatForAi(code, stockData)
  console.log(`[${code}] dataText length: ${dataText.length}`)

  return {
    stock_data: stockData,
    data_text: dataText,
  }
}
