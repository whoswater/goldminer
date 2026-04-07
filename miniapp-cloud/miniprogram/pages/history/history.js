const cloud = require('../../utils/cloud')

Page({
  data: {
    list: [],
    loading: true
  },

  onShow() {
    this.loadHistory()
  },

  async loadHistory() {
    this.setData({ loading: true })
    try {
      const res = await cloud.getSearchHistory()
      const list = Array.isArray(res) ? res : (res.list || [])
      this.setData({ list, loading: false })
    } catch (e) {
      console.error('加载历史失败', e)
      this.setData({ list: [], loading: false })
    }
  },

  onTap(e) {
    const { code, name } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/result/result?code=${code}&name=${encodeURIComponent(name || '')}`
    })
  },

  onClear() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有搜索记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await cloud.clearHistory()
            this.setData({ list: [] })
            wx.showToast({ title: '已清空', icon: 'success' })
          } catch (e) {
            wx.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  }
})
