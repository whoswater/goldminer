/**
 * 云函数：搜索历史管理
 * action: list | record | clear
 */
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 5000,
    }, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    }).on('error', reject)
  })
}

/** 从东方财富查股票名称 */
async function getStockName(code) {
  try {
    const url = `https://searchadapter.eastmoney.com/api/suggest/get?input=${code}&type=14&count=1`
    const raw = await httpGet(url)
    const json = JSON.parse(raw)
    const list = json.QuotationCodeTable?.Data || []
    const match = list.find(item => item.Code === code)
    return match ? match.Name : ''
  } catch (e) {
    return ''
  }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const col = db.collection('search_history')
  const action = event.action || 'list'

  if (action === 'list') {
    const res = await col.where({ _openid: OPENID })
      .orderBy('time', 'desc')
      .limit(50)
      .get()
    return res.data.map(r => ({
      code: r.code,
      name: r.name || '',
      time: r.time || '',
    }))
  }

  if (action === 'record') {
    const code = (event.code || '').trim()
    if (!code) return { ok: false }

    // 查股票名称
    const name = await getStockName(code)

    // 删除该股票的旧记录
    try {
      const old = await col.where({ _openid: OPENID, code }).get()
      for (const doc of old.data) {
        await col.doc(doc._id).remove()
      }
    } catch (e) {}

    // 写入新记录
    await col.add({
      data: {
        code,
        name,
        time: new Date().toISOString().slice(0, 19).replace('T', ' '),
      }
    })

    // 保留最近100条
    const countRes = await col.where({ _openid: OPENID }).count()
    if (countRes.total > 100) {
      const oldest = await col.where({ _openid: OPENID })
        .orderBy('time', 'asc')
        .limit(countRes.total - 100)
        .get()
      for (const doc of oldest.data) {
        await col.doc(doc._id).remove()
      }
    }

    return { ok: true }
  }

  if (action === 'clear') {
    try {
      await col.where({ _openid: OPENID }).remove()
    } catch (e) {
      // 逐条删
      const all = await col.where({ _openid: OPENID }).get()
      for (const doc of all.data) {
        await col.doc(doc._id).remove()
      }
    }
    return { ok: true }
  }

  return { ok: false, error: 'unknown action' }
}
