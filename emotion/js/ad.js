// ========== 绿茵逐梦 · 广告管理 ==========
// 广告单元ID（上线前替换为真实ID）
var AD_CONFIG = {
  rewardedVideo: 'adunit-xxxxxxxxxxxxxxxxxx',  // 激励视频广告位ID
  banner: 'adunit-yyyyyyyyyyyyyyyyyy'           // Banner广告位ID
}

var rewardedVideoAd = null
var bannerAd = null
var rewardedVideoCallback = null  // 激励视频完成回调

// ===== 激励视频广告 =====
function initRewardedVideoAd() {
  if (!wx.createRewardedVideoAd) return
  try {
    rewardedVideoAd = wx.createRewardedVideoAd({ adUnitId: AD_CONFIG.rewardedVideo })
    rewardedVideoAd.onLoad(function() {
      console.log('[Ad] rewarded video loaded')
    })
    rewardedVideoAd.onError(function(err) {
      console.warn('[Ad] rewarded video error', err)
    })
    rewardedVideoAd.onClose(function(res) {
      if (res && res.isEnded) {
        // 完整观看，发放奖励
        if (typeof rewardedVideoCallback === 'function') {
          rewardedVideoCallback(true)
        }
      } else {
        // 中途关闭，不发放奖励
        if (typeof rewardedVideoCallback === 'function') {
          rewardedVideoCallback(false)
        }
      }
      rewardedVideoCallback = null
    })
  } catch(e) {
    console.warn('[Ad] init rewarded video failed', e)
  }
}

// 展示激励视频，callback(completed: boolean)
function showRewardedVideo(callback) {
  if (!rewardedVideoAd) {
    console.warn('[Ad] rewarded video not ready')
    if (typeof callback === 'function') callback(false)
    return
  }
  rewardedVideoCallback = callback
  rewardedVideoAd.show().catch(function() {
    // 首次show失败，尝试load后重新show
    rewardedVideoAd.load().then(function() {
      rewardedVideoAd.show()
    }).catch(function(err) {
      console.warn('[Ad] rewarded video show failed', err)
      rewardedVideoCallback = null
      if (typeof callback === 'function') callback(false)
    })
  })
}

// ===== Banner广告 =====
function createBannerAd(bottomOffset) {
  if (!wx.createBannerAd) return null
  try {
    var info = wx.getSystemInfoSync()
    var bw = info.screenWidth * 0.9
    bannerAd = wx.createBannerAd({
      adUnitId: AD_CONFIG.banner,
      adIntervals: 30,
      style: {
        left: (info.screenWidth - bw) / 2,
        top: info.screenHeight - (bottomOffset || 80),
        width: bw
      }
    })
    bannerAd.onError(function(err) {
      console.warn('[Ad] banner error', err)
    })
    bannerAd.onResize(function(res) {
      // 重新居中
      bannerAd.style.left = (info.screenWidth - res.width) / 2
    })
    return bannerAd
  } catch(e) {
    console.warn('[Ad] create banner failed', e)
    return null
  }
}

function showBanner() {
  if (bannerAd) {
    try { bannerAd.show() } catch(e) {}
  }
}

function hideBanner() {
  if (bannerAd) {
    try { bannerAd.hide() } catch(e) {}
  }
}

function destroyBanner() {
  if (bannerAd) {
    try { bannerAd.destroy() } catch(e) {}
    bannerAd = null
  }
}

// ===== 初始化 =====
function initAds() {
  initRewardedVideoAd()
  createBannerAd()
}

module.exports = {
  AD_CONFIG: AD_CONFIG,
  initAds: initAds,
  showRewardedVideo: showRewardedVideo,
  createBannerAd: createBannerAd,
  showBanner: showBanner,
  hideBanner: hideBanner,
  destroyBanner: destroyBanner
}
