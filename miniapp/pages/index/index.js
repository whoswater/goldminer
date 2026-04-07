const api = require('../../utils/api')

let searchTimer = null

Page({
  data: {
    keyword: '',
    inputFocus: false,
    suggestions: [],
    hotStocks: [
      { code: '600519', name: '贵州茅台' },
      { code: '000001', name: '平安银行' },
      { code: '300750', name: '宁德时代' },
      { code: '002714', name: '牧原股份' },
      { code: '688256', name: '寒武纪' }
    ]
  },

  focusInput() {
    this.setData({ inputFocus: true })
  },

  onFocus() {
    this.setData({ inputFocus: true })
  },

  onBlur() {
    setTimeout(() => this.setData({ inputFocus: false }), 150)
  },

  onInput(e) {
    const keyword = e.detail.value.trim()
    this.setData({ keyword })

    if (searchTimer) clearTimeout(searchTimer)
    if (!keyword) {
      this.setData({ suggestions: [] })
      return
    }

    searchTimer = setTimeout(async () => {
      try {
        const res = await api.searchSuggest(keyword)
        const list = Array.isArray(res) ? res : (res.suggestions || [])
        this.setData({ suggestions: list.slice(0, 6) })
      } catch (e) {
        console.log('搜索建议失败', e)
      }
    }, 250)
  },

  onClear() {
    this.setData({ keyword: '', suggestions: [] })
  },

  dismissSuggest() {
    this.setData({ suggestions: [] })
  },

  onSearch() {
    const keyword = this.data.keyword.trim()
    if (!keyword) return

    if (/^\d{6}$/.test(keyword)) {
      this.goResult(keyword, '')
      return
    }
    if (this.data.suggestions.length > 0) {
      const first = this.data.suggestions[0]
      this.goResult(first.code, first.name)
      return
    }
    wx.showToast({ title: '未找到匹配股票', icon: 'none' })
  },

  onSelectStock(e) {
    const { code, name } = e.currentTarget.dataset
    this.setData({ keyword: '', suggestions: [] })
    this.goResult(code, name)
  },

  goResult(code, name) {
    wx.navigateTo({
      url: `/pages/result/result?code=${code}&name=${encodeURIComponent(name || '')}`
    })
  }
})
