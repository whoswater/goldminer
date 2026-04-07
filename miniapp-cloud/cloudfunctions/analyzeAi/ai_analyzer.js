/**
 * AI 分析模块
 * 支持多家 AI 提供商，通过环境变量配置 API Key
 *
 * 在云函数环境变量中设置：
 *   DOUBAO_API_KEY / DOUBAO_MODEL
 *   QWEN_API_KEY / QWEN_MODEL
 *   ANTHROPIC_API_KEY
 */
const https = require('https')

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = https.request({
      hostname, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      timeout: 25000,
    }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()))
        } catch (e) {
          reject(new Error('AI响应解析失败'))
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('AI请求超时')) })
    req.write(data)
    req.end()
  })
}

const SYSTEM_PROMPT = `你是A股分析助手。根据股票公开数据，简洁判断业绩情况。直接返回JSON，不要其他文字：
{"verdict":"超预期/符合预期/低于预期/不确定","summary":"一句话","analysis":"分析(150字内)","key_factors":["因素1","因素2"],"risks":["风险1","风险2"],"recommendation":"概述(50字内)"}
verdict必须四选一。简洁回答。`

async function analyzeWithAi(dataText, code, provider = 'doubao') {
  const userMsg = `请分析以下股票的业绩情况：\n\n${dataText}`

  let result
  if (provider === 'qwen') {
    result = await callQwen(userMsg)
  } else if (provider === 'claude') {
    result = await callClaude(userMsg)
  } else {
    result = await callDoubao(userMsg)
  }

  return result
}

async function callDoubao(userMsg) {
  const apiKey = process.env.DOUBAO_API_KEY || 'fec315ed-fdff-4a99-91bf-fd6ccb9c69bf'
  const model = process.env.DOUBAO_MODEL || 'doubao-seed-2-0-pro-260215'

  const res = await httpsPost('ark.cn-beijing.volces.com', '/api/v3/chat/completions', {
    'Authorization': `Bearer ${apiKey}`,
  }, {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMsg },
    ],
    temperature: 0.3,
    max_tokens: 800,
  })

  return parseAiResponse(res.choices?.[0]?.message?.content)
}

async function callQwen(userMsg) {
  const apiKey = process.env.QWEN_API_KEY || 'sk-2f751030ea294532a8fae8e7dcc7e2e0'
  const model = process.env.QWEN_MODEL || 'qwen-plus'

  const res = await httpsPost('dashscope.aliyuncs.com', '/compatible-mode/v1/chat/completions', {
    'Authorization': `Bearer ${apiKey}`,
  }, {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMsg },
    ],
    temperature: 0.3,
    max_tokens: 800,
  })

  return parseAiResponse(res.choices?.[0]?.message?.content)
}

async function callClaude(userMsg) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('未配置 ANTHROPIC_API_KEY')

  const res = await httpsPost('api.anthropic.com', '/v1/messages', {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  }, {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
    temperature: 0.3,
  })

  const text = res.content?.[0]?.text
  return parseAiResponse(text)
}

function parseAiResponse(text) {
  if (!text) {
    return defaultResult('AI返回为空')
  }

  try {
    // 提取 JSON（可能被 markdown 包裹）
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        verdict: parsed.verdict || '不确定',
        summary: parsed.summary || '',
        analysis: parsed.analysis || '',
        key_factors: parsed.key_factors || [],
        risks: parsed.risks || [],
        recommendation: parsed.recommendation || '',
      }
    }
  } catch (e) {
    console.warn('AI JSON解析失败，使用原文')
  }

  return {
    verdict: '不确定',
    summary: text.slice(0, 200),
    analysis: text,
    key_factors: [],
    risks: [],
    recommendation: '',
  }
}

function defaultResult(msg) {
  return {
    verdict: '不确定',
    summary: msg,
    analysis: '',
    key_factors: [],
    risks: [],
    recommendation: '',
  }
}

module.exports = { analyzeWithAi }
