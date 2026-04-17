const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  // 创建挑战（射门方）
  if (action === 'create') {
    const { nickname, team, shots, goalsScored } = event
    if (!shots || !Array.isArray(shots) || shots.length !== 5) {
      return { code: -1, msg: '无效射门数据' }
    }
    try {
      const res = await db.collection('challenges').add({
        data: {
          attackerOpenid: openid,
          attackerNickname: nickname || '匿名球员',
          attackerTeam: team || '',
          shots: shots,
          goalsScored: goalsScored || 0,
          defenderOpenid: null,
          defenderNickname: null,
          defenderTeam: null,
          defenderSaves: null,
          createdAt: db.serverDate()
        }
      })
      return { code: 0, challengeId: res._id }
    } catch (err) {
      return { code: -1, msg: '创建失败' }
    }
  }

  // 获取挑战详情（防守方）
  if (action === 'get') {
    const { challengeId } = event
    if (!challengeId) return { code: -1, msg: '无挑战ID' }
    try {
      const res = await db.collection('challenges').doc(challengeId).get()
      return { code: 0, data: res.data }
    } catch (err) {
      return { code: -1, msg: '挑战不存在' }
    }
  }

  // 提交防守结果
  if (action === 'respond') {
    const { challengeId, nickname, team, saves } = event
    if (!challengeId) return { code: -1, msg: '无挑战ID' }
    try {
      await db.collection('challenges').doc(challengeId).update({
        data: {
          defenderOpenid: openid,
          defenderNickname: nickname || '匿名球员',
          defenderTeam: team || '',
          defenderSaves: saves
        }
      })
      // 重新获取完整数据返回
      const res = await db.collection('challenges').doc(challengeId).get()
      return { code: 0, data: res.data }
    } catch (err) {
      return { code: -1, msg: '提交失败' }
    }
  }

  return { code: -1, msg: '未知操作' }
}
