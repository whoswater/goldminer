App({
  globalData: {
    // 后端API地址，开发时用本地，上线后替换为你的服务器域名（需HTTPS）
    baseUrl: 'http://127.0.0.1:8818',
    // AI分析提供商
    aiProvider: 'doubao'
  },

  onLaunch() {
    // 检查网络状态
    wx.getNetworkType({
      success: (res) => {
        if (res.networkType === 'none') {
          wx.showToast({ title: '网络不可用', icon: 'none' })
        }
      }
    })
  }
})
