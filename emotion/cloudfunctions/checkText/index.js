const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { text } = event

  if (!text) return { safe: true }

  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content: text, version: 2, scene: 1, openid: openid
    })
    if (res.result && res.result.suggest !== 'pass') {
      return { safe: false, label: res.result.label }
    }
    return { safe: true }
  } catch (err) {
    console.error('msgSecCheck error:', err)
    return { safe: true }
  }
}
