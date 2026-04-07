/**
 * 云函数：AI分析（只负责调AI，输入是已采集好的文本）
 * 预期耗时 10-30 秒
 */
const { analyzeWithAi } = require('./ai_analyzer')

exports.main = async (event) => {
  const code = event.code || ''
  const dataText = event.data_text || ''
  const provider = event.provider || 'doubao'

  if (!dataText) {
    return { error: '缺少分析数据' }
  }

  console.log(`[${code}] analyzeAi 开始, provider=${provider}, textLen=${dataText.length}`)

  try {
    const result = await analyzeWithAi(dataText, code, provider)
    console.log(`[${code}] analyzeAi 完成, verdict=${result.verdict}`)
    return result
  } catch (e) {
    console.error(`[${code}] analyzeAi 失败:`, e.message)
    return {
      verdict: '不确定',
      summary: `AI分析暂时不可用: ${e.message}`,
      analysis: '',
      key_factors: [],
      risks: [],
      recommendation: '',
    }
  }
}
