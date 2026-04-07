/**
 * 工具函数
 */

/**
 * 格式化日期
 */
function formatDate(date) {
  const d = date ? new Date(date) : new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化时间
 */
function formatDateTime(date) {
  const d = date ? new Date(date) : new Date()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${formatDate(d)} ${hours}:${minutes}`
}

/**
 * 格式化数字（万/亿）
 */
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '--'
  const n = Number(num)
  if (Math.abs(n) >= 1e8) {
    return (n / 1e8).toFixed(2) + '亿'
  } else if (Math.abs(n) >= 1e4) {
    return (n / 1e4).toFixed(2) + '万'
  }
  return n.toFixed(2)
}

/**
 * 涨跌颜色 class
 */
function priceColorClass(value) {
  if (value > 0) return 'text-rise'
  if (value < 0) return 'text-fall'
  return 'text-flat'
}

/**
 * 判定结果对应的标签样式
 */
function verdictTag(verdict) {
  const map = {
    '超预期': { text: '超预期', cls: 'tag-red' },
    '符合预期': { text: '符合预期', cls: 'tag-blue' },
    '低于预期': { text: '低于预期', cls: 'tag-green' },
    '不确定': { text: '不确定', cls: 'tag-gray' }
  }
  return map[verdict] || { text: verdict || '未知', cls: 'tag-gray' }
}

/**
 * 信心等级描述
 */
function confidenceText(level) {
  const labels = ['', '很低', '较低', '中等', '较高', '很高']
  return labels[level] || '未知'
}

module.exports = {
  formatDate,
  formatDateTime,
  formatNumber,
  priceColorClass,
  verdictTag,
  confidenceText
}
