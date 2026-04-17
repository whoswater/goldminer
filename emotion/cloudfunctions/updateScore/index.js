const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function checkText(text, openid) {
  if (!text) return true
  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content: text, version: 2, scene: 1, openid: openid
    })
    if (res.result && res.result.suggest !== 'pass') return false
    return true
  } catch (err) {
    return true
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { score, nickname, round, team } = event

  if (typeof score !== 'number' || score <= 0 || score > 9999) {
    return { code: -1, msg: '非法分数' }
  }

  const nickSafe = await checkText(nickname, openid)
  if (!nickSafe) return { code: -2, msg: '昵称含违规内容' }

  try {
    const res = await db.collection('ranking').where({ openid, round: round || 99 }).get()

    if (res.data.length > 0) {
      const record = res.data[0]
      if (score > record.score) {
        await db.collection('ranking').doc(record._id).update({
          data: { score, nickname: nickname || '匿名球员', team: team || '', updateTime: db.serverDate() }
        })
        return { code: 0, msg: '新纪录！', newRecord: true }
      }
      return { code: 0, msg: '未超过最高分', newRecord: false }
    } else {
      await db.collection('ranking').add({
        data: { openid, score, nickname: nickname || '匿名球员', team: team || '', round: round || 99, updateTime: db.serverDate() }
      })
      return { code: 0, msg: '首次记录', newRecord: true }
    }
  } catch (err) {
    return { code: -1, msg: '服务异常' }
  }
}
