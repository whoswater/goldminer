// ========== 绿茵逐梦狂欢 · 1v1即时对抗足球赛 ==========
var render = null, audio = null, ad = null
try { render = require('./js/render') } catch(e) { console.error('render fail', e) }
try { audio = require('./js/audio') } catch(e) { console.error('audio fail', e) }
try { ad = require('./js/ad') } catch(e) { console.error('ad fail', e) }
if (!render) render = { drawPitchBG:function(){}, drawGoal:function(){}, drawPlayer:function(){},
  drawBall:function(){}, drawMenuBG:function(){}, drawButton:function(){}, hitTest:function(){return false},
  drawText:function(){}, drawStrokeText:function(){}, drawTeamBadge:function(){},
  drawProgressBar:function(){}, roundRect:function(){}, lightenColor:function(c){return c} }
if (!audio) audio = { startBGM:function(){}, stopBGM:function(){}, playKick:function(){},
  playGoal:function(){}, playMiss:function(){}, playWhistle:function(){}, playTick:function(){}, playCheer:function(){} }
if (!ad) ad = { initAds:function(){}, showRewardedVideo:function(cb){if(cb)cb(false)},
  showBanner:function(){}, hideBanner:function(){}, destroyBanner:function(){}, createBannerAd:function(){} }

var CLOUD_ENV = 'cloud1-9gg9bbsw4c401373'
try { if (wx.cloud) wx.cloud.init({ env: CLOUD_ENV }) } catch(e) {}

// ===== 系统 =====
var info = wx.getSystemInfoSync()
var W = info.screenWidth, H = info.screenHeight, dpr = info.pixelRatio
var safeTop = (info.safeArea && info.safeArea.top) || 0
var canvas = wx.createCanvas()
canvas.width = W * dpr; canvas.height = H * dpr
var ctx = canvas.getContext('2d')
ctx.scale(dpr, dpr)

// ===== 13支苏超城市战队 =====
// 2026苏超官方球衣颜色（阿迪达斯设计，中式立领）
var TEAMS = [
  { city:'南京', color:'#1B3A8C', away:'#E8620A', buff:'金陵韧性', bType:'def', emoji:'🌸', bDesc:'防守范围+' },  // 梅花
  { city:'苏州', color:'#C8102E', away:'#8C8C8C', buff:'江南灵动', bType:'spd', emoji:'🍂', bDesc:'移动速度+' },  // 桂花
  { city:'南通', color:'#CC2222', away:'#2B4C8C', buff:'江海爆发', bType:'atk', emoji:'🌼', bDesc:'射门力量+' },  // 菊花
  { city:'无锡', color:'#F5A0B8', away:'#FFFFFF', buff:'太湖之力', bType:'spd', emoji:'🌺', bDesc:'移动速度+' },  // 杜鹃花
  { city:'常州', color:'#D41920', away:'#D6EFD0', buff:'龙城之魂', bType:'def', emoji:'🌹', bDesc:'防守范围+' },  // 月季
  { city:'徐州', color:'#C41E24', away:'#F0C630', buff:'彭城铁军', bType:'atk', emoji:'🌾', bDesc:'射门力量+' },  // 紫薇
  { city:'扬州', color:'#2B7A9E', away:'#E8820A', buff:'烟花三月', bType:'spd', emoji:'💮', bDesc:'移动速度+' },  // 琼花
  { city:'盐城', color:'#D42030', away:'#6CB4E0', buff:'鹤乡之风', bType:'def', emoji:'🌻', bDesc:'防守范围+' },  // 紫薇（用向日葵近似）
  { city:'泰州', color:'#1A2E6C', away:'#D4A820', buff:'凤城之志', bType:'atk', emoji:'🍀', bDesc:'射门力量+' },  // 梅花
  { city:'镇江', color:'#8C1A5A', away:'#6CB4E8', buff:'京口雄风', bType:'def', emoji:'🌿', bDesc:'防守范围+' },  // 杜鹃
  { city:'连云港', color:'#2060A8', away:'#E03020', buff:'海州之浪', bType:'spd', emoji:'🌊', bDesc:'移动速度+' },  // 玉兰（保留海浪特色）
  { city:'淮安', color:'#1858A0', away:'#90C8E8', buff:'淮水之韵', bType:'atk', emoji:'🌷', bDesc:'射门力量+' },  // 月季
  { city:'宿迁', color:'#3078C0', away:'#2E8B57', buff:'霸王之勇', bType:'atk', emoji:'🌱', bDesc:'射门力量+' }   // 紫薇
]

// 2026世界杯参赛队（可选+对手，每队有BUFF）
var WC_TEAMS = [
  // 亚洲
  { city:'中国',   color:'#DE2910', emoji:'🇨🇳', buff:'龙的传人', bType:'def', bDesc:'防守范围+' },
  { city:'日本',   color:'#00247D', emoji:'🇯🇵', buff:'武士之魂', bType:'spd', bDesc:'移动速度+' },
  { city:'韩国',   color:'#C60C30', emoji:'🇰🇷', buff:'太极战意', bType:'atk', bDesc:'射门力量+' },
  { city:'澳大利亚', color:'#F4D03F', emoji:'🇦🇺', buff:'袋鼠跳跃', bType:'spd', bDesc:'移动速度+' },
  { city:'沙特',   color:'#006C35', emoji:'🇸🇦', buff:'沙漠之鹰', bType:'atk', bDesc:'射门力量+' },
  // 欧洲
  { city:'法国',   color:'#002395', emoji:'🇫🇷', buff:'高卢雄鸡', bType:'atk', bDesc:'射门力量+' },
  { city:'德国',   color:'#DD0000', emoji:'🇩🇪', buff:'日耳曼战车', bType:'def', bDesc:'防守范围+' },
  { city:'西班牙', color:'#C60B1E', emoji:'🇪🇸', buff:'斗牛士',   bType:'spd', bDesc:'移动速度+' },
  { city:'英格兰', color:'#CF081F', emoji:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', buff:'三狮军团', bType:'def', bDesc:'防守范围+' },
  { city:'葡萄牙', color:'#006600', emoji:'🇵🇹', buff:'航海先锋', bType:'atk', bDesc:'射门力量+' },
  { city:'荷兰',   color:'#FF6600', emoji:'🇳🇱', buff:'橙色风暴', bType:'spd', bDesc:'移动速度+' },
  { city:'意大利', color:'#0066CC', emoji:'🇮🇹', buff:'蓝衣军团', bType:'def', bDesc:'防守范围+' },
  // 南美
  { city:'巴西',   color:'#009739', emoji:'🇧🇷', buff:'桑巴军团', bType:'spd', bDesc:'移动速度+' },
  { city:'阿根廷', color:'#74ACDF', emoji:'🇦🇷', buff:'潘帕斯雄鹰', bType:'atk', bDesc:'射门力量+' },
  // 北美（东道主）
  { city:'美国',   color:'#002868', emoji:'🇺🇸', buff:'星条旗',   bType:'spd', bDesc:'移动速度+' },
  { city:'墨西哥', color:'#006847', emoji:'🇲🇽', buff:'阿兹特克', bType:'atk', bDesc:'射门力量+' },
  // 非洲
  { city:'摩洛哥', color:'#C1272D', emoji:'🇲🇦', buff:'沙漠之狐', bType:'def', bDesc:'防守范围+' },
  { city:'塞内加尔', color:'#009639', emoji:'🇸🇳', buff:'特兰加雄狮', bType:'atk', bDesc:'射门力量+' }
]

// 苏超联赛赛程（6场）
// 2026苏超真实赛程（78场常规赛 + 淘汰赛）
// 队伍索引：0南京 1苏州 2南通 3无锡 4常州 5徐州 6扬州 7盐城 8泰州 9镇江 10连云港 11淮安 12宿迁
// 每场：[主队idx, 客队idx, 周次, 日期]
var REAL_MATCHES = [
  // 第1周 4/11
  [4,2,1,'4/11'],[6,1,1,'4/11'],[3,9,1,'4/11'],[10,7,1,'4/11'],
  // 第2周 4/18
  [12,0,2,'4/18'],[11,6,2,'4/18'],[5,8,2,'4/18'],
  // 第3周 4/25
  [10,3,3,'4/25'],[2,5,3,'4/25'],[7,12,3,'4/25'],
  // 第4周 5/2
  [0,4,4,'5/2'],[8,6,4,'5/2'],[1,11,4,'5/2'],[9,7,4,'5/2'],
  // 第5周 5/9
  [3,8,5,'5/9'],[2,0,5,'5/9'],[5,12,5,'5/9'],
  // 第6周 5/16
  [4,11,6,'5/16'],[1,10,6,'5/16'],[6,9,6,'5/16'],
  // 第7周 5/23
  [11,7,7,'5/23'],[10,5,7,'5/23'],[12,2,7,'5/23'],
  // 第8周 5/30
  [8,1,8,'5/30'],[7,6,8,'5/30'],[9,4,8,'5/30'],[3,0,8,'5/30'],
  // 第9周 6/13
  [5,3,9,'6/13'],[12,9,9,'6/13'],[2,8,9,'6/13'],
  // 第10周 6/20
  [4,7,10,'6/20'],[6,10,10,'6/20'],[1,2,10,'6/20'],[0,11,10,'6/20'],
  // 第11周 6/27
  [11,3,11,'6/27'],[9,1,11,'6/27'],[10,4,11,'6/27'],
  // 第12周 7/4
  [7,1,12,'7/4'],[3,12,12,'7/4'],[8,9,12,'7/4'],[5,0,12,'7/4'],
  // 第13周 7/11
  [12,4,13,'7/11'],[0,10,13,'7/11'],[2,6,13,'7/11'],
  // 第14周 7/25
  [9,11,14,'7/25'],[1,3,14,'7/25'],[4,8,14,'7/25'],[6,5,14,'7/25'],
  // 第15周 8/1
  [7,0,15,'8/1'],[11,2,15,'8/1'],[10,12,15,'8/1'],
  // 第16周 8/8
  [3,7,16,'8/8'],[8,10,16,'8/8'],[5,4,16,'8/8'],
  // 第17周 8/15
  [2,9,17,'8/15'],[12,1,17,'8/15'],[0,6,17,'8/15'],
  // 第18周 8/22
  [1,0,18,'8/22'],[9,5,18,'8/22'],[8,11,18,'8/22'],
  // 第19周 8/29
  [6,12,19,'8/29'],[4,3,19,'8/29'],[11,10,19,'8/29'],
  // 第20周 9/5
  [10,8,20,'9/5'],[7,5,20,'9/5'],[0,2,20,'9/5'],
  // 第21周 9/12
  [12,8,21,'9/12'],[7,2,21,'9/12'],[0,9,21,'9/12'],[3,6,21,'9/12'],[5,11,21,'9/12'],[4,1,21,'9/12'],
  // 第22周 9/19
  [1,5,22,'9/19'],[2,3,22,'9/19'],[9,10,22,'9/19'],[6,4,22,'9/19'],[11,12,22,'9/19'],[8,7,22,'9/19']
]

// 根据玩家队伍提取12场积分赛对手（按真实赛程顺序）
function getTeamSchedule(teamIdx) {
  var matches = []
  for (var i = 0; i < REAL_MATCHES.length; i++) {
    var m = REAL_MATCHES[i]
    if (m[0] === teamIdx) matches.push({ opIdx: m[1], week: m[2], date: m[3], home: true })
    else if (m[1] === teamIdx) matches.push({ opIdx: m[0], week: m[2], date: m[3], home: false })
  }
  // 按周次排序
  matches.sort(function(a, b) { return a.week - b.week })
  return matches
}

// 构建赛程（积分赛按真实顺序 + 淘汰赛）
function buildLeagueSchedule() {
  var schedule = []
  var teamIdx = (typeof D !== 'undefined' && D.teamIdx >= 0) ? D.teamIdx : -1
  var teamMatches = teamIdx >= 0 ? getTeamSchedule(teamIdx) : []
  // 积分赛12场
  for (var i = 0; i < 12; i++) {
    var m = teamMatches[i]
    var roundStr = m ? ('第' + m.week + '周 ' + m.date + (m.home ? ' 主' : ' 客')) : ('第' + (i+1) + '轮')
    schedule.push({ stage:'积分赛', round: roundStr, diff: 0.2 + i * 0.03, leg: 0 })
  }
  // 八强淘汰赛（两回合）
  schedule.push({ stage:'八强赛', round:'第一回合（主场）', diff: 0.6, leg: 1 })
  schedule.push({ stage:'八强赛', round:'第二回合（客场）', diff: 0.63, leg: 2 })
  // 半决赛（两回合）
  schedule.push({ stage:'半决赛', round:'第一回合（主场）', diff: 0.72, leg: 1 })
  schedule.push({ stage:'半决赛', round:'第二回合（客场）', diff: 0.76, leg: 2 })
  // 决赛
  schedule.push({ stage:'决赛', round:'苏超总决赛 🏆', diff: 0.9, leg: 0 })
  return schedule
}
var LEAGUE_SCHEDULE = [] // 延迟到D初始化后构建

// 2026世界杯赛程（7场完整晋级之路）
// 赛事日期：2026年6月11日 - 7月19日，美国·加拿大·墨西哥
var WC_SCHEDULE = [
  { stage:'小组赛', round:'A组 第1轮',    date:'6月12日', diff: 0.35 },
  { stage:'小组赛', round:'A组 第2轮',    date:'6月17日', diff: 0.42 },
  { stage:'小组赛', round:'A组 第3轮',    date:'6月22日', diff: 0.5 },
  { stage:'淘汰赛', round:'1/8决赛',      date:'6月29日', diff: 0.6 },
  { stage:'淘汰赛', round:'1/4决赛',      date:'7月5日',  diff: 0.72 },
  { stage:'淘汰赛', round:'半决赛',       date:'7月10日', diff: 0.85 },
  { stage:'决赛',   round:'世界杯决赛 🏆', date:'7月19日', diff: 0.95 }
]

// ===== 存档管理 =====
function loadData() {
  return {
    nickname: wx.getStorageSync('nickname') || '',
    teamIdx: wx.getStorageSync('teamIdx'),      // 苏超战队索引
    wcTeamIdx: wx.getStorageSync('wcTeamIdx'),   // 世界杯战队索引
    coins: wx.getStorageSync('coins') || 0,
    stats: wx.getStorageSync('stats') || { atk: 1, spd: 1, def: 1 },
    leagueWins: wx.getStorageSync('leagueWins') || [],
    wcWins: wx.getStorageSync('wcWins') || [],
    dailyDone: wx.getStorageSync('dailyDone_' + todayStr()) || {}
  }
}
function saveField(key, val) { wx.setStorageSync(key, val) }
function todayStr() { var d = new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate() }

var D = loadData()
if (typeof D.teamIdx !== 'number' || D.teamIdx < 0 || D.teamIdx >= TEAMS.length) D.teamIdx = -1
if (typeof D.wcTeamIdx !== 'number' || D.wcTeamIdx < 0 || D.wcTeamIdx >= WC_TEAMS.length) D.wcTeamIdx = -1
LEAGUE_SCHEDULE = buildLeagueSchedule()

// 战队选择模式：'league' = 苏超, 'wc' = 世界杯
var teamSelectMode = 'league'

// ===== 全局状态 =====
var scene = 'home'
// home, teamSelect, training, leagueMap, wcMap, prematch, match, matchResult, ranking
var _nickInputting = false

// ----- 球场安全区域（按真实球场 105m×68m 比例，留边线空间）-----
var safeBottom = (info.safeArea && info.safeArea.bottom) ? (H - info.safeArea.bottom) : 0
var _PT = safeTop + 52     // 可用区域顶部
var _PB = H - Math.max(safeBottom, 20) - 8  // 可用区域底部
var _maxH = _PB - _PT      // 最大可用高度
var PL = W * 0.02         // 球场左边界
var PR = W * 0.98         // 球场右边界
var _PW = PR - PL          // 球场宽度
var _realH = _PW * 1.54    // 真实比例球场高度 (105/68≈1.54)
var PH = Math.min(_realH, _maxH * 0.98)  // 几乎填满
var _centerY = (_PT + _PB) / 2    // 垂直居中
var PT = _centerY - PH / 2        // 球场顶部
var PB = _centerY + PH / 2        // 球场底部
// 球场坐标转换：f=0为球场顶，f=1为球场底
function py(f) { return PT + PH * f }

// ----- 比赛变量 -----
var matchMode = 'league' // 'league' or 'wc'
var matchIdx = 0          // 当前比赛索引
var opponentTeam = null   // 对手信息 {city, color, emoji}
var matchDiff = 0.5       // AI难度 0-1
var matchTime = 0         // 比赛剩余时间(ms)
var matchDuration = 90000 // 90秒一局
var matchStartTime = 0
var myGoals = 0, opGoals = 0
var goalEvents = []       // [{time, side:'my'|'op', x, y}]
var goalFlashTime = 0
var goalFlashSide = ''
var matchPaused = false
var matchCountdown = 0    // 开球倒计时
var adDoubleUsed = false  // 本场是否已用过广告双倍奖励

// 比赛人数模式
var matchTeamSize = 5 // 5v5 默认

// 5v5 阵型（4球员 + 1守门员，2-1-1）
var FORMATION_2 = [
  { role:'ST',  hx:0.50, hy:0.28, num:9 },  // 前锋
  { role:'LW',  hx:0.25, hy:0.45, num:7 },  // 左翼
  { role:'RW',  hx:0.75, hy:0.45, num:11 }, // 右翼
  { role:'CB',  hx:0.50, hy:0.65, num:4 },  // 后卫
  { role:'GK',  hx:0.50, hy:0.90, num:1 }   // 门线
]

// 11v11 阵型（4-3-3）
var FORMATION = [
  // 前锋线 (y≈0.22)
  { role:'ST',  hx:0.50, hy:0.22, num:9 },  // 中锋
  { role:'LW',  hx:0.18, hy:0.26, num:11 }, // 左边锋，略靠后
  { role:'RW',  hx:0.82, hy:0.26, num:7 },  // 右边锋
  // 中场线 (y≈0.48)
  { role:'CM',  hx:0.32, hy:0.46, num:8 },  // 左中场
  { role:'CM',  hx:0.68, hy:0.46, num:6 },  // 右中场
  { role:'CDM', hx:0.50, hy:0.54, num:10 }, // 后腰（稍靠后）
  // 后卫线 (y≈0.74)
  { role:'LB',  hx:0.14, hy:0.72, num:3 },  // 左后卫
  { role:'CB',  hx:0.38, hy:0.76, num:4 },  // 左中卫
  { role:'CB',  hx:0.62, hy:0.76, num:5 },  // 右中卫
  { role:'RB',  hx:0.86, hy:0.72, num:2 },  // 右后卫
  // 守门员 (y≈0.94)
  { role:'GK',  hx:0.50, hy:0.94, num:1 }
]
var PLAYER_R = 11
var myTeam = []   // [{x,y,num,role}] 11人
var opTeam = []   // 同上
var ctrlIdx = 0   // 我方当前控制的球员索引（不含GK）
// 安全设置ctrlIdx，永远不选GK
function setCtrl(idx) { if (idx >= 0 && idx < gkIdx()) ctrlIdx = idx }
// 切换到离球最近的队友（排除当前控制的）
function switchToNearest() {
  var bestIdx = -1, bestD = 99999
  for (var i = 0; i < gkIdx(); i++) {
    if (i === ctrlIdx) continue
    var d = dist2(myTeam[i], ball)
    if (d < bestD) { bestD = d; bestIdx = i }
  }
  if (bestIdx >= 0) {
    setCtrl(bestIdx)
    floats.push({ x: myTeam[bestIdx].x, y: myTeam[bestIdx].y - 20, text: '切换#' + myTeam[bestIdx].num, color: '#1E90FF', born: Date.now() })
  }
}
var ball = { x:0, y:0, vx:0, vy:0, side:'', idx:-1, flyTarget:-1 }
// side: 'my','op','','fly'  idx: 持球球员索引

// 控制
var touchDown = false, touchX = 0, touchY = 0, touchStartX = 0, touchStartY = 0
var playerGrabbed = false // 5v5模式：是否已选中球员

// 虚拟摇杆 + 按钮
var joystick = { active: false, touchId: -1, baseX: 0, baseY: 0, stickX: 0, stickY: 0, dx: 0, dy: 0 }
var JOY_RADIUS = 50, JOY_STICK_R = 22
var BTN_SHOOT = { x: 0, y: 0, r: 30 }
var BTN_PASS = { x: 0, y: 0, r: 24 }
var BTN_SWITCH = { x: 0, y: 0, r: 22 }
var shootBtnPressed = false, passBtnPressed = false, switchBtnPressed = false
var shootBtnTouchId = -1, passBtnTouchId = -1, switchBtnTouchId = -1
var shootChargeStart = 0, passChargeStart = 0 // 蓄力开始时间
var CHARGE_MAX_MS = 500 // 最大蓄力时间ms
var leagueScrollY = 0 // 联赛地图滚动偏移
// swipeVX/VY 已移除（未使用）

// 比赛动画
var particles = []  // {x,y,vx,vy,color,born,size}
var floats = []     // {x,y,text,color,born}

// ----- 新手引导 -----
var guideStep = 0  // 0=不显示, 1=移动, 2=射门, 3=完成
var guideTimer = 0
var hasPlayedBefore = wx.getStorageSync('hasPlayed') || false

// ----- 点球大战 -----
var CHL_TOTAL = 5  // 每次挑战5球
var chlShots = []   // 记录的射门 [{sx,sy,vx,vy}]
var chlGoals = 0    // 进攻方进球数
var chlSaves = 0    // 防守方扑救数
var chlResults = [] // 每球结果 ['goal','miss','saved',...]
var chlDefResults = [] // 防守方每球结果 ['save','fail',...]
var chlRound = 0    // 当前第几球 0-4
var chlPhase = ''   // 'ready','aim','flying','result','done'
var chlBall = { x:0, y:0, vx:0, vy:0 }
var chlGKX = 0      // 防守方守门员X
var chlGKAIX = 0    // 进攻方AI守门员X
var chlTimer = 0
var chlId = ''      // 云端挑战ID
var chlData = null  // 从云端拉取的挑战数据
var chlRole = ''    // 'attack' or 'defend'
var chlResultData = null // 最终对比结果
var pendingChallengeId = '' // 从分享链接进入的挑战ID

// ===== 昵称 =====
function askNickname(cb) {
  if (_nickInputting) return
  _nickInputting = true
  // 用 wx.createTextInput 或 fallback 到默认昵称
  try {
    var input = wx.createTextInput({
      x: W * 0.15, y: H * 0.4, width: W * 0.7, height: 40,
      placeholder: '输入昵称（最多8字）',
      maxLength: 8,
      focus: true,
      confirmType: 'done'
    })
    input.onConfirm(function(res) {
      var name = (res.value || '').trim().substring(0, 8)
      if (name) { D.nickname = name; saveField('nickname', D.nickname) }
      input.destroy(); _nickInputting = false
      if (cb) cb()
    })
  } catch(e) {
    // fallback: 所有输入API都不可用，生成默认昵称
    _nickInputting = false
    D.nickname = '球员' + Math.floor(Math.random() * 9000 + 1000)
    saveField('nickname', D.nickname)
    if (cb) cb()
  }
}

// ===== BUFF 效果 =====
// 获取当前模式下的我方战队信息
function getMyTeam() {
  if (matchMode === 'wc' && D.wcTeamIdx >= 0) return WC_TEAMS[D.wcTeamIdx]
  if (D.teamIdx >= 0) return TEAMS[D.teamIdx]
  return { city:'???', color:'#888', emoji:'❓', buff:'', bType:'', bDesc:'' }
}

function getStatValue(type) {
  var base = D.stats[type] || 1
  var team = getMyTeam()
  if (team.bType === type) base += 0.5
  return base
}

// ===== 帧循环 =====
var lastFrameTime = Date.now()
function frame() {
  var now = Date.now()
  var dt = Math.min(now - lastFrameTime, 33) // 最大33ms
  lastFrameTime = now
  try {
    ctx.clearRect(0, 0, W, H)
    if (scene === 'home') drawHome()
    else if (scene === 'teamSelect') drawTeamSelect()
    else if (scene === 'training') drawTraining()
    else if (scene === 'leagueMap') drawLeagueMap()
    else if (scene === 'wcMap') drawWCMap()
    else if (scene === 'prematch') drawPrematch()
    else if (scene === 'match') { try { updateMatch(dt) } catch(me) { console.error('updateMatch error', me) }; drawMatch() }
    else if (scene === 'matchResult') drawMatchResult()
    // ranking已移除
    else if (scene === 'chlAttack') { updateChlAttack(dt); drawChlAttack() }
    else if (scene === 'chlDefend') { updateChlDefend(dt); drawChlDefend() }
    else if (scene === 'chlResult') drawChlResult()
  } catch(e) { console.error('frame error', e) }
  requestAnimationFrame(frame)
}

// ==================== 首页 ====================
function drawHome() {
  var t = Date.now() / 1000
  render.drawMenuBG(ctx, W, H, t)
  var cx = W / 2, st = safeTop

  // 标题
  var titleY = st + H * 0.08
  ctx.shadowColor = '#4CAF50'; ctx.shadowBlur = 20 + Math.sin(t * 2) * 6
  render.drawStrokeText(ctx, '绿茵逐梦', cx, titleY, 'bold ' + (W * 0.12) + 'px sans-serif', '#fff', 'rgba(0,80,0,0.7)', 5)
  ctx.shadowBlur = 0
  render.drawText(ctx, '⚽ 狂 欢 ⚽', cx, titleY + W * 0.09, 'bold ' + (W * 0.05) + 'px sans-serif', '#ffd700')

  // 战队信息卡片
  var infoY = st + H * 0.22
  var cardH = D.teamIdx >= 0 ? 65 : 42
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  render.roundRect(ctx, W * 0.06, infoY - 14, W * 0.88, cardH, 10); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1
  render.roundRect(ctx, W * 0.06, infoY - 14, W * 0.88, cardH, 10); ctx.stroke()

  if (D.teamIdx >= 0) {
    var sTeam = TEAMS[D.teamIdx]
    // 战队名 + buff — 白色加粗确保可读
    render.drawStrokeText(ctx, sTeam.emoji + ' ' + sTeam.city + ' · ' + sTeam.buff, cx - W * 0.02, infoY + 6, 'bold ' + (W * 0.038) + 'px sans-serif', '#fff', 'rgba(0,0,0,0.4)', 3)
    render.drawText(ctx, '🔄换队', W * 0.85, infoY + 6, (W * 0.026) + 'px sans-serif', 'rgba(255,255,255,0.85)', 'center')
    // 昵称 + 金币
    var bottomLine = D.nickname ? ('⚽ ' + D.nickname + '  💰' + D.coins) : '💰' + D.coins
    render.drawText(ctx, bottomLine, cx, infoY + 34, (W * 0.03) + 'px sans-serif', 'rgba(255,255,255,0.9)')
  } else {
    var blink = 0.7 + Math.sin(t * 3) * 0.3
    ctx.globalAlpha = blink
    render.drawText(ctx, '👆 点击选择城市战队', cx, infoY + 10, 'bold ' + (W * 0.038) + 'px sans-serif', '#ffd700')
    ctx.globalAlpha = 1
  }

  // 昵称（未设置时单独显示）
  if (!D.nickname && D.teamIdx >= 0) {
    ctx.globalAlpha = 0.7 + Math.sin(t * 3) * 0.3
    render.drawText(ctx, '👆 设置昵称', cx, infoY + 34, (W * 0.03) + 'px sans-serif', '#ffd700')
    ctx.globalAlpha = 1
  }

  // 主按钮 — 苏超联赛（大按钮）
  var bw = W * 0.75, bh = W * 0.15, bx = cx - bw / 2
  var mainBtnY = H * 0.40
  if (D.teamIdx < 0) {
    render.drawText(ctx, '⚠️ 请先选择城市战队', cx, mainBtnY - 18, (W * 0.032) + 'px sans-serif', '#ff6b6b')
  }
  var mainScale = 1 + Math.sin(t * 2) * 0.015
  ctx.save(); ctx.translate(cx, mainBtnY + bh / 2); ctx.scale(mainScale, mainScale); ctx.translate(-cx, -(mainBtnY + bh / 2))
  render.drawButton(ctx, bx, mainBtnY, bw, bh, '🌿 苏超联赛', ['#2E7D32', '#4CAF50'])
  ctx.restore()

  // 联赛进度提示
  var leagueHint = D.leagueWins.length > 0 ? '进度 ' + D.leagueWins.length + '/' + LEAGUE_SCHEDULE.length : '开启征程'
  render.drawText(ctx, leagueHint, cx, mainBtnY + bh + 14, (W * 0.028) + 'px sans-serif', 'rgba(255,255,255,0.8)')

  // 底部功能按钮行
  var sBtnW = W * 0.28, sBtnH = W * 0.11
  var sBtnY = H * 0.62, sBtnGap = 8
  // 世界杯只在2026.6.1~7.31期间显示
  var now2 = new Date(), wcOpen = (now2.getFullYear() === 2026 && now2.getMonth() >= 5 && now2.getMonth() <= 6)
  var sbtns = []
  if (wcOpen) sbtns.push({ text:'🌍 世界杯', colors:['#1565C0','#1E88E5'], action:'wc' })
  sbtns.push({ text:'⚽ 点球大战', colors:['#C62828','#E53935'], action:'pk' })
  sbtns.push({ text:'💪 训练', colors:['#E65100','#FF9800'], action:'train' })
  var totalSW = sbtns.length * sBtnW + (sbtns.length - 1) * sBtnGap
  var sStartX = cx - totalSW / 2
  for (var si = 0; si < sbtns.length; si++) {
    render.drawButton(ctx, sStartX + si * (sBtnW + sBtnGap), sBtnY, sBtnW, sBtnH, sbtns[si].text, sbtns[si].colors)
  }

  // 底部提示
  render.drawText(ctx, '摇杆操控 · 即时对抗 · 90秒一局', cx, H * 0.88, (W * 0.025) + 'px sans-serif', 'rgba(255,255,255,0.7)')
}

// ==================== 战队选择（支持苏超/世界杯两种模式）====================
function drawTeamSelect() {
  var t = Date.now() / 1000
  render.drawMenuBG(ctx, W, H, t)
  var cx = W / 2, st = safeTop + 6
  var isWC = teamSelectMode === 'wc'
  var pool = isWC ? WC_TEAMS : TEAMS
  var selIdx = isWC ? D.wcTeamIdx : D.teamIdx

  // 标题
  var title = isWC ? '🌍 选择世界杯战队' : '🌿 选择苏超战队'
  var titleColor = isWC ? '#1E88E5' : '#4CAF50'
  render.drawStrokeText(ctx, title, cx, st + 24, 'bold ' + (W * 0.045) + 'px sans-serif', '#fff', 'rgba(0,40,40,0.4)', 3)
  render.drawText(ctx, '← 返回', W * 0.12, st + 24, (W * 0.028) + 'px sans-serif', 'rgba(255,255,255,0.4)', 'center')

  // BUFF说明
  var buffY = st + 48
  var bi = [
    { icon:'💨', label:'速度', color:'#1E90FF' },
    { icon:'💪', label:'力量', color:'#FF6B00' },
    { icon:'🛡️', label:'韧性', color:'#D4213D' }
  ]
  for (var b = 0; b < 3; b++) {
    render.drawText(ctx, bi[b].icon + bi[b].label, W * 0.17 + b * W * 0.33, buffY, (W * 0.022) + 'px sans-serif', bi[b].color)
  }

  // 战队网格
  var cols = isWC ? 4 : 3
  var cellW = W / cols, cellH = isWC ? 68 : 76
  var gridTop = st + 66, badgeR = isWC ? 18 : 22

  // 滚动区域（世界杯队伍多，需要紧凑布局）
  for (var i = 0; i < pool.length; i++) {
    var row = Math.floor(i / cols), col = i % cols
    var bx = cellW * col + cellW / 2
    var by = gridTop + row * cellH + 8
    if (by > H - 100) continue // 超出屏幕跳过
    render.drawTeamBadge(ctx, bx, by, badgeR, pool[i].color, pool[i].city, i === selIdx, pool[i].emoji)
  }

  // 选中信息
  if (selIdx >= 0 && selIdx < pool.length) {
    var selT = pool[selIdx]
    var infoY = H - 90
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    render.roundRect(ctx, W * 0.08, infoY - 10, W * 0.84, 40, 8); ctx.fill()
    render.drawText(ctx, selT.emoji + ' ' + selT.city + ' · ' + selT.buff + ' · ' + selT.bDesc, cx, infoY + 10, 'bold ' + (W * 0.03) + 'px sans-serif', selT.color)
  }

  // 确认按钮
  var btnW = W * 0.5, btnH = W * 0.1
  var btnY = H - 46
  if (selIdx >= 0) {
    render.drawButton(ctx, cx - btnW / 2, btnY, btnW, btnH, '✅ 确认出战', isWC ? ['#1565C0','#1E88E5'] : ['#2E7D32','#4CAF50'])
  } else {
    render.drawText(ctx, '请选择战队', cx, btnY + btnH / 2, (W * 0.03) + 'px sans-serif', 'rgba(255,255,255,0.3)')
  }
}

// ==================== 球员训练 ====================
function drawTraining() {
  var t = Date.now() / 1000
  render.drawMenuBG(ctx, W, H, t)
  var cx = W / 2, st = safeTop + 10

  render.drawStrokeText(ctx, '球员训练', cx, st + 28, 'bold ' + (W * 0.05) + 'px sans-serif', '#fff', 'rgba(0,60,0,0.4)', 3)
  render.drawText(ctx, '← 返回', W * 0.12, st + 28, (W * 0.03) + 'px sans-serif', 'rgba(255,255,255,0.4)', 'center')

  if (D.teamIdx >= 0) {
    var team = TEAMS[D.teamIdx]
    render.drawText(ctx, team.emoji + ' ' + team.city + ' · ' + team.buff, cx, st + 60, 'bold ' + (W * 0.035) + 'px sans-serif', team.color)
  }
  render.drawText(ctx, '💰 ' + D.coins + ' 金币', cx, st + 85, 'bold ' + (W * 0.04) + 'px sans-serif', '#ffd700')

  var statNames = [
    { key:'atk', name:'射门', icon:'⚽', color:'#FF6B00', desc:'提升射门球速和精度' },
    { key:'spd', name:'速度', icon:'💨', color:'#1E90FF', desc:'提升球员移动和冲刺速度' },
    { key:'def', name:'防守', icon:'🛡️', color:'#D4213D', desc:'扩大守门员扑救范围' }
  ]

  var cardY = st + 120
  var cardH = 90
  for (var i = 0; i < statNames.length; i++) {
    var s = statNames[i]
    var cy = cardY + i * (cardH + 12)
    var lv = D.stats[s.key] || 1
    var maxLv = 5
    var cost = lv * 30 + 20

    // 卡片背景
    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    render.roundRect(ctx, W * 0.06, cy, W * 0.88, cardH, 12); ctx.fill()

    // 图标+名称
    render.drawText(ctx, s.icon + ' ' + s.name, W * 0.2, cy + 20, 'bold ' + (W * 0.04) + 'px sans-serif', s.color, 'center')
    render.drawText(ctx, s.desc, W * 0.2, cy + 42, (W * 0.022) + 'px sans-serif', 'rgba(255,255,255,0.3)', 'center')

    // 等级条
    var barX = W * 0.38, barW = W * 0.35
    render.drawProgressBar(ctx, barX, cy + 16, barW, 10, lv / maxLv, s.color)
    render.drawText(ctx, 'Lv.' + lv + '/' + maxLv, barX + barW / 2, cy + 36, (W * 0.025) + 'px sans-serif', 'rgba(255,255,255,0.5)')

    // 当前数值效果
    var effectVal = getStatValue(s.key)
    var effectTexts = {
      atk: '球速 ×' + effectVal.toFixed(1),
      spd: '跑速 ×' + effectVal.toFixed(1),
      def: '扑救 ×' + effectVal.toFixed(1)
    }
    render.drawText(ctx, effectTexts[s.key], barX + barW / 2, cy + 52, (W * 0.02) + 'px sans-serif', s.color)

    // 有BUFF加成标记
    if (D.teamIdx >= 0 && TEAMS[D.teamIdx].bType === s.key) {
      render.drawText(ctx, '★ 战队加成+0.5', barX + barW / 2, cy + 66, (W * 0.018) + 'px sans-serif', safeColor(TEAMS[D.teamIdx].color))
    }

    // 升级按钮
    if (lv < maxLv) {
      var ubw = W * 0.18, ubh = 28
      var ubx = W * 0.78 - ubw / 2, uby = cy + 30
      if (D.coins >= cost) {
        render.drawButton(ctx, ubx, uby, ubw, ubh, '升级 ' + cost + '💰', ['#2E7D32', '#43A047'])
      } else {
        // 金币不足时显示看广告赚金币按钮
        render.drawButton(ctx, ubx, uby, ubw, ubh, '🎬 +15💰', ['#FF6F00', '#FFA000'])
      }
    } else {
      render.drawText(ctx, '已满级', W * 0.78, cy + 44, (W * 0.026) + 'px sans-serif', '#ffd700')
    }
  }

  // 日常任务
  var taskY = cardY + 3 * (cardH + 12) + 10
  render.drawText(ctx, '📋 每日任务', cx, taskY, 'bold ' + (W * 0.035) + 'px sans-serif', 'rgba(255,255,255,0.6)')
  var tasks = [
    { id:'login', name:'每日登录', reward: 5, done: D.dailyDone.login },
    { id:'match1', name:'完成1场比赛', reward: 5, done: D.dailyDone.match1 },
    { id:'win1', name:'赢得1场比赛', reward: 10, done: D.dailyDone.win1 }
  ]
  for (var ti = 0; ti < tasks.length; ti++) {
    var task = tasks[ti]
    var tty = taskY + 24 + ti * 28
    var statusText = task.done ? '✅ 已完成' : '💰+' + task.reward
    var statusColor = task.done ? 'rgba(255,255,255,0.45)' : '#ffd700'
    render.drawText(ctx, task.name, cx - W * 0.1, tty, (W * 0.026) + 'px sans-serif', 'rgba(255,255,255,0.5)', 'center')
    render.drawText(ctx, statusText, cx + W * 0.25, tty, (W * 0.024) + 'px sans-serif', statusColor, 'center')
  }

  // 领取每日登录
  if (!D.dailyDone.login) {
    D.dailyDone.login = true; D.coins += 5
    saveField('dailyDone_' + todayStr(), D.dailyDone); saveField('coins', D.coins)
  }
}

// ==================== 联赛地图 ====================
function drawLeagueMap() {
  var t = Date.now() / 1000
  render.drawMenuBG(ctx, W, H, t)
  var cx = W / 2, st = safeTop + 10

  render.drawStrokeText(ctx, '🌿 苏超联赛', cx, st + 24, 'bold ' + (W * 0.048) + 'px sans-serif', '#fff', 'rgba(0,60,0,0.4)', 3)
  render.drawText(ctx, '← 返回', W * 0.12, st + 24, (W * 0.028) + 'px sans-serif', 'rgba(255,255,255,0.6)', 'center')

  var progress = D.leagueWins.length
  var curY = st + 50

  // ---- 积分赛区（紧凑表格：4列3行 = 12场）----
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  render.roundRect(ctx, W * 0.04, curY, W * 0.92, 140, 8); ctx.fill()
  ctx.fillStyle = '#4CAF50'
  render.roundRect(ctx, W * 0.04, curY, W * 0.92, 22, 8); ctx.fill()
  render.drawText(ctx, '积分赛（' + Math.min(progress, 12) + '/12）', cx, curY + 11, 'bold ' + (W * 0.026) + 'px sans-serif', '#fff')

  var cols = 4, cellW = W * 0.92 / cols, cellH = 38
  var tableTop = curY + 26
  for (var i = 0; i < 12; i++) {
    var row = Math.floor(i / cols), col = i % cols
    var cellX = W * 0.04 + col * cellW, cellY = tableTop + row * cellH
    var played = i < progress
    var current = i === progress && progress < 12

    // 单元格背景
    if (current) {
      ctx.fillStyle = 'rgba(76,175,80,0.25)'
      ctx.fillRect(cellX + 1, cellY, cellW - 2, cellH - 2)
    }

    var opIdx = getLeagueOpponent(i)
    var opTeamL = TEAMS[opIdx]

    // 对手名
    render.drawText(ctx, opTeamL.emoji + opTeamL.city, cellX + cellW / 2, cellY + 13,
      (W * 0.024) + 'px sans-serif', played || current ? '#fff' : 'rgba(255,255,255,0.3)')

    // 比分
    if (played) {
      var r = D.leagueWins[i]
      var rc = r.myGoals > r.opGoals ? '#4CAF50' : r.myGoals < r.opGoals ? '#ff6b6b' : '#ffd700'
      render.drawText(ctx, r.myGoals + ':' + r.opGoals, cellX + cellW / 2, cellY + 30,
        'bold ' + (W * 0.024) + 'px sans-serif', rc)
    } else if (current) {
      render.drawText(ctx, '⚽', cellX + cellW / 2, cellY + 30, (W * 0.024) + 'px sans-serif', '#ffd700')
    }

    // 网格线
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.5
    ctx.strokeRect(cellX, cellY, cellW, cellH)
  }
  curY += 170

  // ---- 淘汰赛区 ----
  var koNodeH = 50, koNH = 42
  for (var ki = 12; ki < LEAGUE_SCHEDULE.length; ki++) {
    var s = LEAGUE_SCHEDULE[ki]
    var played2 = ki < progress
    var current2 = ki === progress
    var locked2 = ki > progress

    // 阶段标签
    if (ki === 12 || s.stage !== LEAGUE_SCHEDULE[ki - 1].stage) {
      var stageColors = { '八强赛':'#FF9800', '半决赛':'#E53935', '决赛':'#ffd700' }
      ctx.fillStyle = stageColors[s.stage] || '#FF9800'
      render.roundRect(ctx, W * 0.25, curY, W * 0.5, 18, 9); ctx.fill()
      render.drawText(ctx, s.stage, cx, curY + 9, 'bold ' + (W * 0.024) + 'px sans-serif', '#fff')
      curY += 22
    }

    // 节点
    ctx.fillStyle = current2 ? 'rgba(76,175,80,0.2)' : 'rgba(0,0,0,0.15)'
    render.roundRect(ctx, W * 0.05, curY, W * 0.9, koNH, 6); ctx.fill()
    if (current2) {
      ctx.strokeStyle = '#4CAF50'; ctx.lineWidth = 1.5
      render.roundRect(ctx, W * 0.05, curY, W * 0.9, koNH, 6); ctx.stroke()
    }

    var icon2 = played2 ? '✅' : current2 ? '⚽' : '🔒'
    render.drawText(ctx, icon2, W * 0.1, curY + koNH / 2, (W * 0.035) + 'px sans-serif', '#fff')
    render.drawText(ctx, s.round, W * 0.2, curY + koNH / 2, (W * 0.022) + 'px sans-serif',
      locked2 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.8)', 'left')

    var opIdx2 = getLeagueOpponent(ki)
    if (opIdx2 >= 0) {
      var opT2 = TEAMS[opIdx2]
      render.drawText(ctx, 'vs ' + opT2.emoji + ' ' + opT2.city, W * 0.68, curY + koNH / 2, 'bold ' + (W * 0.026) + 'px sans-serif',
        locked2 ? 'rgba(255,255,255,0.35)' : '#fff', 'center')
    } else {
      render.drawText(ctx, 'vs ❓❓❓', W * 0.68, curY + koNH / 2, 'bold ' + (W * 0.026) + 'px sans-serif',
        'rgba(255,255,255,0.3)', 'center')
    }

    if (played2) {
      var r2 = D.leagueWins[ki]
      var rc2 = r2.myGoals > r2.opGoals ? '#4CAF50' : r2.myGoals < r2.opGoals ? '#ff6b6b' : '#ffd700'
      render.drawText(ctx, r2.myGoals + ':' + r2.opGoals, W * 0.92, curY + koNH / 2, 'bold ' + (W * 0.028) + 'px sans-serif', rc2, 'center')
    }
    curY += koNodeH
  }

  // 开始比赛按钮（紧跟内容，不超过底部安全区）
  var btnY = Math.min(curY + 15, H - 65)
  if (progress < LEAGUE_SCHEDULE.length) {
    var bw = W * 0.6, bh = W * 0.12
    render.drawButton(ctx, cx - bw / 2, btnY, bw, bh, '⚽ 开始比赛', ['#2E7D32', '#4CAF50'])
  } else {
    render.drawText(ctx, '🏆 恭喜完成苏超联赛！', cx, btnY + 5, 'bold ' + (W * 0.035) + 'px sans-serif', '#ffd700')
    var bw = W * 0.5, bh = W * 0.11
    render.drawButton(ctx, cx - bw / 2, btnY + 28, bw, bh, '🔄 重新挑战', ['#E65100', '#FF9800'])
  }
}

// 根据真实赛程获取积分赛对手，淘汰赛随机揭晓
function getLeagueOpponent(matchIndex) {
  var s = LEAGUE_SCHEDULE[matchIndex]
  if (s && s.leg === 2) matchIndex = matchIndex - 1

  if (matchIndex < 12) {
    // 积分赛：从真实赛程中读取
    var teamMatches = getTeamSchedule(D.teamIdx)
    if (teamMatches[matchIndex]) return teamMatches[matchIndex].opIdx
    // fallback
    var available = []
    for (var i = 0; i < TEAMS.length; i++) { if (i !== D.teamIdx) available.push(i) }
    return available[matchIndex % available.length]
  } else {
    // 淘汰赛：从存储中读取，没有则返回-1（未揭晓）
    var koOpponents = wx.getStorageSync('koOpponents') || {}
    if (koOpponents[matchIndex] !== undefined) return koOpponents[matchIndex]
    return -1
  }
}

// 揭晓淘汰赛对手（随机）
function revealKOOpponent(matchIndex) {
  var s = LEAGUE_SCHEDULE[matchIndex]
  if (s && s.leg === 2) matchIndex = matchIndex - 1 // 第二回合用同一个对手

  var koOpponents = wx.getStorageSync('koOpponents') || {}
  if (koOpponents[matchIndex] !== undefined) return koOpponents[matchIndex]

  var available = []
  for (var i = 0; i < TEAMS.length; i++) { if (i !== D.teamIdx) available.push(i) }
  // 避免和已用过的淘汰赛对手重复
  var used = []
  for (var k in koOpponents) { used.push(koOpponents[k]) }
  var pool = available.filter(function(idx) { return used.indexOf(idx) < 0 })
  if (pool.length === 0) pool = available

  var pick = pool[Math.floor(Math.random() * pool.length)]
  koOpponents[matchIndex] = pick
  wx.setStorageSync('koOpponents', koOpponents)
  return pick
}

// ==================== 世界杯地图 ====================
// 为每场比赛生成固定对手（基于种子，保证同一存档对手不变）
function getWCOpponent(matchIndex) {
  // 从世界杯队伍中排除自己，选对手
  var available = []
  for (var i = 0; i < WC_TEAMS.length; i++) { if (i !== D.wcTeamIdx) available.push(i) }
  var seed = (D.wcTeamIdx + 1) * 7 + matchIndex * 13
  return WC_TEAMS[available[seed % available.length]]
}

function drawWCMap() {
  var t = Date.now() / 1000
  render.drawMenuBG(ctx, W, H, t)
  var cx = W / 2, st = safeTop + 6

  // 标题
  render.drawStrokeText(ctx, '🌍 2026世界杯', cx, st + 22, 'bold ' + (W * 0.048) + 'px sans-serif', '#fff', 'rgba(0,40,100,0.5)', 3)
  render.drawText(ctx, '美国 · 加拿大 · 墨西哥', cx, st + 44, (W * 0.024) + 'px sans-serif', 'rgba(255,255,255,0.3)')
  render.drawText(ctx, '← 返回', W * 0.12, st + 22, (W * 0.03) + 'px sans-serif', 'rgba(255,255,255,0.4)', 'center')

  // 你的世界杯战队
  var wcT = D.wcTeamIdx >= 0 ? WC_TEAMS[D.wcTeamIdx] : null
  if (wcT) {
    render.drawText(ctx, wcT.emoji + ' ' + wcT.city + ' · ' + wcT.buff, cx, st + 62, 'bold ' + (W * 0.03) + 'px sans-serif', wcT.color)
  } else {
    render.drawText(ctx, '请先选择世界杯战队', cx, st + 62, (W * 0.03) + 'px sans-serif', 'rgba(255,255,255,0.4)')
  }

  // 解锁条件
  if (D.leagueWins.length < 6) {
    render.drawText(ctx, '🔒 完成苏超联赛小组赛后解锁', cx, H * 0.4, (W * 0.033) + 'px sans-serif', 'rgba(255,255,255,0.4)')
    render.drawText(ctx, '联赛进度：' + D.leagueWins.length + '/6', cx, H * 0.46, (W * 0.028) + 'px sans-serif', 'rgba(255,255,255,0.45)')
    return
  }

  var progress = D.wcWins.length
  var nodeY = st + 82
  var nodeH = 64

  for (var i = 0; i < WC_SCHEDULE.length; i++) {
    var s = WC_SCHEDULE[i]
    var ny = nodeY + i * nodeH
    var played = i < progress, current = i === progress, locked = i > progress
    var opTeam = getWCOpponent(i)

    // 连接线
    if (i > 0) {
      ctx.strokeStyle = played ? '#1E88E5' : 'rgba(255,255,255,0.06)'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(cx, ny - nodeH + nodeH - 6); ctx.lineTo(cx, ny + 4); ctx.stroke()
    }

    // 阶段分隔标签（小组赛/淘汰赛/决赛）
    if (i === 0 || WC_SCHEDULE[i].stage !== WC_SCHEDULE[i - 1].stage) {
      var stageColors = { '小组赛':'#43A047', '淘汰赛':'#1E88E5', '决赛':'#FFD700' }
      var sc = stageColors[s.stage] || '#888'
      render.drawText(ctx, '— ' + s.stage + ' —', cx, ny - 2, (W * 0.022) + 'px sans-serif', sc)
      ny += 10
    }

    // 节点背景
    var cardColor = current ? 'rgba(30,136,229,0.12)' : 'rgba(255,255,255,0.02)'
    ctx.fillStyle = cardColor
    render.roundRect(ctx, W * 0.06, ny, W * 0.88, nodeH - 12, 8); ctx.fill()
    if (current) {
      ctx.strokeStyle = '#1E88E5'; ctx.lineWidth = 1
      render.roundRect(ctx, W * 0.06, ny, W * 0.88, nodeH - 12, 8); ctx.stroke()
    }

    // 左侧状态
    var icon = played ? '✅' : current ? '⚽' : '🔒'
    render.drawText(ctx, icon, W * 0.12, ny + (nodeH - 12) / 2, (W * 0.04) + 'px sans-serif', '#fff')

    // 赛事信息
    var infoX = cx + W * 0.02
    render.drawText(ctx, s.round, infoX, ny + 14, (W * 0.026) + 'px sans-serif',
      locked ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.55)', 'center')

    // 对手
    var opColor = locked ? 'rgba(255,255,255,0.12)' : opTeam.color === '#000000' ? '#666' : opTeam.color
    var myFlag = (D.wcTeamIdx >= 0 ? WC_TEAMS[D.wcTeamIdx].emoji : '❓')
    render.drawText(ctx, myFlag + ' vs ' + opTeam.emoji + ' ' + opTeam.city, infoX, ny + 36, 'bold ' + (W * 0.028) + 'px sans-serif', opColor, 'center')

    // 日期
    render.drawText(ctx, s.date, W * 0.88, ny + 14, (W * 0.022) + 'px sans-serif', 'rgba(255,255,255,0.4)', 'right')

    // 已完成比分
    if (played) {
      var result = D.wcWins[i]
      var rText = result.myGoals + ':' + result.opGoals
      var rColor = result.myGoals > result.opGoals ? '#4CAF50' : result.myGoals < result.opGoals ? '#ff6b6b' : '#ffd700'
      render.drawText(ctx, rText, W * 0.88, ny + 36, 'bold ' + (W * 0.035) + 'px sans-serif', rColor, 'right')
    }
  }

  // 底部按钮
  var btnAreaY = nodeY + WC_SCHEDULE.length * nodeH + 20
  var bw = W * 0.5, bh = W * 0.11

  if (progress < WC_SCHEDULE.length) {
    render.drawButton(ctx, cx - bw / 2, btnAreaY, bw, bh, '⚽ 开始比赛', ['#1565C0', '#1E88E5'])
  } else {
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10
    var champEmoji = D.wcTeamIdx >= 0 ? WC_TEAMS[D.wcTeamIdx].emoji : '🏆'
    render.drawText(ctx, '🏆 世界杯冠军！' + champEmoji, cx, btnAreaY, 'bold ' + (W * 0.04) + 'px sans-serif', '#ffd700')
    ctx.shadowBlur = 0
    render.drawButton(ctx, cx - bw / 2, btnAreaY + 30, bw, bh, '🔄 卫冕之路', ['#1565C0', '#1E88E5'])
  }
}

// ==================== 赛前 ====================
function drawPrematch() {
  var t = Date.now() / 1000
  render.drawMenuBG(ctx, W, H, t)
  var cx = W / 2
  var myT = getMyTeam()

  // VS 画面
  var vsY = H * 0.25
  // 我方
  render.drawPlayer(ctx, cx - W * 0.22, vsY, 28, myT.color, myT.emoji, true)
  render.drawText(ctx, myT.city, cx - W * 0.22, vsY + 46, 'bold ' + (W * 0.035) + 'px sans-serif', myT.color)

  // VS
  var vsScale = 1 + Math.sin(t * 3) * 0.08
  ctx.save(); ctx.translate(cx, vsY); ctx.scale(vsScale, vsScale)
  render.drawStrokeText(ctx, 'VS', 0, 0, 'bold ' + (W * 0.1) + 'px sans-serif', '#ffd700', 'rgba(0,0,0,0.5)', 4)
  ctx.restore()

  // 对方
  render.drawPlayer(ctx, cx + W * 0.22, vsY, 28, opponentTeam.color, opponentTeam.emoji, true)
  render.drawText(ctx, opponentTeam.city, cx + W * 0.22, vsY + 46, 'bold ' + (W * 0.035) + 'px sans-serif', opponentTeam.color)

  // 赛事信息
  var schedule = matchMode === 'league' ? LEAGUE_SCHEDULE : WC_SCHEDULE
  var sched = schedule[matchIdx]
  if (matchMode === 'wc') {
    render.drawText(ctx, '🌍 2026世界杯 · ' + sched.round, cx, H * 0.15, 'bold ' + (W * 0.03) + 'px sans-serif', '#1E88E5')
    render.drawText(ctx, sched.date + ' · 美加墨', cx, H * 0.19, (W * 0.025) + 'px sans-serif', 'rgba(255,255,255,0.35)')
  } else {
    render.drawText(ctx, sched.stage + ' · ' + sched.round, cx, H * 0.16, 'bold ' + (W * 0.032) + 'px sans-serif', 'rgba(255,255,255,0.8)')
    // 两回合第二场显示第一回合比分
    if (sched.leg === 2 && D.leagueWins[matchIdx - 1]) {
      var leg1 = D.leagueWins[matchIdx - 1]
      render.drawText(ctx, '首回合 ' + leg1.myGoals + ':' + leg1.opGoals, cx, H * 0.20, (W * 0.028) + 'px sans-serif', '#ffd700')
    }
  }

  // 说明卡片（统一一张卡片，左右两栏）
  var cardY = H * 0.37, cardH = H * 0.25
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  render.roundRect(ctx, W*0.04, cardY, W*0.92, cardH, 12); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1
  render.roundRect(ctx, W*0.04, cardY, W*0.92, cardH, 12); ctx.stroke()

  // 中间分割线
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(cx, cardY + 10); ctx.lineTo(cx, cardY + cardH - 10); ctx.stroke()

  // 左栏：操作
  var lx = W * 0.27  // 左栏中心
  render.drawText(ctx, '🎮 操作', lx, cardY + 18, 'bold '+(W*0.028)+'px sans-serif', '#fff')
  var ops = [
    { text:'🕹️ 摇杆移动+瞄准', color:'#4CAF50' },
    { text:'⚽ 长按射门蓄力', color:'#E53935' },
    { text:'📨 长按传球蓄力', color:'#1E90FF' },
    { text:'🔄 切换键换人', color:'#1E90FF' },
    { text:'🛡️ 靠近自动抢断', color:'#ffd700' }
  ]
  for (var oi = 0; oi < ops.length; oi++) {
    render.drawText(ctx, ops[oi].text, lx, cardY + 40 + oi * 24, (W*0.024)+'px sans-serif', ops[oi].color)
  }

  // 右栏：控制权
  var rx = W * 0.73  // 右栏中心
  render.drawText(ctx, '🔄 控制权', rx, cardY + 18, 'bold '+(W*0.028)+'px sans-serif', '#fff')
  var ctrls = [
    { text:'切换键换最近队友', color:'#4CAF50' },
    { text:'传球后自动切', color:'#ffd700' },
    { text:'抢断时自动切', color:'#FF9800' },
    { text:'也可点击队友切换', color:'rgba(255,255,255,0.5)' },
    { text:'⏱ 90秒一局', color:'rgba(255,255,255,0.5)' }
  ]
  for (var ci = 0; ci < ctrls.length; ci++) {
    render.drawText(ctx, ctrls[ci].text, rx, cardY + 40 + ci * 24, (W*0.024)+'px sans-serif', ctrls[ci].color)
  }

  // 模式标签
  render.drawText(ctx, '5v5 快速赛', cx, H * 0.68, 'bold ' + (W * 0.03) + 'px sans-serif', 'rgba(255,255,255,0.5)')

  // 开球按钮
  var bw = W * 0.5, bh = W * 0.1
  render.drawButton(ctx, cx - bw / 2, H * 0.76, bw, bh, '⚽ 开球！', ['#2E7D32', '#4CAF50'])
  render.drawText(ctx, '← 返回', cx, H * 0.85, (W * 0.026) + 'px sans-serif', 'rgba(255,255,255,0.4)')
}

// ==================== 比赛核心（11v11）====================
function px(f) { return PL + (PR - PL) * f }

var matchCdNext = 0 // 下一次倒计时跳变的时间戳
function initMatch() {
  myGoals = 0; opGoals = 0; goalEvents = []; goalFlashTime = 0
  goalFreezeUntil = 0
  myAICooldown = 0; opAICooldown = 0
  matchStartTime = Date.now(); matchTime = matchDuration
  matchPaused = false; matchCountdown = 3
  matchCdNext = Date.now() + 800 // 第一次倒计时在800ms后
  particles = []; floats = []
  guideStep = 0
  joystick.active = false; joystick.touchId = -1; joystick.dx = 0; joystick.dy = 0
  shootBtnPressed = false; passBtnPressed = false; switchBtnPressed = false
  initMatchPlayers()
  audio.startBGM()
}

function getFormation() { return matchTeamSize === 5 ? FORMATION_2 : FORMATION }
function gkIdx() { return getFormation().length - 1 } // GK始终是最后一个

function initMatchPlayers() {
  myTeam = []; opTeam = []
  var fm = getFormation()
  for (var i = 0; i < fm.length; i++) {
    var f = fm[i]
    // 开球站位：所有人在自己半场（我方下半场 y>0.5，对方上半场 y<0.5）
    // 将阵型 hy 映射到己方半场：我方 0.5~1.0，对方 0.0~0.5
    var myKickoffY = 0.5 + f.hy * 0.5   // 我方：hy=0→中线，hy=1→底线
    var opKickoffY = 0.5 - f.hy * 0.5   // 对方：hy=0→中线，hy=1→顶线
    myTeam.push({ x: px(f.hx), y: py(myKickoffY), num: f.num, role: f.role, prevX: px(f.hx), prevY: py(myKickoffY) })
    opTeam.push({ x: px(f.hx), y: py(opKickoffY), num: f.num, role: f.role, prevX: px(f.hx), prevY: py(opKickoffY) })
  }
  ctrlIdx = 0
  ball.x = px(0.5); ball.y = py(0.5); ball.vx = 0; ball.vy = 0; ball.spin = 0; ball.side = ''; ball.idx = -1
}

function updateMatch(dt) {
  // 开球倒计时（在帧内处理，不依赖setInterval）
  if (matchCountdown > 0) {
    var now = Date.now()
    if (now >= matchCdNext) {
      matchCountdown--
      audio.playTick()
      matchCdNext = now + 800
      if (matchCountdown <= 0) {
        ball.side = 'my'; ball.idx = 0
      }
    }
    return
  }
  // 进球后冻结
  if (goalFreezeUntil > 0 && Date.now() < goalFreezeUntil) {
    matchTime -= dt; return
  }
  matchTime -= dt
  if (matchTime <= 0) { matchTime = 0; endMatch(); return }

  // 保存上一帧位置（用于朝向和跑动动画）
  for (var pi2 = 0; pi2 < myTeam.length; pi2++) { myTeam[pi2].prevX = myTeam[pi2].x; myTeam[pi2].prevY = myTeam[pi2].y }
  for (var pi3 = 0; pi3 < opTeam.length; pi3++) { opTeam[pi3].prevX = opTeam[pi3].x; opTeam[pi3].prevY = opTeam[pi3].y }

  var spdStat = getStatValue('spd'), atkStat = getStatValue('atk'), defStat = getStatValue('def')
  var dtF = dt / 16 // 帧因子

  // ==== 我方控制球员移动（虚拟摇杆） ====
  var cp = myTeam[ctrlIdx]
  var isDribbling = ball.side === 'my' && ball.idx === ctrlIdx
  if (joystick.active) {
    var jdx = joystick.dx, jdy = joystick.dy
    var jdist = Math.sqrt(jdx * jdx + jdy * jdy)
    if (jdist > 3) {
      // 摇杆偏移量映射到速度（偏移越大速度越快）
      var pct = Math.min(jdist / JOY_RADIUS, 1.0)
      var baseSpeed = isDribbling ? (1.07 + spdStat * 0.205) : (1.3 + spdStat * 0.25)
      var speed = baseSpeed * (0.4 + pct * 1.2) * dtF
      var mvx = (jdx / jdist) * speed
      var mvy = (jdy / jdist) * speed
      // 碰撞避让：遇到其他球员时绕开
      var allPlayers = []
      for (var ci = 0; ci < myTeam.length; ci++) { if (ci !== ctrlIdx) allPlayers.push(myTeam[ci]) }
      for (var ci2 = 0; ci2 < opTeam.length; ci2++) { allPlayers.push(opTeam[ci2]) }
      for (var ci3 = 0; ci3 < allPlayers.length; ci3++) {
        var ob = allPlayers[ci3]
        var newX = cp.x + mvx, newY = cp.y + mvy
        var odx = newX - ob.x, ody = newY - ob.y
        var od = Math.sqrt(odx * odx + ody * ody)
        if (od < PLAYER_R * 2.2 && od > 0.1) {
          var pushStr = (PLAYER_R * 2.2 - od) / (PLAYER_R * 2.2)
          mvx += (odx / od) * pushStr * speed * 0.6
          mvy += (ody / od) * pushStr * speed * 0.6
        }
      }
      cp.x += mvx
      cp.y += mvy
    }
  }
  cp.x = clamp(cp.x, PL + PLAYER_R, PR - PLAYER_R)
  cp.y = clamp(cp.y, py(0.03), py(0.97))

  // ==== 我方AI队友 ====
  updateTeamAI(myTeam, opTeam, 'my', dt, spdStat, defStat)
  // ==== 对方全队AI ====
  updateTeamAI(opTeam, myTeam, 'op', dt, 1 + matchDiff, 1 + matchDiff * 0.5)

  // ==== 球逻辑 ====
  if (ball.side === 'freeze') return // 进球庆祝中
  if (ball.side === 'my' || ball.side === 'op') {
    // 带球：球紧跟持球者，微小偏移模拟带球
    var carrier = ball.side === 'my' ? myTeam[ball.idx] : opTeam[ball.idx]
    var dribDir = ball.side === 'my' ? -1 : 1
    var targetBX = carrier.x
    var targetBY = carrier.y + dribDir * (PLAYER_R + 3)
    // 快速跟随，不要滞后太多
    ball.x += (targetBX - ball.x) * 0.5
    ball.y += (targetBY - ball.y) * 0.5
    ball.vx = (targetBX - ball.x) * 2
    ball.vy = (targetBY - ball.y) * 2
  } else if (ball.side === 'fly') {
    // 弧线效果：spin作为横向加速度弯曲轨迹
    if (ball.spin) {
      ball.vx += ball.spin * dtF
      ball.spin *= 0.97 // spin逐渐衰减
    }
    ball.x += ball.vx * dtF; ball.y += ball.vy * dtF
    // 传球到达目标
    if (ball.flyTarget >= 0) {
      var tgt = ball.flySide === 'my' ? myTeam[ball.flyTarget] : opTeam[ball.flyTarget]
      if (dist2(ball, tgt) < PLAYER_R * 3) {
        ball.side = ball.flySide; ball.idx = ball.flyTarget; ball.flyTarget = -1
        // 只有玩家主动传球（传球发起人是ctrlIdx）才切换到接球人
        if (ball.side === 'my' && ball.flyFrom === ctrlIdx) setCtrl(ball.idx)
        return
      }
      // 途中被拦截
      var interceptTeam = ball.flySide === 'my' ? opTeam : myTeam
      var interceptSide = ball.flySide === 'my' ? 'op' : 'my'
      for (var ii = 0; ii < interceptTeam.length; ii++) {
        if (dist2(ball, interceptTeam[ii]) < PLAYER_R * 2) {
          ball.side = interceptSide; ball.idx = ii; ball.flyTarget = -1
          floats.push({ x: ball.x, y: ball.y - 20, text:'拦截!', color: interceptSide === 'my' ? '#4CAF50' : '#ff6b6b', born: Date.now() })
          audio.playKick(1); return
        }
      }
    } else {
      // 无目标的飞行球（如GK大脚）：到达中场区域后变散球
      var inMidfield = ball.y > py(0.3) && ball.y < py(0.7)
      if (inMidfield) {
        ball.side = ''; ball.idx = -1
        ball.vx *= 0.3; ball.vy *= 0.3 // 大幅减速变散球
        return
      }
    }
    // 射门检测 — 球过了GK的Y坐标就判定
    var goalW = (PR - PL) * 0.30, goalCX = W / 2
    var opGKY = opTeam[gkIdx()].y  // 对方GK的Y
    var myGKY = myTeam[gkIdx()].y  // 我方GK的Y

    // 对方球门（球场顶部）：球飞过对方GK
    if (ball.y < opGKY - PLAYER_R) {
      if (Math.abs(ball.x - goalCX) < goalW / 2) {
        var gk = opTeam[gkIdx()]
        var opSaveR = PLAYER_R * (1.2 + matchDiff * 0.4) // 难度越高对方GK越强
        if (Math.abs(ball.x - gk.x) > opSaveR) scoreGoal('my')
        else ballSaved('op')
      } else ballMissed()
      return
    }
    // 我方球门（球场底部）：球飞过我方GK
    if (ball.y > myGKY + PLAYER_R) {
      if (Math.abs(ball.x - goalCX) < goalW / 2) {
        var gk = myTeam[gkIdx()]
        var mySaveR = PLAYER_R * (1.5 + defStat * 0.2) // 防守属性提升扑救范围
        if (Math.abs(ball.x - gk.x) > mySaveR) scoreGoal('op')
        else ballSaved('my')
      } else ballMissed()
      return
    }
    // 球飞出左右边界
    if (ball.x < PL - 20 || ball.x > PR + 20) { ballMissed(); return }
    // 射门飞行超时（但速度检测阈值降低，避免误判）
    if (ball.vx * ball.vx + ball.vy * ball.vy < 0.1) { ballMissed(); return }
    var flyDecay = Math.pow(0.995, dtF); ball.vx *= flyDecay; ball.vy *= flyDecay
  } else {
    // 散球减速
    ball.x += ball.vx * dtF * 0.9; ball.y += ball.vy * dtF * 0.9
    var looseDecay = Math.pow(0.94, dtF); ball.vx *= looseDecay; ball.vy *= looseDecay
    ball.x = clamp(ball.x, PL + 3, PR - 3)
    ball.y = clamp(ball.y, py(0.02), py(0.98))
    // 谁近谁拿（GK优先级最低，避免GK出击抢球）
    var bestD = 999, bestSide = '', bestIdx = -1
    var gki = gkIdx()
    for (var mi = 0; mi < myTeam.length; mi++) {
      var md = dist2(ball, myTeam[mi])
      if (mi === gki) md += PLAYER_R * 8 // GK加大距离惩罚
      if (md < bestD) { bestD = md; bestSide = 'my'; bestIdx = mi }
    }
    for (var oi = 0; oi < opTeam.length; oi++) {
      var od = dist2(ball, opTeam[oi])
      if (oi === gki) od += PLAYER_R * 8
      if (od < bestD) { bestD = od; bestSide = 'op'; bestIdx = oi }
    }
    if (bestD < PLAYER_R * 1.8) {
      // 防止同队球员反复抢球：同队拿球需要冷却
      var sameSide = (ball.lastSide === bestSide)
      var cooldownOk = !ball.pickupTime || (Date.now() - ball.pickupTime > 500)
      if (!sameSide || cooldownOk) {
        ball.side = bestSide; ball.idx = bestIdx
        ball.lastSide = bestSide; ball.pickupTime = Date.now()
        // 不自动切换控制权，玩家手动点击切换
      }
    }
  }

  // ==== 抢断判定（GK持球不可被抢断）====
  if (ball.side === 'my' || ball.side === 'op') {
    // 守门员持球时跳过抢断（GK在禁区内受保护）
    if (ball.idx !== gkIdx()) {
    var carrier = ball.side === 'my' ? myTeam[ball.idx] : opTeam[ball.idx]
    var defenders = ball.side === 'my' ? opTeam : myTeam
    var defSideStr = ball.side === 'my' ? 'op' : 'my'
    for (var di = 0; di < gkIdx(); di++) {
      // 玩家操控的球员抢断范围更大
      var isPlayerCtrl = defSideStr === 'my' && di === ctrlIdx
      var tackleRange = isPlayerCtrl ? PLAYER_R * 3.5 : PLAYER_R * 2.5
      if (dist2(carrier, defenders[di]) < tackleRange) {
        // 玩家操控抢断概率更高，AI抢玩家概率降低
        var prob
        if (ball.side === 'my') {
          // 对方AI抢我方
          prob = 0.025 + matchDiff * 0.03
        } else if (isPlayerCtrl) {
          // 玩家主动抢断，概率大幅提高
          prob = 0.15 + (1 - matchDiff) * 0.06
        } else {
          // 我方AI队友抢断
          prob = 0.06 + (1 - matchDiff) * 0.04
        }
        if (Math.random() < prob) {
          ball.side = defSideStr; ball.idx = di
          // 我方抢断成功：只有玩家操控的球员抢到才切换，AI队友抢到不抢控制权
          if (defSideStr === 'my' && isPlayerCtrl) setCtrl(di)
          var txt = defSideStr === 'my' ? '抢断!' : '被抢断!'
          var clr = defSideStr === 'my' ? '#ffd700' : '#ff6b6b'
          floats.push({ x: carrier.x, y: carrier.y - 20, text: txt, color: clr, born: Date.now() })
          audio.playKick(1)
          break
        }
      }
    }
    } // end if not GK
  }

  // ==== AI持球决策（我方队友或对方）====
  // GK拿到球 → 立刻大脚开出去而不是带球
  if ((ball.side === 'my' || ball.side === 'op') && ball.idx === gkIdx()) {
    gkClearBall(ball.side === 'my' ? myTeam : opTeam, ball.side)
  } else {
    if (ball.side === 'my' && ball.idx !== ctrlIdx) aiDecision(myTeam, opTeam, 'my', ball.idx, dt)
    if (ball.side === 'op') aiDecision(opTeam, myTeam, 'op', ball.idx, dt)
  }

  // ==== 粒子/飘字更新 ====
  var now = Date.now()
  for (var pi = particles.length - 1; pi >= 0; pi--) {
    var p = particles[pi]; if ((now - p.born) > 600) { particles.splice(pi, 1); continue }
    p.x += p.vx; p.y += p.vy; p.vy += 0.1
  }
  for (var fi = floats.length - 1; fi >= 0; fi--) {
    if ((now - floats[fi].born) > 1500) floats.splice(fi, 1)
  }
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }
function dist2(a, b) { return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)) }

// ==== 球队AI移动（真实足球跑位）====
function updateTeamAI(team, enemy, side, dt, spdMod, defMod) {
  var dtF = dt / 16
  var hasBall = ball.side === side
  var ballCarrierIdx = hasBall ? ball.idx : -1
  var t = Date.now() / 1000
  var atkDir = side === 'my' ? -1 : 1 // 进攻方向（我方向上-1，对方向下+1）

  // ---- 第一步：计算防线高度（后卫协调）----
  var fm = getFormation()
  var defLineY = 0, defCount = 0
  for (var di = 0; di < fm.length; di++) {
    var df = fm[di]
    if (df.role === 'CB' || df.role === 'LB' || df.role === 'RB') {
      var defHome = side === 'my' ? py(df.hy) : py(1 - df.hy)
      defLineY += defHome; defCount++
    }
  }
  if (defCount === 0) defLineY = side === 'my' ? py(0.75) : py(0.25)
  else defLineY = defLineY / defCount
  // 防线整体根据球位置前压或后缩
  var ballPressure = (ball.y - py(0.5)) / PH // -0.5到+0.5
  var lineShift = ballPressure * PH * 0.15 * (side === 'my' ? 1 : -1)
  defLineY += lineShift
  if (hasBall) defLineY += atkDir * PH * -0.06 // 有球时防线前压

  for (var i = 0; i < team.length; i++) {
    if (side === 'my' && i === ctrlIdx) continue
    if (i === ballCarrierIdx) continue

    var p = team[i], f = fm[i]
    var homeX, homeY
    if (side === 'my') { homeX = px(f.hx); homeY = py(f.hy) }
    else { homeX = px(f.hx); homeY = py(1 - f.hy) }

    var targetX = homeX, targetY = homeY
    var isSprintng = false // 冲刺标记

    // ---- 各位置独立行为 ----
    if (f.role === 'GK') {
      // 守门员：锁定在门线上，只做横向移动
      targetY = homeY  // 始终站在门线位置，不出击
      var threat = side === 'my' ? (ball.y > py(0.55)) : (ball.y < py(0.45))
      if (ball.side === 'fly') {
        var toGoal = side === 'my' ? ball.vy > 0 : ball.vy < 0
        if (toGoal) {
          // 射门时全力扑球
          targetX = ball.x
          isSprintng = true
        } else {
          targetX = homeX + (ball.x - homeX) * 0.3
        }
      } else if (threat) {
        // 球在己方半场时跟踪球的横向
        targetX = homeX + (ball.x - homeX) * 0.45
      } else {
        // 球在对方半场时缓慢回中
        targetX = homeX + (ball.x - homeX) * 0.1
      }
      // 限制GK横向范围（不超出球门宽度）
      var goalHalfW = (PR - PL) * 0.18
      targetX = clamp(targetX, px(0.5) - goalHalfW, px(0.5) + goalHalfW)

      // GK不参与排斥力计算，直接移动后跳过后续逻辑
      var gkDx = targetX - p.x
      var gkSpd = (isSprintng ? 2.8 : 1.2) * (1 + spdMod * 0.3) * dtF
      if (Math.abs(gkDx) > 1) p.x += (gkDx > 0 ? 1 : -1) * Math.min(gkSpd, Math.abs(gkDx))
      p.y = homeY  // 强制锁定Y
      continue     // 跳过后续排斥力和通用移动逻辑

    } else if (f.role === 'ST') {
      if (hasBall) {
        // 有球：做反跑拉开空间 — 先横移再前插
        var runPhase = (t * 0.8 + i) % 4
        if (runPhase < 1.5) {
          targetX = homeX + (runPhase < 0.75 ? 1 : -1) * (PR - PL) * 0.2
          targetY = homeY
        } else {
          targetX = homeX + Math.sin(t * 0.5 + i) * (PR - PL) * 0.1
          targetY = homeY + atkDir * PH * -0.18
          isSprintng = true
        }
      } else {
        // 没球：追对方持球者抢球
        var oppBallSide = side === 'my' ? 'op' : 'my'
        if (ball.side === oppBallSide && ball.idx >= 0) {
          var ballCarrier = side === 'my' ? opTeam[ball.idx] : myTeam[ball.idx]
          targetX = ballCarrier.x
          targetY = ballCarrier.y
          isSprintng = true
        } else if (ball.side === '' || ball.side === 'fly') {
          // 散球/飞行中：只有最近的队员追球，其他人跑位
          var myDistToBall = dist2(p, ball)
          var closerTeammate = false
          for (var ci = 0; ci < team.length; ci++) {
            if (ci === i || ci === gkIdx()) continue
            if (dist2(team[ci], ball) < myDistToBall - PLAYER_R * 2) { closerTeammate = true; break }
          }
          if (!closerTeammate) {
            targetX = ball.x; targetY = ball.y; isSprintng = true
          } else {
            // 跑位等待
            targetY = py(0.5) + atkDir * PH * -0.1
          }
        } else {
          targetY = py(0.5)
        }
      }

    } else if (f.role === 'LW' || f.role === 'RW') {
      var isLeft = f.role === 'LW'
      var wingBase = isLeft ? PL + (PR-PL) * 0.06 : PR - (PR-PL) * 0.06
      if (hasBall) {
        // 边锋：沿边线直线冲刺 + 内切跑
        var runPhase = (t * 0.6 + i * 1.7) % 5
        if (runPhase < 2.5) {
          // 贴边前插
          targetX = wingBase
          targetY = homeY + atkDir * PH * -(0.05 + runPhase * 0.05)
          isSprintng = runPhase > 1
        } else {
          // 内切到中路
          targetX = px(isLeft ? 0.35 : 0.65)
          targetY = homeY + atkDir * PH * -0.1
        }
      } else {
        targetX = wingBase
        targetY = homeY + atkDir * PH * 0.05
      }

    } else if (f.role === 'CM') {
      // 中场：保持三角传球结构，跟随球移动
      var pullStr = hasBall ? 0.3 : 0.2
      targetX = homeX + (ball.x - px(0.5)) * pullStr
      targetY = homeY + (ball.y - py(0.5)) * pullStr * 0.4
      if (hasBall) targetY += atkDir * PH * -0.05
      // 避免两个CM重叠：彼此排斥
      var otherCM = i === 3 ? 4 : 3
      if (otherCM < team.length) {
        var cmDist = dist2(p, team[otherCM])
        if (cmDist < (PR-PL) * 0.15) {
          targetX += (p.x - team[otherCM].x) * 0.1
        }
      }

    } else if (f.role === 'CDM') {
      // 后腰：球盾位置，在球和球门之间
      var shieldX = (ball.x + px(0.5)) * 0.5
      var shieldY = (ball.y + homeY) * 0.5
      targetX = shieldX
      targetY = clamp(shieldY, homeY + atkDir * PH * -0.08, homeY + atkDir * PH * 0.08)
      if (!hasBall) {
        // 防守时贴近对方持球人
        var oppSide = side === 'my' ? 'op' : 'my'
        if (ball.side === oppSide && ball.idx >= 0) {
          var bc = side === 'my' ? enemy[ball.idx] : enemy[ball.idx]
          targetX = homeX + (bc.x - homeX) * 0.35
          targetY = homeY + (bc.y - homeY) * 0.25
        }
      }

    } else if (f.role === 'CB') {
      // 中后卫：跟随防线高度，盯人
      targetY = defLineY + (f.hy > 0.5 ? 0 : 0) // 保持在防线上
      targetX = homeX + (ball.x - px(0.5)) * 0.12
      if (!hasBall) {
        // 盯最近的对方前锋
        var markTarget = null, markDist = PH * 0.4
        for (var mi = 0; mi < Math.min(3, enemy.length); mi++) {
          var md = dist2(p, enemy[mi])
          if (md < markDist) { markDist = md; markTarget = enemy[mi] }
        }
        if (markTarget) {
          targetX += (markTarget.x - targetX) * 0.3
          targetY += (markTarget.y - targetY) * 0.2
        }
      }

    } else if (f.role === 'LB' || f.role === 'RB') {
      // 边后卫：跟随防线高度，进攻时套边
      targetY = defLineY
      if (hasBall) {
        // 套边跑位：有节奏地前插
        var overlapPhase = (t * 0.5 + i * 2.1) % 6
        if (overlapPhase > 3.5 && overlapPhase < 5.5) {
          var wingEdge = f.role === 'LB' ? PL + (PR-PL) * 0.05 : PR - (PR-PL) * 0.05
          targetX = wingEdge
          targetY = defLineY + atkDir * PH * -0.2
          isSprintng = true
        }
      } else {
        // 防守：盯边路对手
        var edgeThresh = f.role === 'LB' ? 0.35 : 0.65
        for (var ei = 0; ei < gkIdx(); ei++) {
          var eFrac = (enemy[ei].x - PL) / (PR - PL)
          var isMyWing = (f.role === 'LB' && eFrac < edgeThresh) || (f.role === 'RB' && eFrac > edgeThresh)
          if (isMyWing && dist2(p, enemy[ei]) < PH * 0.35) {
            targetX += (enemy[ei].x - targetX) * 0.25
            targetY += (enemy[ei].y - targetY) * 0.15
            break
          }
        }
      }
    }

    // ---- 第二步：球员排斥（防止扎堆，含对手排斥）----
    var minSep = PLAYER_R * 7 // 同队最小间距（加大防止扎堆）
    var minSepEnemy = PLAYER_R * 2.5 // 对手最小间距
    // 同队排斥
    for (var ri = 0; ri < team.length; ri++) {
      if (ri === i) continue
      var rd = dist2(p, team[ri])
      if (rd < minSep && rd > 0.5) {
        var pushStr = (minSep - rd) / minSep * 3.0
        targetX += (p.x - team[ri].x) / rd * pushStr
        targetY += (p.y - team[ri].y) / rd * pushStr
      }
    }
    // 对手排斥（避免完全重叠）
    for (var ei = 0; ei < enemy.length; ei++) {
      var ed = dist2(p, enemy[ei])
      if (ed < minSepEnemy && ed > 0.5) {
        var pushE = (minSepEnemy - ed) / minSepEnemy * 2.5
        targetX += (p.x - enemy[ei].x) / ed * pushE
        targetY += (p.y - enemy[ei].y) / ed * pushE
      }
    }
    // 玩家操控球员排斥（避免AI撞上玩家控制的球员）
    if (side === 'my') {
      var cpd = dist2(p, myTeam[ctrlIdx])
      if (cpd < minSep && cpd > 0.5) {
        var cpPush = (minSep - cpd) / minSep * 3.0
        targetX += (p.x - myTeam[ctrlIdx].x) / cpd * cpPush
        targetY += (p.y - myTeam[ctrlIdx].y) / cpd * cpPush
      }
    }

    // ---- 第三步：移动（区分慢跑/冲刺）----
    targetX = clamp(targetX, PL + PLAYER_R, PR - PLAYER_R)
    targetY = clamp(targetY, py(0.02), py(0.98))

    var dx = targetX - p.x, dy = targetY - p.y
    var dist = Math.sqrt(dx * dx + dy * dy)
    // 慢跑1.2，冲刺2.5，距离远时加速
    var baseSpd = isSprintng ? 1.6 : 0.8
    var personalSpeed = (baseSpd + spdMod * 0.22) * dtF
    if (dist > PLAYER_R * 8) personalSpeed *= 1.25
    if (dist > 2) {
      p.x += (dx / dist) * Math.min(personalSpeed, dist)
      p.y += (dy / dist) * Math.min(personalSpeed, dist)
    }
  }
}

// ==== AI持球决策（传球/射门/带球）====
// 每方独立冷却
var myAICooldown = 0, opAICooldown = 0
function aiDecision(team, enemy, side, idx, dt) {
  var p = team[idx], f = getFormation()[idx]
  var dtF = dt / 16

  // 带球推进（始终执行，不受冷却影响）
  var advDir = side === 'my' ? -1 : 1
  var advSpeed = (0.85 + (side === 'op' ? matchDiff * 0.6 : 0.4)) * dtF

  // 向球门方向推进，靠近边线时往中路靠
  var centerPull = (px(0.5) - p.x) * 0.008 * dtF
  p.x += Math.sin(Date.now() / 500 + idx * 3.7) * 0.5 * dtF + centerPull
  p.y += advDir * advSpeed

  // 被对手堵住时尝试横向绕开
  for (var bi = 0; bi < enemy.length; bi++) {
    var bd = dist2(p, enemy[bi])
    if (bd < PLAYER_R * 3.5 && bd > 0.5) {
      p.x += (p.x - enemy[bi].x) / bd * 1.5 * dtF
      // 减少前进速度避免硬冲
      p.y -= advDir * advSpeed * 0.4
    }
  }

  // 限制带球不能冲过对方GK区域
  var maxAdvance = side === 'my' ? py(0.12) : py(0.88)
  p.x = clamp(p.x, PL + PLAYER_R * 2, PR - PLAYER_R * 2)
  p.y = side === 'my' ? clamp(p.y, maxAdvance, py(0.95)) : clamp(p.y, py(0.05), maxAdvance)

  // 射门/传球冷却（只影响射门和传球决策，不影响带球推进）
  if (side === 'my') { if (myAICooldown > 0) { myAICooldown -= dt; return } }
  else { if (opAICooldown > 0) { opAICooldown -= dt; return } }

  // 射门判定
  var inShootZone = side === 'my' ? (p.y < py(0.35)) : (p.y > py(0.65))
  var nearGoal = side === 'my' ? (p.y < py(0.22)) : (p.y > py(0.78))
  var veryNearGoal = side === 'my' ? (p.y < py(0.15)) : (p.y > py(0.85))
  if (veryNearGoal) {
    // 非常接近球门 → 立刻射门，不再犹豫
    doShoot(team, side, idx)
    if (side === 'my') myAICooldown = 1000; else opAICooldown = 1000
    return
  } else if (inShootZone) {
    var shootProb = nearGoal ? 0.08 : 0.03
    if (side === 'op') shootProb *= (0.8 + matchDiff * 0.5)
    if (Math.random() < shootProb) {
      doShoot(team, side, idx)
      if (side === 'my') myAICooldown = 1200; else opAICooldown = 1200
      return
    }
  }

  // 传球判定：概率更高，让比赛有更多传球配合
  var passProb = 0.06 + (side === 'op' ? matchDiff * 0.02 : 0.03)
  if (Math.random() < passProb) {
    var bestTarget = -1, bestScore = -999
    for (var ti = 0; ti < gkIdx(); ti++) {
      if (ti === idx) continue
      var tm = team[ti]
      var ahead = side === 'my' ? (p.y - tm.y) : (tm.y - p.y)
      var lateral = Math.abs(tm.x - p.x)
      var sc = ahead * 0.5 + lateral * 0.3 + Math.random() * 25
      var blocked = false
      for (var ei = 0; ei < gkIdx(); ei++) {
        if (isOnPath(p, tm, enemy[ei], PLAYER_R * 2.5)) { blocked = true; break }
      }
      if (!blocked && sc > bestScore) { bestScore = sc; bestTarget = ti }
    }
    if (bestTarget >= 0) {
      doPass(team, side, idx, bestTarget)
      if (side === 'my') myAICooldown = 600; else opAICooldown = 600
      return
    }
  }
}

function isOnPath(from, to, point, threshold) {
  var dx = to.x - from.x, dy = to.y - from.y
  var len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1) return false
  var t = ((point.x - from.x) * dx + (point.y - from.y) * dy) / (len * len)
  if (t < 0.1 || t > 0.9) return false
  var px2 = from.x + t * dx, py2 = from.y + t * dy
  return dist2(point, { x: px2, y: py2 }) < threshold
}

// GK拿到球后立刻大脚开出
function gkClearBall(team, side) {
  lastKickSide = side
  var gk = team[gkIdx()]
  var atkDir = side === 'my' ? -1 : 1
  // 大脚踢向中场偏前方，带随机横向偏移
  var targetX = px(0.5) + (Math.random() - 0.5) * W * 0.3
  var targetY = py(0.5) + atkDir * py(0.15) // 踢到中场偏己方进攻方向
  var dx = targetX - gk.x, dy = targetY - gk.y
  var dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 1) { dy = atkDir * 100; dist = 100 }
  var clearSpeed = 8.5
  ball.vx = (dx / dist) * clearSpeed
  ball.vy = (dy / dist) * clearSpeed
  ball.x = gk.x; ball.y = gk.y + atkDir * PLAYER_R
  // 不设flyTarget，球飞到中场自然变散球，避免门前被拦截
  ball.spin = 0
  ball.side = 'fly'; ball.idx = -1; ball.flyTarget = -1; ball.flySide = ''
  audio.playKick(3)
}

function doPass(team, side, fromIdx, toIdx, power) {
  lastKickSide = side
  var from = team[fromIdx], to = team[toIdx]
  var dx = to.x - from.x, dy = to.y - from.y
  var dist = Math.sqrt(dx * dx + dy * dy)
  var passSpeed = (power || 1.0) * 4.8 // 力度 × 基础速度（传球约为球员速度2.5倍）
  ball.vx = (dx / dist) * passSpeed; ball.vy = (dy / dist) * passSpeed
  ball.spin = (Math.random() - 0.5) * 0.06 // AI传球带轻微弧线
  ball.x = from.x; ball.y = from.y
  ball.side = 'fly'; ball.idx = -1; ball.flyTarget = toIdx; ball.flySide = side; ball.flyFrom = fromIdx
  audio.playKick(2)
}

function doShoot(team, side, idx) {
  lastKickSide = side
  var p = team[idx]
  // 难度越高射门越准
  var spread = side === 'op' ? W * (0.35 - matchDiff * 0.1) : W * 0.3
  var targetX = W / 2 + (Math.random() - 0.5) * spread
  var targetY = side === 'my' ? py(0.0) : py(1.0)
  var dx = targetX - p.x, dy = targetY - p.y
  var dist = Math.sqrt(dx * dx + dy * dy)
  var shootSpeed = 6.5 + (side === 'op' ? matchDiff * 1.2 : getStatValue('atk') * 0.5)
  ball.vx = (dx / dist) * shootSpeed; ball.vy = (dy / dist) * shootSpeed
  ball.spin = (Math.random() - 0.5) * 0.08 // AI射门带轻微弧线
  ball.x = p.x; ball.y = p.y
  ball.side = 'fly'; ball.idx = -1; ball.flyTarget = -1; ball.flySide = ''
  audio.playKick(4)
  for (var i = 0; i < 4; i++) {
    particles.push({ x: p.x, y: p.y, vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3, color:'#ffd700', born: Date.now(), size: 2+Math.random()*2 })
  }
}

function myShoot(svx, svy, power) {
  var p = myTeam[ctrlIdx]
  if (ball.side !== 'my' || ball.idx !== ctrlIdx) return
  lastKickSide = 'my'
  var atkStat = getStatValue('atk')
  var pw = power || 1.0
  var shootSpeed = (6.5 + atkStat * 0.6) * pw // 力度影响球速
  var dist = Math.sqrt(svx * svx + svy * svy)
  if (dist < 0.1) return
  // 弧线：滑动的水平分量越大弧度越大
  var spinAmount = (svx / dist) * 0.12 * pw
  ball.vx = (svx / dist) * shootSpeed; ball.vy = (svy / dist) * shootSpeed
  ball.spin = spinAmount
  ball.x = p.x; ball.y = p.y - PLAYER_R - 3
  ball.side = 'fly'; ball.idx = -1; ball.flyTarget = -1; ball.flySide = ''
  audio.playKick(4)
  for (var i = 0; i < 5; i++) {
    particles.push({ x: ball.x, y: ball.y, vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3, color:'#ffd700', born: Date.now(), size: 2+Math.random()*2 })
  }
}

function myPass(svx, svy, power) {
  var p = myTeam[ctrlIdx]
  if (ball.side !== 'my' || ball.idx !== ctrlIdx) return
  lastKickSide = 'my'
  var pw = power || 1.0
  // 找滑动方向上最近的队友
  var bestIdx = -1, bestAngleDiff = 999
  var swipeAngle = Math.atan2(svy, svx)
  for (var ti = 0; ti < gkIdx(); ti++) {
    if (ti === ctrlIdx) continue
    var t = myTeam[ti]
    var a = Math.atan2(t.y - p.y, t.x - p.x)
    var diff = Math.abs(a - swipeAngle)
    if (diff > Math.PI) diff = Math.PI * 2 - diff
    if (diff < Math.PI * 0.4 && diff < bestAngleDiff) { // 72度扇形内
      bestAngleDiff = diff; bestIdx = ti
    }
  }
  if (bestIdx >= 0) {
    doPass(myTeam, 'my', ctrlIdx, bestIdx, pw)
    floats.push({ x: p.x, y: p.y - 20, text:'传球!', color:'#4CAF50', born: Date.now() })
  }
}

var goalFreezeUntil = 0 // 进球后冻结时间，期间不更新比赛

function scoreGoal(side) {
  if (side === 'my') { myGoals++; audio.playGoal(); audio.playCheer() }
  else { opGoals++; audio.playMiss() }
  // 进球后冻结比赛1.5秒（球和球员都不动）
  goalFreezeUntil = Date.now() + 1500
  ball.side = 'freeze'; ball.idx = -1; ball.x = px(0.5); ball.y = py(0.5); ball.vx = 0; ball.vy = 0
  goalFlashTime = Date.now(); goalFlashSide = side
  goalEvents.push({ time: matchDuration - matchTime, side: side })
  floats.push({ x: W/2, y: py(0.4), text: side === 'my' ? '⚽ GOAL!' : '失球...', color: side === 'my' ? '#ffd700' : '#ff6b6b', born: Date.now() })
  try { wx.vibrateShort({ type: side === 'my' ? 'heavy' : 'medium' }) } catch(e) {}
  setTimeout(function() {
    if (scene === 'match') {
      initMatchPlayers()
      ball.side = side === 'my' ? 'op' : 'my'; ball.idx = 0
      if (ball.side === 'my') ctrlIdx = 0
      goalFreezeUntil = 0
    }
  }, 1500)
}

function ballSaved(side) {
  var gk = side === 'op' ? opTeam[gkIdx()] : myTeam[gkIdx()]
  floats.push({ x: gk.x, y: gk.y - 25, text: '扑救!', color: '#4CAF50', born: Date.now() })
  // 扑救后GK直接大脚开出，避免对方反复射门
  var team = side === 'op' ? opTeam : myTeam
  gkClearBall(team, side)
}

// lastKickSide: 记录最后是哪方踢的球，出界时交给对方
var lastKickSide = 'my'

function ballMissed() {
  // 出界 → 冻结0.8秒后交给对方（掷界外球/球门球）
  var giveTo = lastKickSide === 'my' ? 'op' : 'my'
  var bx = clamp(ball.x, PL + 20, PR - 20)
  var by = clamp(ball.y, py(0.1), py(0.9))
  // 先冻结球
  ball.x = bx; ball.y = by; ball.vx = 0; ball.vy = 0
  ball.side = 'freeze'; ball.idx = -1
  goalFreezeUntil = Date.now() + 800
  floats.push({ x: bx, y: by - 20, text: '出界', color: 'rgba(255,255,255,0.5)', born: Date.now() })
  // 0.8秒后恢复比赛，球权交给对方
  setTimeout(function() {
    if (scene !== 'match') return
    var team = giveTo === 'my' ? myTeam : opTeam
    var bestIdx = 0, bestDist = 999
    for (var i = 0; i < gkIdx(); i++) {
      var d = dist2({x:bx, y:by}, team[i])
      if (d < bestDist) { bestDist = d; bestIdx = i }
    }
    ball.side = giveTo; ball.idx = bestIdx
    if (giveTo === 'my') ctrlIdx = bestIdx
    goalFreezeUntil = 0
  }, 800)
}

function endMatch() {
  audio.stopBGM(); audio.playWhistle()
  goalFreezeUntil = 0
  // 重置摇杆/按钮状态
  joystick.active = false; joystick.touchId = -1; joystick.dx = 0; joystick.dy = 0
  shootBtnPressed = false; passBtnPressed = false; switchBtnPressed = false
  try { wx.vibrateShort({ type: 'heavy' }) } catch(e) {}

  // 保存比赛结果
  var result = { myGoals: myGoals, opGoals: opGoals }
  var isWin = myGoals > opGoals

  // 奖励金币
  var reward = isWin ? (myGoals * 3 + 8) : 2
  D.coins += reward; saveField('coins', D.coins)

  // 日常任务
  if (!D.dailyDone.match1) { D.dailyDone.match1 = true; D.coins += 5; saveField('coins', D.coins) }
  if (isWin && !D.dailyDone.win1) { D.dailyDone.win1 = true; D.coins += 10; saveField('coins', D.coins) }
  saveField('dailyDone_' + todayStr(), D.dailyDone)

  if (matchMode === 'league') {
    var sched = LEAGUE_SCHEDULE[matchIdx]
    if (sched && sched.leg === 2) {
      // 两回合第二场：总比分晋级
      var leg1 = D.leagueWins[matchIdx - 1]
      var aggMy = (leg1 ? leg1.myGoals : 0) + myGoals
      var aggOp = (leg1 ? leg1.opGoals : 0) + opGoals
      result.aggMy = aggMy; result.aggOp = aggOp
      if (aggMy >= aggOp) { D.leagueWins.push(result); saveField('leagueWins', D.leagueWins) }
    } else if (sched && sched.leg === 1) {
      // 两回合第一场：无论输赢都记录，进入第二回合
      D.leagueWins.push(result); saveField('leagueWins', D.leagueWins)
    } else {
      // 积分赛/决赛：赢或平才晋级
      if (myGoals >= opGoals) { D.leagueWins.push(result); saveField('leagueWins', D.leagueWins) }
    }
  } else {
    if (isWin) { D.wcWins.push(result); saveField('wcWins', D.wcWins) }
  }

  // 标记已玩过
  if (!hasPlayedBefore) { hasPlayedBefore = true; wx.setStorageSync('hasPlayed', true) }

  // 排行榜已移除
  adDoubleUsed = false  // 重置广告双倍状态
  scene = 'matchResult'
  ad.showBanner()  // 结算页展示Banner广告
}

// ---- 比赛渲染（11v11）----
function drawMatch() {
  render.drawPitchBG(ctx, W, H, { top: PT, bottom: PB, left: PL, right: PR })
  var now = Date.now()
  var myT = getMyTeam()
  // 对方球衣颜色
  var opT = opponentTeam || {}
  if (!opT.color) opT = { city:'对手', color:'#FF4444', away:'#EEEEEE', emoji:'👕' }
  var myC = (myT.color && myT.color[0] === '#') ? myT.color : '#4CAF50'
  var opC = (opT.color && opT.color[0] === '#') ? opT.color : '#FF4444'
  // 颜色冲突检测
  var cr = function(c) { return [parseInt(c.slice(1,3),16)||0, parseInt(c.slice(3,5),16)||0, parseInt(c.slice(5,7),16)||0] }
  var mc = cr(myC), oc = cr(opC)
  var colorDiff = Math.abs(mc[0]-oc[0]) + Math.abs(mc[1]-oc[1]) + Math.abs(mc[2]-oc[2])
  var opColor = colorDiff < 150 ? ((opT.away && opT.away[0] === '#') ? opT.away : '#EEEEEE') : opC
  // 球门宽度按真实比例（7.32m/68m ≈ 10.8%，放大到视觉合理的 30%）
  var goalW = (PR - PL) * 0.30, goalH = 16
  render.drawGoal(ctx, W/2-goalW/2, PT-2, goalW, goalH, false)
  render.drawGoal(ctx, W/2-goalW/2, PB-goalH+2, goalW, goalH, true)

  if (goalFlashTime > 0 && (now - goalFlashTime) < 800) {
    var fa = 0.12*(1-(now-goalFlashTime)/800)
    ctx.fillStyle = goalFlashSide==='my' ? 'rgba(255,215,0,'+fa+')' : 'rgba(255,50,50,'+fa+')'
    ctx.fillRect(0,0,W,H)
  }

  // 所有实体按Y坐标排序渲染（正确的前后遮挡关系）
  var entities = []
  for (var oi=0;oi<opTeam.length;oi++) {
    var op=opTeam[oi]
    entities.push({type:'player',x:op.x,y:op.y,color:opColor,num:op.num,hl:false,hb:ball.side==='op'&&ball.idx===oi,gk:oi===gkIdx(),vx:op.x-(op.prevX||op.x),vy:op.y-(op.prevY||op.y),role:op.role})
  }
  for (var mi=0;mi<myTeam.length;mi++) {
    var mp=myTeam[mi]
    entities.push({type:'player',x:mp.x,y:mp.y,color:myC,num:mp.num,hl:mi===ctrlIdx&&mi<gkIdx(),hb:ball.side==='my'&&ball.idx===mi,gk:mi===gkIdx(),vx:mp.x-(mp.prevX||mp.x),vy:mp.y-(mp.prevY||mp.y),role:mp.role})
  }
  if (ball.side !== 'freeze') {
    entities.push({type:'ball',x:ball.x,y:ball.y})
  }
  // 按Y排序（Y小的先画，Y大的后画覆盖在上面）
  entities.sort(function(a,b){return a.y - b.y})
  for (var ei=0;ei<entities.length;ei++) {
    var e = entities[ei]
    if (e.type === 'ball') {
      var isFlying = ball.side === 'fly'
      render.drawBall(ctx, e.x, e.y, PLAYER_R * 1.2, isFlying)
      if (isFlying && ball.flyTarget < 0) {
        for (var ti=1;ti<=3;ti++) {
          ctx.beginPath();ctx.arc(e.x-ball.vx*ti*1.5,e.y-ball.vy*ti*1.5,PLAYER_R*0.18*(1-ti/4),0,Math.PI*2)
          ctx.fillStyle='rgba(255,200,50,'+(0.2*(1-ti/4))+')';ctx.fill()
        }
      }
    } else {
      try { drawMiniPlayer(ctx,e.x,e.y,PLAYER_R,e.color,e.num,e.hl,e.hb,e.gk,e.vx,e.vy,e.role) }
      catch(err) { ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(e.x,e.y,PLAYER_R,0,Math.PI*2);ctx.fill() }
    }
  }
  // 控制球员高亮（三角箭头，比圆环更明显）
  var cp=myTeam[ctrlIdx]
  ctx.beginPath()
  ctx.moveTo(cp.x, cp.y - PLAYER_R - 8)
  ctx.lineTo(cp.x - 5, cp.y - PLAYER_R - 15)
  ctx.lineTo(cp.x + 5, cp.y - PLAYER_R - 15)
  ctx.closePath()
  ctx.fillStyle = '#ffd700'; ctx.fill()

  // 瞄准线（摇杆方向）
  if (joystick.active&&ball.side==='my'&&ball.idx===ctrlIdx) {
    var jD=Math.sqrt(joystick.dx*joystick.dx+joystick.dy*joystick.dy)
    if (jD>5) {
      var aL=PH*0.18
      var ax=cp.x+(joystick.dx/jD)*aL*0.4,ay=cp.y+(joystick.dy/jD)*aL
      ctx.beginPath();ctx.moveTo(cp.x,cp.y-PLAYER_R);ctx.lineTo(ax,ay)
      ctx.strokeStyle='rgba(255,215,0,0.4)';ctx.lineWidth=2;ctx.stroke()
      ctx.beginPath();ctx.arc(ax,ay,3,0,Math.PI*2)
      ctx.fillStyle='rgba(255,215,0,0.5)';ctx.fill()
    }
  }
  // 粒子
  for (var pi=0;pi<particles.length;pi++) {
    var pp=particles[pi];var pA=(now-pp.born)/600;if(pA>1)continue
    ctx.globalAlpha=1-pA;ctx.beginPath();ctx.arc(pp.x,pp.y,pp.size*(1-pA*0.5),0,Math.PI*2)
    ctx.fillStyle=pp.color;ctx.fill();ctx.globalAlpha=1
  }
  // 飘字
  for (var fi=0;fi<floats.length;fi++) {
    var ff=floats[fi];var fA=(now-ff.born)/1500;if(fA>1)continue
    ctx.globalAlpha=fA<0.7?1:(1-(fA-0.7)/0.3)
    render.drawStrokeText(ctx,ff.text,ff.x,ff.y-fA*50,'bold '+(W*0.05)+'px sans-serif',ff.color,'rgba(0,0,0,0.5)',2)
    ctx.globalAlpha=1
  }
  drawMatchHUD()
  // 虚拟摇杆
  if (matchCountdown<=0) {
    var jbx = W * 0.16, jby = py(0.82)
    // 更新按钮位置
    BTN_SHOOT.x = W * 0.84; BTN_SHOOT.y = py(0.75); BTN_SHOOT.r = 30
    BTN_PASS.x = W * 0.68; BTN_PASS.y = py(0.85); BTN_PASS.r = 24
    BTN_SWITCH.x = W * 0.84; BTN_SWITCH.y = py(0.88); BTN_SWITCH.r = 22
    // 摇杆底座（激活时跟随触摸位置）
    var jBaseDrawX = joystick.active ? joystick.baseX : jbx
    var jBaseDrawY = joystick.active ? joystick.baseY : jby
    ctx.beginPath(); ctx.arc(jBaseDrawX, jBaseDrawY, JOY_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2; ctx.stroke()
    // 摇杆
    var sjx = jBaseDrawX, sjy = jBaseDrawY
    if (joystick.active) {
      sjx = joystick.stickX; sjy = joystick.stickY
    }
    ctx.beginPath(); ctx.arc(sjx, sjy, JOY_STICK_R, 0, Math.PI * 2)
    var jGrad2 = ctx.createRadialGradient(sjx-3, sjy-3, 0, sjx, sjy, JOY_STICK_R)
    jGrad2.addColorStop(0, 'rgba(255,255,255,0.35)'); jGrad2.addColorStop(1, 'rgba(255,255,255,0.12)')
    ctx.fillStyle = jGrad2; ctx.fill()
    // 射门按钮
    ctx.beginPath(); ctx.arc(BTN_SHOOT.x, BTN_SHOOT.y, BTN_SHOOT.r, 0, Math.PI * 2)
    ctx.fillStyle = shootBtnPressed ? 'rgba(255,215,0,0.6)' : 'rgba(255,215,0,0.3)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,215,0,0.7)'; ctx.lineWidth = 2.5; ctx.stroke()
    // 蓄力进度环
    if (shootBtnPressed && shootChargeStart > 0) {
      var chgPct = Math.min((now - shootChargeStart) / CHARGE_MAX_MS, 1)
      ctx.beginPath(); ctx.arc(BTN_SHOOT.x, BTN_SHOOT.y, BTN_SHOOT.r + 4, -Math.PI/2, -Math.PI/2 + chgPct * Math.PI * 2)
      ctx.strokeStyle = chgPct > 0.8 ? '#ff4444' : '#ffd700'; ctx.lineWidth = 4; ctx.stroke()
    }
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + (W*0.035) + 'px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('射门', BTN_SHOOT.x, BTN_SHOOT.y)
    // 传球按钮
    ctx.beginPath(); ctx.arc(BTN_PASS.x, BTN_PASS.y, BTN_PASS.r, 0, Math.PI * 2)
    ctx.fillStyle = passBtnPressed ? 'rgba(100,255,100,0.6)' : 'rgba(100,255,100,0.25)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(100,255,100,0.6)'; ctx.lineWidth = 2; ctx.stroke()
    // 蓄力进度环
    if (passBtnPressed && passChargeStart > 0) {
      var chgPctP = Math.min((now - passChargeStart) / CHARGE_MAX_MS, 1)
      ctx.beginPath(); ctx.arc(BTN_PASS.x, BTN_PASS.y, BTN_PASS.r + 3, -Math.PI/2, -Math.PI/2 + chgPctP * Math.PI * 2)
      ctx.strokeStyle = '#4CAF50'; ctx.lineWidth = 3; ctx.stroke()
    }
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + (W*0.03) + 'px sans-serif'
    ctx.fillText('传球', BTN_PASS.x, BTN_PASS.y)
    // 切换按钮
    ctx.beginPath(); ctx.arc(BTN_SWITCH.x, BTN_SWITCH.y, BTN_SWITCH.r, 0, Math.PI * 2)
    ctx.fillStyle = switchBtnPressed ? 'rgba(30,144,255,0.6)' : 'rgba(30,144,255,0.25)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(30,144,255,0.5)'; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + (W*0.026) + 'px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('切换', BTN_SWITCH.x, BTN_SWITCH.y)
  }
  // 倒计时
  if (matchCountdown>0) {
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,PT,W,PH)
    var cdY=py(0.45),cdS=1+Math.sin(now/150)*0.1
    ctx.save();ctx.translate(W/2,cdY);ctx.scale(cdS,cdS)
    render.drawStrokeText(ctx,''+matchCountdown,0,0,'bold '+(W*0.18)+'px sans-serif','#ffd700','rgba(0,0,0,0.6)',5)
    ctx.restore()
    render.drawText(ctx,'准备开球...',W/2,cdY+W*0.1,(W*0.035)+'px sans-serif','rgba(255,255,255,0.5)')
  }
  // 新手引导
  if (guideStep>0&&matchCountdown<=0) {
    guideTimer+=16;var gA=Math.min(guideTimer/400,0.8)
    if (guideStep===1) {
      ctx.fillStyle='rgba(0,0,0,'+gA*0.6+')';ctx.fillRect(0,py(0.35),W,PH*0.65)
      render.drawStrokeText(ctx,'📱 操控说明',W/2,py(0.42),'bold '+(W*0.06)+'px sans-serif','#fff','rgba(0,0,0,0.7)',4)
      var gTips = [
        { text:'🕹️ 左侧摇杆 · 控制移动和方向', color:'#4CAF50' },
        { text:'⚽ 按住射门键蓄力 · 松开射门', color:'#ffd700' },
        { text:'📨 按住传球键蓄力 · 松开传球', color:'#1E90FF' },
        { text:'🔄 切换键 · 切到离球最近的队友', color:'#1E90FF' },
        { text:'靠近对手自动抢断', color:'#FF9800' },
        { text:'蓄力越久力量越大！', color:'rgba(255,255,255,0.6)' }
      ]
      for (var gi=0;gi<gTips.length;gi++) {
        render.drawText(ctx,gTips[gi].text,W/2,py(0.50)+gi*30,'bold '+(W*0.028)+'px sans-serif',gTips[gi].color)
      }
      render.drawStrokeText(ctx,'👆 点击继续',W/2,py(0.9),'bold '+(W*0.03)+'px sans-serif','#fff','rgba(0,0,0,0.5)',2)
    } else if (guideStep===2) {
      ctx.fillStyle='rgba(0,0,0,'+gA*0.6+')';ctx.fillRect(0,PT,W,PH*0.45)
      render.drawStrokeText(ctx,'⚽ 准备开始！',W/2,py(0.1),'bold '+(W*0.06)+'px sans-serif','#ffd700','rgba(0,0,0,0.7)',4)
      render.drawText(ctx,'左侧摇杆移动，右侧射门/传球/切换',W/2,py(0.18),'bold '+(W*0.03)+'px sans-serif','rgba(255,255,255,0.9)')
      render.drawText(ctx,'按住射门/传球键蓄力，松开释放',W/2,py(0.24),'bold '+(W*0.03)+'px sans-serif','rgba(255,255,255,0.9)')
      render.drawText(ctx,'蓄力越久力量越大！',W/2,py(0.30),'bold '+(W*0.03)+'px sans-serif','#ffd700')
      render.drawStrokeText(ctx,'👆 点击开始比赛',W/2,py(0.9),'bold '+(W*0.03)+'px sans-serif','#fff','rgba(0,0,0,0.5)',2)
    }
  }
}

// 安全取色（避免undefined/无效色导致canvas崩溃）
function safeColor(c, fallback) {
  if (c && typeof c === 'string' && c[0] === '#' && c.length >= 7) return c
  return fallback || '#888888'
}
function safeLighten(c, amt) {
  c = safeColor(c, '#888888')
  var r = Math.min(255, Math.max(0, (parseInt(c.slice(1,3),16)||0) + amt))
  var g = Math.min(255, Math.max(0, (parseInt(c.slice(3,5),16)||0) + amt))
  var b = Math.min(255, Math.max(0, (parseInt(c.slice(5,7),16)||0) + amt))
  return '#' + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1)
}

// 守门员球衣颜色
function getGKColor(teamColor) {
  var gkColors = ['#2ECC40','#FFDC00','#FF851B','#AAAAAA','#01FF70']
  var tc = safeColor(teamColor)
  var tr = parseInt(tc.slice(1,3),16), tg = parseInt(tc.slice(3,5),16)
  var best = gkColors[0], bestDiff = 0
  for (var i = 0; i < gkColors.length; i++) {
    var diff = Math.abs(tr - parseInt(gkColors[i].slice(1,3),16)) + Math.abs(tg - parseInt(gkColors[i].slice(3,5),16))
    if (diff > bestDiff) { bestDiff = diff; best = gkColors[i] }
  }
  return best
}

// 穿球衣的小人
function drawMiniPlayer(ctx, x, y, r, color, num, highlighted, hasBall, isGK, vx, vy, role) {
  var s = r
  vx = vx || 0; vy = vy || 0
  var speed = Math.sqrt(vx*vx + vy*vy)
  var isMoving = speed > 0.3
  var now = Date.now()

  // 朝向角度（基于移动方向）
  var faceAngle = 0 // 0=正面
  if (isMoving) { faceAngle = Math.atan2(vx, -vy) } // 面朝移动方向

  // 朝向偏移（左右偏移头部和五官）
  var faceX = Math.sin(faceAngle) * s * 0.15  // 头部左右偏移
  var faceSide = faceAngle > 0.3 ? 1 : faceAngle < -0.3 ? -1 : 0 // 1=右, -1=左, 0=正面

  // 跑动动画（腿部摆动）
  var legSwing = 0, armSwing = 0
  if (isMoving) {
    var runCycle = (now * 0.012 + x * 0.1) % (Math.PI * 2) // 每个球员相位不同
    legSwing = Math.sin(runCycle) * s * 0.25
    armSwing = Math.sin(runCycle + Math.PI) * s * 0.12
  }

  // GK球衣颜色
  var jc
  if (!isGK) { jc = safeColor(color) }
  else if (matchTeamSize <= 5) { jc = safeLighten(safeColor(color), 50) }
  else { jc = safeColor(getGKColor(color)) }

  // GK体型更壮
  var bodyScale = isGK ? 1.15 : 1.0

  // 阴影（移动时拉长）
  ctx.beginPath()
  ctx.ellipse ? ctx.ellipse(x, y+s*1.0, s*(0.4+speed*0.02), s*0.2, 0, 0, Math.PI*2) : ctx.arc(x, y+s*1.0, s*0.35, 0, Math.PI*2)
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill()

  // === 腿（跑动摆动）===
  ctx.strokeStyle = '#dbb896'; ctx.lineWidth = s*0.16; ctx.lineCap = 'round'
  // 左腿
  var lLegEndX = x - s*0.18 + (isMoving ? legSwing * 0.3 : 0)
  var lLegEndY = y + s*0.85 + (isMoving ? Math.abs(legSwing)*0.15 - s*0.08 : 0)
  ctx.beginPath(); ctx.moveTo(x-s*0.2, y+s*0.4); ctx.lineTo(lLegEndX, lLegEndY); ctx.stroke()
  // 右腿（反相）
  var rLegEndX = x + s*0.18 + (isMoving ? -legSwing * 0.3 : 0)
  var rLegEndY = y + s*0.85 + (isMoving ? Math.abs(-legSwing)*0.15 - s*0.08 : 0)
  ctx.beginPath(); ctx.moveTo(x+s*0.2, y+s*0.4); ctx.lineTo(rLegEndX, rLegEndY); ctx.stroke()
  // 球鞋
  ctx.fillStyle = '#222'
  ctx.beginPath(); ctx.arc(lLegEndX, lLegEndY+s*0.05, s*0.1, 0, Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(rLegEndX, rLegEndY+s*0.05, s*0.1, 0, Math.PI*2); ctx.fill()

  // 短裤
  ctx.fillStyle = isGK ? safeLighten(jc, -40) : '#222'
  ctx.beginPath()
  ctx.moveTo(x-s*0.35*bodyScale, y+s*0.25); ctx.lineTo(x-s*0.25, y+s*0.5)
  ctx.lineTo(x+s*0.25, y+s*0.5); ctx.lineTo(x+s*0.35*bodyScale, y+s*0.25)
  ctx.closePath(); ctx.fill()

  // 球衣
  var bw = 0.45 * bodyScale // 球衣宽度系数
  ctx.beginPath()
  ctx.moveTo(x-s*bw, y-s*0.15)
  ctx.quadraticCurveTo(x-s*(bw+0.05), y+s*0.3, x-s*0.3, y+s*0.35)
  ctx.lineTo(x+s*0.3, y+s*0.35)
  ctx.quadraticCurveTo(x+s*(bw+0.05), y+s*0.3, x+s*bw, y-s*0.15)
  ctx.closePath()
  ctx.fillStyle = jc; ctx.fill()
  // 球衣高光
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.beginPath()
  ctx.moveTo(x-s*(bw-0.05), y-s*0.1)
  ctx.quadraticCurveTo(x-s*0.3, y+s*0.1, x, y+s*0.15)
  ctx.lineTo(x, y-s*0.1); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 0.5; ctx.stroke()

  // 号码
  ctx.fillStyle = isGK ? '#000' : '#fff'
  ctx.font = 'bold '+(s*0.45)+'px sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(''+num, x, y+s*0.12)

  // 袖子+手（跑动摆动）
  var armL = isGK ? s*0.18 : s*0.12
  ctx.strokeStyle = jc; ctx.lineWidth = s*0.14; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(x-s*bw+s*0.03,y-s*0.05); ctx.lineTo(x-s*(bw+0.1),y+s*0.15+armSwing); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x+s*bw-s*0.03,y-s*0.05); ctx.lineTo(x+s*(bw+0.1),y+s*0.15-armSwing); ctx.stroke()
  ctx.strokeStyle = '#dbb896'; ctx.lineWidth = s*0.1
  ctx.beginPath(); ctx.moveTo(x-s*(bw+0.1),y+s*0.15+armSwing); ctx.lineTo(x-s*(bw+0.15),y+s*0.25+armSwing); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x+s*(bw+0.1),y+s*0.15-armSwing); ctx.lineTo(x+s*(bw+0.15),y+s*0.25-armSwing); ctx.stroke()

  // GK手套（更大）
  if (isGK) {
    ctx.fillStyle = '#FF851B'
    ctx.beginPath(); ctx.arc(x-s*(bw+0.17),y+s*0.27+armSwing,s*0.13,0,Math.PI*2); ctx.fill()
    ctx.beginPath(); ctx.arc(x+s*(bw+0.17),y+s*0.27-armSwing,s*0.13,0,Math.PI*2); ctx.fill()
  }

  // === 头部（朝向偏移）===
  var headX = x + faceX * 0.5
  var headY = y - s * 0.32
  var headR = s * (isGK ? 0.30 : 0.28)
  ctx.beginPath(); ctx.arc(headX, headY, headR, 0, Math.PI*2)
  // 肤色渐变
  var hGrad2 = ctx.createRadialGradient(headX-headR*0.3, headY-headR*0.3, 0, headX, headY, headR)
  hGrad2.addColorStop(0, '#ffe0c0'); hGrad2.addColorStop(1, '#e0b080')
  ctx.fillStyle = hGrad2; ctx.fill()

  // 头发（根据朝向调整弧度）
  var hairStart = faceSide === 1 ? 1.0 : 1.15
  var hairEnd = faceSide === -1 ? 2.0 : 1.85
  ctx.beginPath(); ctx.arc(headX, headY, headR, Math.PI*hairStart, Math.PI*hairEnd)
  ctx.strokeStyle = isGK ? '#2a1a08' : '#3a2518'; ctx.lineWidth = s*0.13; ctx.stroke()

  // === 五官（根据朝向偏移）===
  var eyeOffX = faceX * 0.6 // 眼睛跟随朝向
  if (faceSide === 0) {
    // 正面：两只眼睛
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(headX-headR*0.3+eyeOffX, headY-headR*0.1, headR*0.17, 0, Math.PI*2); ctx.fill()
    ctx.beginPath(); ctx.arc(headX+headR*0.3+eyeOffX, headY-headR*0.1, headR*0.17, 0, Math.PI*2); ctx.fill()
    ctx.fillStyle = '#222'
    ctx.beginPath(); ctx.arc(headX-headR*0.28+eyeOffX, headY-headR*0.08, headR*0.09, 0, Math.PI*2); ctx.fill()
    ctx.beginPath(); ctx.arc(headX+headR*0.32+eyeOffX, headY-headR*0.08, headR*0.09, 0, Math.PI*2); ctx.fill()
    // 眼睛高光
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(headX-headR*0.26+eyeOffX, headY-headR*0.12, headR*0.04, 0, Math.PI*2); ctx.fill()
    ctx.beginPath(); ctx.arc(headX+headR*0.34+eyeOffX, headY-headR*0.12, headR*0.04, 0, Math.PI*2); ctx.fill()
    // 微笑
    ctx.beginPath()
    ctx.arc(headX+eyeOffX, headY+headR*0.15, headR*0.2, 0.1*Math.PI, 0.9*Math.PI)
    ctx.strokeStyle = '#a0522d'; ctx.lineWidth = s*0.05; ctx.lineCap = 'round'; ctx.stroke()
  } else {
    // 侧面：一只眼睛+半边嘴
    var side = faceSide
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(headX+side*headR*0.15+eyeOffX, headY-headR*0.1, headR*0.18, 0, Math.PI*2); ctx.fill()
    ctx.fillStyle = '#222'
    ctx.beginPath(); ctx.arc(headX+side*headR*0.18+eyeOffX, headY-headR*0.08, headR*0.1, 0, Math.PI*2); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(headX+side*headR*0.2+eyeOffX, headY-headR*0.12, headR*0.04, 0, Math.PI*2); ctx.fill()
    // 鼻子小点
    ctx.fillStyle = '#d4a07a'
    ctx.beginPath(); ctx.arc(headX+side*headR*0.4+eyeOffX, headY+headR*0.05, headR*0.06, 0, Math.PI*2); ctx.fill()
    // 嘴
    ctx.beginPath()
    ctx.arc(headX+side*headR*0.2+eyeOffX, headY+headR*0.2, headR*0.12, 0.1*Math.PI, 0.9*Math.PI)
    ctx.strokeStyle = '#a0522d'; ctx.lineWidth = s*0.05; ctx.lineCap = 'round'; ctx.stroke()
  }

  // 选中高亮
  if (highlighted) {
    ctx.beginPath(); ctx.arc(x, y+s*0.1, s*1.15, 0, Math.PI*2)
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.stroke()
  }
}

function drawMatchHUD() {
  var myT=getMyTeam(),opT=opponentTeam||{city:'对手',color:'#888',emoji:'❓'}
  var hudY=safeTop+12,hudH=46,now=Date.now()
  ctx.fillStyle='rgba(0,30,8,0.5)';ctx.fillRect(0,0,W,hudY+hudH)
  render.drawStrokeText(ctx,myT.emoji+' '+(myT.city||'').substring(0,3),W*0.18,hudY+hudH/2,'bold '+(W*0.03)+'px sans-serif','#fff','rgba(0,0,0,0.4)',2,'center')
  render.drawStrokeText(ctx,myGoals+' : '+opGoals,W/2,hudY+hudH/2,'bold '+(W*0.065)+'px sans-serif','#fff','rgba(0,0,0,0.5)',3)
  render.drawStrokeText(ctx,(opT.city||'').substring(0,3)+' '+opT.emoji,W*0.82,hudY+hudH/2,'bold '+(W*0.03)+'px sans-serif','#fff','rgba(0,0,0,0.4)',2,'center')
  var secs=Math.ceil(matchTime/1000),mins=Math.floor(secs/60),ss=secs%60
  render.drawText(ctx,'⏱'+mins+':'+(ss<10?'0':'')+ss,W/2,hudY+hudH+10,(W*0.023)+'px sans-serif',secs<=10?'#ff6b6b':'rgba(255,255,255,0.5)')
  var tipY=PB+14
  // 操作提示栏（半透明背景 + 醒目文字）
  ctx.fillStyle='rgba(0,0,0,0.3)'
  render.roundRect(ctx, W*0.1, tipY-12, W*0.8, 24, 12); ctx.fill()
  if (ball.side==='my'&&ball.idx===ctrlIdx) {
    render.drawText(ctx,'持球中 · 长按蓄力射门/传球',W/2,tipY,(W*0.026)+'px sans-serif','#ffd700')
  } else if (ball.side==='op') {
    render.drawText(ctx,'靠近抢断 · 切换键换人',W/2,tipY,(W*0.026)+'px sans-serif','#ff6b6b')
  } else if (ball.side==='my') {
    render.drawText(ctx,'队友持球 · 切换键接管',W/2,tipY,(W*0.026)+'px sans-serif','#8BC34A')
  } else {
    render.drawText(ctx,'靠近足球拿球 · 切换键换人',W/2,tipY,(W*0.026)+'px sans-serif','rgba(255,255,255,0.7)')
  }
  if (secs<=10&&secs>0&&Math.sin(now/200)>0) render.drawText(ctx,'⏱'+secs+'秒！',W/2,py(0.5),'bold '+(W*0.04)+'px sans-serif','#ff6b6b')
}

// ==================== 赛后结算 ====================
function drawMatchResult() {
  var t = Date.now() / 1000
  render.drawMenuBG(ctx, W, H, t)
  var cx = W / 2
  var myT = getMyTeam()
  var opT = opponentTeam || { city:'对手', color:'#888', emoji:'❓' }
  var isWin = myGoals > opGoals
  var isDraw = myGoals === opGoals

  // 结果标题
  var resultText = isWin ? '🏆 胜利！' : isDraw ? '🤝 平局' : '😞 失败'
  var resultColor = isWin ? '#ffd700' : isDraw ? '#4CAF50' : '#ff6b6b'
  render.drawStrokeText(ctx, resultText, cx, safeTop + H * 0.08, 'bold ' + (W * 0.08) + 'px sans-serif', resultColor, 'rgba(0,0,0,0.4)', 4)

  // 比分
  render.drawText(ctx, myT.emoji + ' ' + myT.city, cx - W * 0.22, safeTop + H * 0.18, 'bold ' + (W * 0.035) + 'px sans-serif', myT.color)
  render.drawStrokeText(ctx, myGoals + ' : ' + opGoals, cx, safeTop + H * 0.18, 'bold ' + (W * 0.08) + 'px sans-serif', '#fff', 'rgba(0,0,0,0.4)', 3)
  render.drawText(ctx, opT.city + ' ' + opT.emoji, cx + W * 0.22, safeTop + H * 0.18, 'bold ' + (W * 0.035) + 'px sans-serif', opT.color)

  // 进球时间线
  if (goalEvents.length > 0) {
    render.drawText(ctx, '⚽ 进球记录', cx, safeTop + H * 0.27, (W * 0.03) + 'px sans-serif', 'rgba(255,255,255,0.5)')
    for (var i = 0; i < Math.min(goalEvents.length, 6); i++) {
      var ge = goalEvents[i]
      var geTime = Math.floor(ge.time / 1000)
      var geText = (ge.side === 'my' ? myT.city : opT.city) + " " + geTime + "'"
      var geColor = ge.side === 'my' ? '#4CAF50' : '#ff6b6b'
      render.drawText(ctx, '⚽ ' + geText, cx, safeTop + H * 0.31 + i * 22, (W * 0.026) + 'px sans-serif', geColor)
    }
  }

  // 奖励
  var rewardY = safeTop + H * 0.56
  var reward = isWin ? (myGoals * 3 + 8) : 2
  render.drawText(ctx, '💰 获得 ' + reward + ' 金币', cx, rewardY, 'bold ' + (W * 0.035) + 'px sans-serif', '#ffd700')

  // 激励视频：双倍金币按钮
  if (!adDoubleUsed) {
    var adBtnW = W * 0.45, adBtnH = W * 0.09
    var adBtnX = cx - adBtnW / 2, adBtnY = rewardY + 14
    render.drawButton(ctx, adBtnX, adBtnY, adBtnW, adBtnH, '🎬 看视频 双倍奖励', ['#FF6F00', '#FFA000'])
  } else {
    render.drawText(ctx, '💰 额外获得 ' + reward + ' 金币！', cx, rewardY + 28, (W * 0.028) + 'px sans-serif', '#4CAF50')
  }

  // 赛事进度
  var schedule = matchMode === 'league' ? LEAGUE_SCHEDULE : WC_SCHEDULE
  var progress = matchMode === 'league' ? D.leagueWins.length : D.wcWins.length
  var total = schedule.length
  render.drawText(ctx, (matchMode === 'league' ? '联赛' : '世界杯') + '进度: ' + progress + '/' + total, cx, rewardY + 28, (W * 0.026) + 'px sans-serif', 'rgba(255,255,255,0.4)')

  // 按钮
  var bw = W * 0.5, bh = W * 0.11

  // 下一场/重来
  var leagueSched = matchMode === 'league' ? LEAGUE_SCHEDULE[matchIdx] : null
  var needRetry = false
  var retryMsg = ''
  if (matchMode === 'wc' && !isWin) {
    needRetry = true; retryMsg = '需要获胜才能晋级'
  } else if (matchMode === 'league' && leagueSched) {
    if (leagueSched.leg === 2) {
      // 两回合第二场：检查总比分
      var leg1R = D.leagueWins[matchIdx - 1]
      var aggMy2 = (leg1R ? leg1R.myGoals : 0) + myGoals
      var aggOp2 = (leg1R ? leg1R.opGoals : 0) + opGoals
      if (aggMy2 < aggOp2) { needRetry = true; retryMsg = '总比分 ' + aggMy2 + ':' + aggOp2 + ' 落后，需重赛两回合' }
    } else if (leagueSched.leg === 1) {
      // 第一回合：不需要重赛
      needRetry = false
    } else {
      if (!isWin && !isDraw) { needRetry = true; retryMsg = '需要赢球或平局才能晋级' }
    }
  }
  if (needRetry) {
    render.drawText(ctx, retryMsg, cx, H * 0.68, (W * 0.026) + 'px sans-serif', 'rgba(255,255,255,0.5)')
    render.drawButton(ctx, cx - bw / 2, H * 0.72, bw, bh, '🔄 重新挑战', ['#E65100', '#FF9800'])
  } else if (progress < total) {
    render.drawButton(ctx, cx - bw / 2, H * 0.70, bw, bh, '⚽ 下一场', ['#2E7D32', '#4CAF50'])
  } else {
    render.drawText(ctx, '🎉 恭喜通关！', cx, H * 0.70, 'bold ' + (W * 0.04) + 'px sans-serif', '#ffd700')
  }

  // 分享
  render.drawButton(ctx, cx - bw / 2, H * 0.82, bw, bh, '📤 分享战绩', ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)'], '#8BC34A')
  render.drawText(ctx, '返回首页', cx, H * 0.93, (W * 0.028) + 'px sans-serif', 'rgba(255,255,255,0.4)')
}

// 排行榜已移除

// ==================== 点球大战 · 射门 ====================
var penaltySpotY = 0, goalLineY = 0, goalL = 0, goalR = 0, goalW2 = 0

function initChlAttack() {
  chlShots = []; chlGoals = 0; chlRound = 0; chlRole = 'attack'; chlResults = []
  chlPhase = 'ready'; chlTimer = Date.now()
  // 点球场地参数（真实比例：罚球点11m，门宽7.32m，比值1.5:1）
  goalW2 = W * 0.45
  var penaltyDist = goalW2 * 1.5 // 罚球点到门线距离 = 门宽 × 1.5
  goalLineY = H * 0.22
  penaltySpotY = goalLineY + penaltyDist
  goalL = W / 2 - goalW2 / 2; goalR = W / 2 + goalW2 / 2
  chlGKAIX = W / 2
  particles = []; floats = []
  scene = 'chlAttack'
}

function resetChlBallAttack() {
  chlBall.x = W / 2; chlBall.y = penaltySpotY
  chlBall.vx = 0; chlBall.vy = 0; chlBall.spin = 0
  chlGKAIX = W / 2
  // 重置操控状态，防止上一球的方向残留
  joystick.active = false; joystick.touchId = -1; joystick.dx = 0; joystick.dy = 0
  shootBtnPressed = false; shootBtnTouchId = -1; shootChargeStart = 0
}

function updateChlAttack(dt) {
  var now = Date.now(), dtF = dt / 16
  if (chlPhase === 'ready') {
    if (now - chlTimer > 1000) { chlPhase = 'aim'; resetChlBallAttack() }
    return
  }
  if (chlPhase === 'flying') {
    // 弧线效果
    if (chlBall.spin) { chlBall.vx += chlBall.spin * dtF; chlBall.spin *= 0.97 }
    chlBall.x += chlBall.vx * dtF; chlBall.y += chlBall.vy * dtF
    // AI GK扑球（随机选方向）
    var gkTarget = chlGKAIX + (chlBall.x - chlGKAIX) * 0.6
    var gkSpd = 2.8 * dtF
    if (Math.abs(gkTarget - chlGKAIX) > 2) chlGKAIX += (gkTarget > chlGKAIX ? 1 : -1) * gkSpd
    chlGKAIX = clamp(chlGKAIX, goalL + 15, goalR - 15)

    // 球到球门线
    if (chlBall.y < goalLineY + 10) {
      var inGoal = chlBall.x > goalL + 5 && chlBall.x < goalR - 5
      var saved = Math.abs(chlBall.x - chlGKAIX) < PLAYER_R * (1.2 + 0.4 * 0.5)
      if (inGoal && !saved) {
        chlGoals++; chlResults.push('goal')
        floats.push({ x:W/2, y:H*0.35, text:'⚽ GOAL!', color:'#ffd700', born:now })
        audio.playGoal()
      } else if (saved) {
        chlResults.push('saved')
        floats.push({ x:W/2, y:H*0.35, text:'扑救!', color:'#ff6b6b', born:now })
        audio.playMiss()
      } else {
        chlResults.push('miss')
        floats.push({ x:W/2, y:H*0.35, text:'打偏!', color:'#ff6b6b', born:now })
        audio.playMiss()
      }
      chlPhase = 'result'; chlTimer = now; return
    }
    if (chlBall.x < 0 || chlBall.x > W || chlBall.y > H) {
      chlResults.push('miss')
      floats.push({ x:W/2, y:H*0.35, text:'打偏!', color:'#ff6b6b', born:now })
      chlPhase = 'result'; chlTimer = now
    }
    return
  }
  if (chlPhase === 'result') {
    if (now - chlTimer > 1500) {
      chlRound++
      if (chlRound >= CHL_TOTAL) { chlPhase = 'done'; uploadChallenge() }
      else { chlPhase = 'ready'; chlTimer = now }
    }
  }
}

function chlShoot(svx, svy, power) {
  if (chlPhase !== 'aim') return
  var pw = power || 1.0
  var shootSpeed = (6.5 + getStatValue('atk') * 0.6) * pw
  var dist = Math.sqrt(svx * svx + svy * svy)
  if (dist < 0.1) return
  chlBall.vx = (svx / dist) * shootSpeed
  chlBall.vy = (svy / dist) * shootSpeed
  chlBall.spin = (svx / dist) * 0.12 * pw // 弧线球
  chlShots.push({ sx:chlBall.x, sy:chlBall.y, vx:chlBall.vx, vy:chlBall.vy, spin:chlBall.spin })
  chlPhase = 'flying'
  audio.playKick(4)
  for (var i = 0; i < 5; i++) {
    particles.push({ x:chlBall.x, y:chlBall.y, vx:(Math.random()-0.5)*3, vy:-Math.random()*2, color:'#ffd700', born:Date.now(), size:2+Math.random()*2 })
  }
}

function uploadChallenge() {
  var mt = getMyTeam(); var teamLabel = mt.emoji ? mt.emoji + mt.city : ''
  try {
    wx.cloud.callFunction({
      name: 'challenge',
      data: {
        action: 'create',
        nickname: D.nickname || '匿名球员',
        team: teamLabel,
        shots: chlShots,
        goalsScored: chlGoals
      },
      success: function(res) {
        if (res.result && res.result.code === 0) {
          chlId = res.result.challengeId
        }
      }
    })
  } catch(e) {}
  // 不等上传完成，直接进结果页
  chlResultData = null
  scene = 'chlResult'
}

function drawChlAttack() {
  // 点球大战背景
  ctx.fillStyle = '#1a5c2e'; ctx.fillRect(0, 0, W, H)
  var cx = W / 2, now = Date.now()
  var myT = getMyTeam()

  // 看台（HUD下方到球门上方，深绿色调）
  var standH = goalLineY - 30
  if (standH > safeTop + 44) {
    var sg = ctx.createLinearGradient(0, safeTop + 44, 0, standH)
    sg.addColorStop(0, '#0c2e16'); sg.addColorStop(1, '#14472a')
    ctx.fillStyle = sg; ctx.fillRect(0, safeTop + 44, W, standH - safeTop - 44)
    // 观众点点
    for (var si = 0; si < 60; si++) {
      var sx = (si * 37 + 13) % W, sy = safeTop + 50 + (si * 23) % (standH - safeTop - 60)
      var sc = ['#ff6b6b','#4fc3f7','#fff176','#ce93d8','#fff'][si % 5]
      ctx.fillStyle = sc; ctx.globalAlpha = 0.25 + Math.sin(now/800 + si) * 0.1
      ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI*2); ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  // 草皮（整个球场区域）
  ctx.fillStyle = '#2a8c3e'; ctx.fillRect(0, standH, W, H - standH)
  // 草皮条纹
  var stripeH = (H - standH) / 6
  for (var sti = 0; sti < 6; sti++) {
    ctx.fillStyle = sti % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
    ctx.fillRect(0, standH + sti * stripeH, W, stripeH)
  }
  // 禁区线
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5
  ctx.strokeRect(goalL - 25, goalLineY - 5, goalW2 + 50, penaltySpotY - goalLineY + 30)
  // 小禁区
  var smallW = goalW2 * 0.5, smallH = (penaltySpotY - goalLineY) * 0.3
  ctx.strokeRect(cx - smallW/2, goalLineY - 5, smallW, smallH)
  // 罚球弧
  ctx.beginPath(); ctx.arc(cx, penaltySpotY, (penaltySpotY - goalLineY) * 0.35, Math.PI * 1.2, Math.PI * 1.8)
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.stroke()
  // 罚球点
  ctx.beginPath(); ctx.arc(cx, penaltySpotY, 4, 0, Math.PI*2)
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill()

  // 球门（大号，占屏幕上部）
  var goalH = 25
  render.drawGoal(ctx, goalL, goalLineY - goalH, goalW2, goalH, false)

  // AI守门员（在门线上）
  drawMiniPlayer(ctx, chlGKAIX, goalLineY + 5, PLAYER_R * 1.2, '#2ECC40', 1, false, false, true)

  // 球
  if (chlPhase === 'aim' || chlPhase === 'flying') {
    render.drawBall(ctx, chlBall.x, chlBall.y, PLAYER_R * 1.4, chlPhase === 'flying')
    // 飞行尾迹
    if (chlPhase === 'flying') {
      for (var ti = 1; ti <= 4; ti++) {
        ctx.beginPath(); ctx.arc(chlBall.x-chlBall.vx*ti*1.5, chlBall.y-chlBall.vy*ti*1.5, PLAYER_R*0.2*(1-ti/5), 0, Math.PI*2)
        ctx.fillStyle = 'rgba(255,200,50,'+(0.25*(1-ti/5))+')'; ctx.fill()
      }
    }
  }

  // 射手（站在球后面）
  if (chlPhase === 'aim') {
    drawMiniPlayer(ctx, cx, penaltySpotY + PLAYER_R * 3, PLAYER_R * 1.2, safeColor(myT.color), 9, true, false, false)

    // 摇杆瞄准线
    var jD4 = Math.sqrt(joystick.dx*joystick.dx + joystick.dy*joystick.dy)
    if (joystick.active && jD4 > 3) {
      var aLen = penaltySpotY - goalLineY
      var ax = cx + (joystick.dx / jD4) * aLen * 0.4
      var ay = penaltySpotY + (joystick.dy / jD4) * aLen
      ctx.beginPath(); ctx.moveTo(cx, penaltySpotY); ctx.lineTo(ax, ay)
      ctx.strokeStyle = 'rgba(255,215,0,0.5)'; ctx.lineWidth = 2; ctx.stroke()
      ctx.beginPath(); ctx.arc(ax, ay, 5, 0, Math.PI*2)
      ctx.fillStyle = 'rgba(255,215,0,0.6)'; ctx.fill()
    }

    // 射门按钮 + 蓄力
    var chlBtnX = W * 0.82, chlBtnY = penaltySpotY + PLAYER_R * 5, chlBtnR = 32
    ctx.beginPath(); ctx.arc(chlBtnX, chlBtnY, chlBtnR, 0, Math.PI * 2)
    ctx.fillStyle = shootBtnPressed ? 'rgba(255,215,0,0.6)' : 'rgba(255,215,0,0.3)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,215,0,0.7)'; ctx.lineWidth = 2.5; ctx.stroke()
    // 蓄力环
    if (shootBtnPressed && shootChargeStart > 0) {
      var chgPct2 = Math.min((now - shootChargeStart) / CHARGE_MAX_MS, 1)
      ctx.beginPath(); ctx.arc(chlBtnX, chlBtnY, chlBtnR + 4, -Math.PI/2, -Math.PI/2 + chgPct2 * Math.PI * 2)
      ctx.strokeStyle = chgPct2 > 0.8 ? '#ff4444' : '#ffd700'; ctx.lineWidth = 4; ctx.stroke()
      // 力量标签
      var pLabel = chgPct2 < 0.3 ? '轻' : chgPct2 < 0.7 ? '中' : '大力'
      var pColor = chgPct2 < 0.5 ? '#4CAF50' : chgPct2 < 0.8 ? '#FFD700' : '#FF5722'
      render.drawText(ctx, pLabel, chlBtnX, chlBtnY - chlBtnR - 12, (W*0.025)+'px sans-serif', pColor)
    }
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + (W*0.035) + 'px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('射门', chlBtnX, chlBtnY)

    // 摇杆（左下角）
    var chlJoyX = W * 0.18, chlJoyY = penaltySpotY + PLAYER_R * 5
    var jBaseX2 = joystick.active ? joystick.baseX : chlJoyX
    var jBaseY2 = joystick.active ? joystick.baseY : chlJoyY
    ctx.beginPath(); ctx.arc(jBaseX2, jBaseY2, JOY_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2; ctx.stroke()
    var cjx = jBaseX2, cjy = jBaseY2
    if (joystick.active) { cjx = joystick.stickX; cjy = joystick.stickY }
    ctx.beginPath(); ctx.arc(cjx, cjy, JOY_STICK_R, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill()

    // 提示文字
    if (!joystick.active && !shootBtnPressed) {
      render.drawText(ctx, '摇杆瞄准 · 按住射门蓄力', cx, H * 0.9, (W*0.028)+'px sans-serif', 'rgba(255,255,255,0.6)')
    }
  }

  // 粒子+飘字
  for (var pi = particles.length-1; pi >= 0; pi--) {
    var p2 = particles[pi]; var pAge = (now - p2.born) / 600
    if (pAge > 1) { particles.splice(pi, 1); continue }
    p2.x += p2.vx; p2.y += p2.vy; p2.vy += 0.1
    ctx.globalAlpha = 1 - pAge; ctx.beginPath(); ctx.arc(p2.x, p2.y, p2.size*(1-pAge*0.5), 0, Math.PI*2)
    ctx.fillStyle = p2.color; ctx.fill(); ctx.globalAlpha = 1
  }
  for (var fi = floats.length-1; fi >= 0; fi--) {
    var f2 = floats[fi]; var fAge = (now - f2.born) / 1500
    if (fAge > 1) { floats.splice(fi, 1); continue }
    ctx.globalAlpha = fAge < 0.7 ? 1 : (1-(fAge-0.7)/0.3)
    render.drawStrokeText(ctx, f2.text, f2.x, f2.y-fAge*50, 'bold '+(W*0.07)+'px sans-serif', f2.color, 'rgba(0,0,0,0.5)', 3)
    ctx.globalAlpha = 1
  }

  // HUD — 点球比分板（深绿色，与整体协调）
  ctx.fillStyle = '#0c2e16'; ctx.fillRect(0, 0, W, safeTop + 44)
  render.drawText(ctx, '⚽ 点球大战', cx, safeTop + 16, 'bold '+(W*0.035)+'px sans-serif', 'rgba(255,255,255,0.8)')
  // 5个球的状态圆点（根据实际每球结果）
  for (var ri = 0; ri < CHL_TOTAL; ri++) {
    var dotX2 = cx + (ri - 2) * 22
    var dotColor
    if (ri < chlResults.length) {
      dotColor = chlResults[ri] === 'goal' ? '#4CAF50' : '#ff6b6b'
    } else {
      dotColor = 'rgba(255,255,255,0.15)'
    }
    ctx.beginPath(); ctx.arc(dotX2, safeTop + 36, 6, 0, Math.PI*2)
    ctx.fillStyle = dotColor; ctx.fill()
    if (ri === chlRound && chlPhase !== 'done') {
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.stroke()
    }
  }

  // 准备提示
  if (chlPhase === 'ready') {
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, safeTop+44, W, H-safeTop-44)
    render.drawStrokeText(ctx, '第 '+(chlRound+1)+' 罚', cx, H*0.45, 'bold '+(W*0.1)+'px sans-serif', '#fff', 'rgba(0,0,0,0.5)', 4)
  }
  if (chlPhase === 'done') {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H)
    render.drawStrokeText(ctx, '点球完成!', cx, H*0.28, 'bold '+(W*0.07)+'px sans-serif', '#ffd700', 'rgba(0,0,0,0.5)', 3)

    // 显示5个球的实际结果
    var resultStr = ''
    for (var di = 0; di < CHL_TOTAL; di++) {
      if (di < chlResults.length) {
        resultStr += chlResults[di] === 'goal' ? '⚽' : '❌'
      } else { resultStr += '⬜' }
    }
    render.drawText(ctx, resultStr, cx, H*0.36, (W*0.08)+'px sans-serif', '#fff')
    render.drawText(ctx, '罚进 '+chlGoals+' / '+CHL_TOTAL+' 球', cx, H*0.43, 'bold '+(W*0.04)+'px sans-serif', '#fff')

    // 说明流程
    render.drawText(ctx, '分享给好友，让 TA 来扑救你的点球！', cx, H*0.52, (W*0.028)+'px sans-serif', 'rgba(255,255,255,0.5)')
    render.drawText(ctx, '好友扑完后，双方对比结果', cx, H*0.56, (W*0.025)+'px sans-serif', 'rgba(255,255,255,0.3)')

    // 分享按钮（主要CTA）
    var btnScale = 1 + Math.sin(Date.now()/400) * 0.02
    ctx.save(); ctx.translate(cx, H*0.65); ctx.scale(btnScale, btnScale); ctx.translate(-cx, -H*0.65)
    render.drawButton(ctx, cx-W*0.3, H*0.65-W*0.06, W*0.6, W*0.12, '📤 发送给好友扑救', ['#C62828','#E53935'])
    ctx.restore()

    render.drawText(ctx, '返回首页', cx, H*0.82, (W*0.026)+'px sans-serif', 'rgba(255,255,255,0.4)')
  }
}

// ==================== 点球大战 · 扑救 ====================
function initChlDefend(data) {
  chlData = data; chlSaves = 0; chlRound = 0; chlRole = 'defend'; chlDefResults = []
  chlPhase = 'ready'; chlTimer = Date.now()
  chlGKX = W / 2
  // 防守视角（真实比例）
  goalW2 = W * 0.45
  var penaltyDist2 = goalW2 * 1.5
  goalLineY = H * 0.78
  penaltySpotY = goalLineY - penaltyDist2
  goalL = W / 2 - goalW2 / 2; goalR = W / 2 + goalW2 / 2
  particles = []; floats = []
  scene = 'chlDefend'
}

function updateChlDefend(dt) {
  var now = Date.now(), dtF = dt / 16
  if (chlPhase === 'ready') {
    if (now - chlTimer > 1500) {
      chlPhase = 'incoming'
      if (!chlData || !chlData.shots || !chlData.shots[chlRound]) { chlPhase = 'done'; return }
      var shot = chlData.shots[chlRound]
      // 把进攻方的射门轨迹翻转为从上往下飞
      chlBall.x = W - shot.sx  // 镜像X
      chlBall.y = penaltySpotY
      chlBall.vx = -shot.vx * 1.0  // 镜像
      chlBall.vy = Math.abs(shot.vy) * 1.0  // 改为向下飞（保持原始球速）
      chlTimer = now
    }
    return
  }
  if (chlPhase === 'incoming') {
    chlBall.x += chlBall.vx * dtF
    chlBall.y += chlBall.vy * dtF

    // 守门员摇杆控制
    if (joystick.active) {
      var gkSpeed = (2.8 + getStatValue('def') * 0.3) * dtF
      var gkPct = Math.min(Math.abs(joystick.dx) / JOY_RADIUS, 1.0)
      var gkMv = (joystick.dx > 0 ? 1 : -1) * gkSpeed * gkPct
      if (Math.abs(joystick.dx) > 3) chlGKX += gkMv
      chlGKX = clamp(chlGKX, goalL + 10, goalR - 10)
    }

    // 球到达门线
    if (chlBall.y > goalLineY - 10) {
      var inGoal = chlBall.x > goalL + 5 && chlBall.x < goalR - 5
      var saved = Math.abs(chlBall.x - chlGKX) < PLAYER_R * (1.5 + getStatValue('def') * 0.2)
      if (inGoal && saved) {
        chlSaves++; chlDefResults.push('save')
        floats.push({ x:W/2, y:H*0.55, text:'扑救成功!', color:'#4CAF50', born:now })
        audio.playCheer()
      } else if (inGoal) {
        chlDefResults.push('fail')
        floats.push({ x:W/2, y:H*0.55, text:'失球...', color:'#ff6b6b', born:now })
        audio.playMiss()
      } else {
        chlSaves++; chlDefResults.push('save')
        floats.push({ x:W/2, y:H*0.55, text:'对手打偏!', color:'#4CAF50', born:now })
      }
      chlPhase = 'result'; chlTimer = now
    }
    if (chlBall.x < -20 || chlBall.x > W + 20 || chlBall.y > H + 20) {
      chlSaves++; chlDefResults.push('save')
      floats.push({ x: W/2, y: H*0.5, text:'对手打偏!', color:'#4CAF50', born: now })
      chlPhase = 'result'; chlTimer = now
    }
    return
  }
  if (chlPhase === 'result') {
    if (now - chlTimer > 1200) {
      chlRound++
      if (chlRound >= CHL_TOTAL) {
        chlPhase = 'done'
        submitChlDefense()
      } else {
        chlPhase = 'ready'; chlTimer = now
      }
    }
  }
}

function submitChlDefense() {
  var mt = getMyTeam(); var teamLabel = mt.emoji ? mt.emoji + mt.city : ''
  try {
    wx.cloud.callFunction({
      name: 'challenge',
      data: {
        action: 'respond',
        challengeId: chlData._id,
        nickname: D.nickname || '匿名球员',
        team: teamLabel,
        saves: chlSaves
      },
      success: function(res) {
        if (res.result && res.result.code === 0) {
          chlResultData = res.result.data
        }
      }
    })
  } catch(e) {}
  scene = 'chlResult'
}

function drawChlDefend() {
  ctx.fillStyle = '#1a5c2e'; ctx.fillRect(0, 0, W, H)
  var cx = W / 2, now = Date.now()
  var myT = getMyTeam()

  // 草皮（整个球场区域）
  ctx.fillStyle = '#2a8c3e'; ctx.fillRect(0, safeTop + 44, W, H - safeTop - 44)
  // 草皮条纹
  var stripeH2 = (goalLineY - safeTop - 44) / 5
  for (var sti2 = 0; sti2 < 5; sti2++) {
    ctx.fillStyle = sti2 % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
    ctx.fillRect(0, safeTop + 44 + sti2 * stripeH2, W, stripeH2)
  }
  // 看台（底部，深绿色调）
  var standTop = goalLineY + 40
  if (standTop < H) {
    var sg2 = ctx.createLinearGradient(0, standTop, 0, H)
    sg2.addColorStop(0, '#14472a'); sg2.addColorStop(1, '#0c2e16')
    ctx.fillStyle = sg2; ctx.fillRect(0, standTop, W, H - standTop)
    for (var si2 = 0; si2 < 40; si2++) {
      var sx2 = (si2 * 37 + 13) % W, sy2 = standTop + 10 + (si2 * 19) % (H - standTop - 20)
      var sc2 = ['#ff6b6b','#4fc3f7','#fff176','#ce93d8','#fff'][si2 % 5]
      ctx.fillStyle = sc2; ctx.globalAlpha = 0.25 + Math.sin(now/800 + si2) * 0.1
      ctx.beginPath(); ctx.arc(sx2, sy2, 2, 0, Math.PI*2); ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  // 禁区线
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5
  ctx.strokeRect(goalL - 20, penaltySpotY - 20, goalW2 + 40, goalLineY - penaltySpotY + 40)

  // 对手射手（上方）
  drawMiniPlayer(ctx, cx, penaltySpotY - PLAYER_R, PLAYER_R * 1.2, '#E53935', 9, false, false, false)

  // 球（从上方飞来）
  if (chlPhase === 'incoming') {
    render.drawBall(ctx, chlBall.x, chlBall.y, PLAYER_R * 1.4, true)
    // 来球轨迹
    for (var ti = 1; ti <= 3; ti++) {
      ctx.beginPath(); ctx.arc(chlBall.x-chlBall.vx*ti, chlBall.y-chlBall.vy*ti, PLAYER_R*0.15*(1-ti/4), 0, Math.PI*2)
      ctx.fillStyle = 'rgba(255,100,50,'+(0.2*(1-ti/4))+')'; ctx.fill()
    }
  }

  // 球门（下方大号）
  var goalH = 25
  render.drawGoal(ctx, goalL, goalLineY, goalW2, goalH, true)

  // 守门员（你控制）
  drawMiniPlayer(ctx, chlGKX, goalLineY - 5, PLAYER_R * 1.3, safeColor(myT.color), 1, true, false, true)

  // 摇杆控制守门员
  var defJoyX = W * 0.18, defJoyY = goalLineY + 60
  var djbx = joystick.active ? joystick.baseX : defJoyX
  var djby = joystick.active ? joystick.baseY : defJoyY
  ctx.beginPath(); ctx.arc(djbx, djby, JOY_RADIUS, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2; ctx.stroke()
  var dsjx = djbx, dsjy = djby
  if (joystick.active) { dsjx = joystick.stickX; dsjy = joystick.stickY }
  ctx.beginPath(); ctx.arc(dsjx, dsjy, JOY_STICK_R, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill()
  render.drawText(ctx, '← 摇杆控制守门员 →', cx, goalLineY + 50, (W*0.03)+'px sans-serif', 'rgba(255,255,255,0.6)')

  // 飘字
  for (var fi = floats.length-1; fi >= 0; fi--) {
    var f2 = floats[fi]; var fAge = (now - f2.born) / 1500
    if (fAge > 1) { floats.splice(fi, 1); continue }
    ctx.globalAlpha = fAge < 0.7 ? 1 : (1-(fAge-0.7)/0.3)
    render.drawStrokeText(ctx, f2.text, f2.x, f2.y-fAge*40, 'bold '+(W*0.07)+'px sans-serif', f2.color, 'rgba(0,0,0,0.5)', 3)
    ctx.globalAlpha = 1
  }

  // HUD — 点球比分板（深绿色，与整体协调）
  ctx.fillStyle = '#0c2e16'; ctx.fillRect(0, 0, W, safeTop + 44)
  render.drawText(ctx, '🧤 扑救挑战', cx, safeTop + 16, 'bold '+(W*0.035)+'px sans-serif', 'rgba(255,255,255,0.8)')
  render.drawText(ctx, 'vs ' + (chlData.attackerNickname || '对手'), cx, safeTop + 36, (W*0.025)+'px sans-serif', 'rgba(255,255,255,0.5)')
  // 5个球的状态
  for (var ri = 0; ri < CHL_TOTAL; ri++) {
    var dotX2 = cx + (ri - 2) * 22
    var dotColor
    if (ri < chlDefResults.length) {
      dotColor = chlDefResults[ri] === 'save' ? '#4CAF50' : '#ff6b6b'
    } else {
      dotColor = 'rgba(255,255,255,0.15)'
    }
    ctx.beginPath(); ctx.arc(dotX2, safeTop + 50, 5, 0, Math.PI*2)
    ctx.fillStyle = dotColor; ctx.fill()
  }

  if (chlPhase === 'ready') {
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, safeTop+55, W, H-safeTop-55)
    render.drawStrokeText(ctx, '第 '+(chlRound+1)+' 罚', cx, H*0.4, 'bold '+(W*0.1)+'px sans-serif', '#fff', 'rgba(0,0,0,0.5)', 4)
    render.drawText(ctx, '准备扑救...', cx, H*0.5, (W*0.035)+'px sans-serif', 'rgba(255,255,255,0.4)')
  }
  if (chlPhase === 'done') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H)
    render.drawStrokeText(ctx, '扑救完成!', cx, H*0.35, 'bold '+(W*0.07)+'px sans-serif', '#4CAF50', 'rgba(0,0,0,0.5)', 3)
    render.drawText(ctx, '扑救 '+chlSaves+'/'+CHL_TOTAL, cx, H*0.45, 'bold '+(W*0.05)+'px sans-serif', '#fff')
    render.drawButton(ctx, cx-W*0.25, H*0.55, W*0.5, W*0.11, '查看结果', ['#2E7D32','#4CAF50'])
  }
}

// ==================== 点球大战 · 结果 ====================
function drawChlResult() {
  var t = Date.now() / 1000
  // 深绿背景
  var bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0c2e16'); bg.addColorStop(1, '#081a0e')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
  var cx = W / 2, st = safeTop

  render.drawText(ctx, '⚽ 点球大战', cx, st + H*0.05, 'bold '+(W*0.045)+'px sans-serif', 'rgba(255,255,255,0.8)')

  if (chlRole === 'attack') {
    // 进攻方结果（AI防守）
    render.drawText(ctx, '你的射门成绩（AI守门员防守）', cx, st + H*0.13, (W*0.028)+'px sans-serif', 'rgba(255,255,255,0.6)')

    // 比分卡片
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    render.roundRect(ctx, W*0.15, st + H*0.17, W*0.7, H*0.12, 12); ctx.fill()
    render.drawStrokeText(ctx, chlGoals + ' / ' + CHL_TOTAL, cx, st + H*0.23, 'bold '+(W*0.1)+'px sans-serif', '#fff', 'rgba(0,0,0,0.3)', 3)
    render.drawText(ctx, '突破AI守门员，罚进 ' + chlGoals + ' 球', cx, st + H*0.295, (W*0.024)+'px sans-serif', 'rgba(255,255,255,0.5)')

    // 5球详情
    for (var bi = 0; bi < CHL_TOTAL; bi++) {
      var dotX = cx + (bi - 2) * 28
      ctx.beginPath(); ctx.arc(dotX, st + H*0.34, 8, 0, Math.PI*2)
      ctx.fillStyle = bi < chlGoals ? '#4CAF50' : '#555'; ctx.fill()
      render.drawText(ctx, bi < chlGoals ? '⚽' : '✕', dotX, st + H*0.34, (W*0.03)+'px sans-serif', bi < chlGoals ? '#fff' : '#888')
    }

    // 流程说明
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    render.roundRect(ctx, W*0.1, st + H*0.40, W*0.8, H*0.17, 10); ctx.fill()
    render.drawText(ctx, '挑战好友', cx, st + H*0.43, 'bold '+(W*0.03)+'px sans-serif', 'rgba(255,255,255,0.7)')
    render.drawText(ctx, '你刚才罚的这5个球会原样发给好友', cx, st + H*0.47, (W*0.024)+'px sans-serif', 'rgba(255,255,255,0.5)')
    render.drawText(ctx, '好友来当守门员扑救，看谁更厉害！', cx, st + H*0.50, (W*0.024)+'px sans-serif', 'rgba(255,255,255,0.5)')
    render.drawText(ctx, '（好友用真人操控守门员，比AI更强哦）', cx, st + H*0.53, (W*0.022)+'px sans-serif', 'rgba(255,255,255,0.35)')

    var btnScale = 1 + Math.sin(t * 3) * 0.015
    ctx.save(); ctx.translate(cx, st + H*0.62); ctx.scale(btnScale, btnScale); ctx.translate(-cx, -(st + H*0.62))
    render.drawButton(ctx, cx - W*0.3, st + H*0.62 - W*0.06, W*0.6, W*0.12, '📤 发给好友来扑救', ['#C62828','#E53935'])
    ctx.restore()

  } else {
    // 防守方：完整对比
    var atkName = chlData ? (chlData.attackerNickname || '对手') : '对手'
    var atkTeam = chlData ? (chlData.team || '') : ''
    var atkGoals = chlData ? (chlData.goalsScored || 0) : 0

    // 射手卡片
    ctx.fillStyle = 'rgba(229,57,53,0.1)'
    render.roundRect(ctx, W*0.08, st + H*0.11, W*0.84, H*0.13, 10); ctx.fill()
    render.drawText(ctx, '⚽ 射手 · ' + atkName, cx, st + H*0.14, 'bold '+(W*0.028)+'px sans-serif', '#ef9a9a')
    for (var ai = 0; ai < CHL_TOTAL; ai++) {
      var adx = cx + (ai - 2) * 28
      ctx.beginPath(); ctx.arc(adx, st + H*0.19, 7, 0, Math.PI*2)
      ctx.fillStyle = ai < atkGoals ? '#E53935' : '#444'; ctx.fill()
    }
    render.drawText(ctx, '罚进 ' + atkGoals + ' 球', cx, st + H*0.23, (W*0.024)+'px sans-serif', 'rgba(255,255,255,0.5)')

    // VS
    render.drawText(ctx, 'VS', cx, st + H*0.28, 'bold '+(W*0.04)+'px sans-serif', 'rgba(255,255,255,0.3)')

    // 守门员卡片
    ctx.fillStyle = 'rgba(76,175,80,0.1)'
    render.roundRect(ctx, W*0.08, st + H*0.31, W*0.84, H*0.13, 10); ctx.fill()
    render.drawText(ctx, '🧤 守门员 · ' + (D.nickname || '我'), cx, st + H*0.34, 'bold '+(W*0.028)+'px sans-serif', '#a5d6a7')
    for (var di2 = 0; di2 < CHL_TOTAL; di2++) {
      var ddx = cx + (di2 - 2) * 28
      var isSave = di2 < chlDefResults.length && chlDefResults[di2] === 'save'
      ctx.beginPath(); ctx.arc(ddx, st + H*0.39, 7, 0, Math.PI*2)
      ctx.fillStyle = isSave ? '#4CAF50' : (di2 < chlDefResults.length ? '#444' : '#333'); ctx.fill()
    }
    render.drawText(ctx, '扑出 ' + chlSaves + ' 球', cx, st + H*0.43, (W*0.024)+'px sans-serif', 'rgba(255,255,255,0.5)')

    // 结果
    var defWin = chlSaves >= atkGoals
    var resultText = defWin ? '守门员获胜' : '射手获胜'
    var resultColor = defWin ? '#a5d6a7' : '#ef9a9a'
    var resultDesc = defWin
      ? '扑出 ' + chlSaves + ' 球，成功化解' + atkName + '的点球！'
      : atkName + '罚进 ' + atkGoals + ' 球，射门太强了！'

    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    render.roundRect(ctx, W*0.1, st + H*0.48, W*0.8, H*0.1, 10); ctx.fill()
    render.drawText(ctx, resultText, cx, st + H*0.51, 'bold '+(W*0.04)+'px sans-serif', resultColor)
    render.drawText(ctx, resultDesc, cx, st + H*0.56, (W*0.023)+'px sans-serif', 'rgba(255,255,255,0.5)')

    render.drawButton(ctx, cx - W*0.25, st + H*0.66, W*0.5, W*0.1, '📤 分享结果', ['#555','#666'])
    render.drawButton(ctx, cx - W*0.25, st + H*0.76, W*0.5, W*0.1, '⚽ 换我来射', ['#2E7D32','#4CAF50'])
  }

  render.drawText(ctx, '返回首页', cx, H*0.92, (W*0.026)+'px sans-serif', 'rgba(255,255,255,0.4)')
}

// ==================== 触摸处理 ====================
var lastSwipeTime = 0

wx.onTouchStart(function(e) {
  var touch = e.touches[0]
  touchDown = true; touchX = touch.clientX; touchY = touch.clientY
  touchStartX = touch.clientX; touchStartY = touch.clientY
  playerGrabbed = false // 每次触摸重置

  var tx = touch.clientX, ty = touch.clientY
  var cx = W / 2
  var bw = W * 0.65, bh = W * 0.12, bx = cx - bw / 2

  if (scene === 'home') {
    var mainBtnY = H * 0.40, mainBW = W * 0.75, mainBH = W * 0.15
    // 苏超联赛（大按钮）
    if (render.hitTest(tx, ty, cx - mainBW / 2, mainBtnY, mainBW, mainBH)) {
      if (D.teamIdx < 0) { teamSelectMode = 'league'; scene = 'teamSelect'; return }
      if (!D.nickname) { askNickname(function(){ scene = 'leagueMap' }); return }
      scene = 'leagueMap'; return
    }
    // 底部按钮（动态数量）
    var sBtnW = W * 0.28, sBtnH = W * 0.11, sBtnY = H * 0.62, sBtnGap = 8
    var now3 = new Date(), wcOpen2 = (now3.getFullYear() === 2026 && now3.getMonth() >= 5 && now3.getMonth() <= 6)
    var sActions = []
    if (wcOpen2) sActions.push('wc')
    sActions.push('pk'); sActions.push('train')
    var totalSW = sActions.length * sBtnW + (sActions.length - 1) * sBtnGap
    var sStartX = cx - totalSW / 2
    for (var si2 = 0; si2 < sActions.length; si2++) {
      if (render.hitTest(tx, ty, sStartX + si2 * (sBtnW + sBtnGap), sBtnY, sBtnW, sBtnH)) {
        if (sActions[si2] === 'wc') {
          if (D.wcTeamIdx < 0) { teamSelectMode = 'wc'; scene = 'teamSelect'; return }
          scene = 'wcMap'; return
        } else if (sActions[si2] === 'pk') {
          if (D.teamIdx < 0) { teamSelectMode = 'league'; scene = 'teamSelect'; return }
          if (!D.nickname) { askNickname(function(){ initChlAttack() }); return }
          initChlAttack(); return
        } else if (sActions[si2] === 'train') {
          if (D.teamIdx < 0) { teamSelectMode = 'league'; scene = 'teamSelect'; return }
          scene = 'training'; return
        }
      }
    }
    // 换队（战队信息旁边的🔄按钮）
    var infoY2 = safeTop + H * 0.24
    if (tx > cx + W * 0.1 && ty > infoY2 - 15 && ty < infoY2 + 15) { teamSelectMode = 'league'; scene = 'teamSelect'; return }
    // 未选队时点击"选择战队"
    if (D.teamIdx < 0 && ty > infoY2 - 15 && ty < infoY2 + 15) { teamSelectMode = 'league'; scene = 'teamSelect'; return }
    // 昵称
    if (!D.nickname && ty > H * 0.24 && ty < H * 0.34) { askNickname(null); return }
  } else if (scene === 'teamSelect') {
    if (tx < W * 0.25 && ty < safeTop + 50) { scene = 'home'; return }
    var isWC = teamSelectMode === 'wc'
    var pool = isWC ? WC_TEAMS : TEAMS
    var cols = isWC ? 4 : 3
    var cellW = W / cols, cellH = isWC ? 68 : 76
    var gridTop = safeTop + 66 + 8, badgeR = isWC ? 18 : 22
    for (var i = 0; i < pool.length; i++) {
      var row = Math.floor(i / cols), col = i % cols
      var tbx = cellW * col + cellW / 2, tby = gridTop + row * cellH
      if (Math.sqrt(Math.pow(tx - tbx, 2) + Math.pow(ty - tby, 2)) < badgeR + 15) {
        if (isWC) { D.wcTeamIdx = i; saveField('wcTeamIdx', D.wcTeamIdx) }
        else { D.teamIdx = i; saveField('teamIdx', D.teamIdx); LEAGUE_SCHEDULE = buildLeagueSchedule() }
        return
      }
    }
    // 确认按钮
    var selIdx = isWC ? D.wcTeamIdx : D.teamIdx
    var btnW2 = W * 0.5, btnH2 = W * 0.1, btnY2 = H - 46
    if (selIdx >= 0 && render.hitTest(tx, ty, cx - btnW2 / 2, btnY2, btnW2, btnH2)) {
      // 确认后跳转到对应地图
      if (isWC) { scene = 'wcMap' } else { scene = 'home' }
      return
    }
  } else if (scene === 'training') {
    if (tx < W * 0.25 && ty < safeTop + 50) { scene = 'home'; return }
    // 升级按钮
    var statKeys = ['atk', 'spd', 'def']
    var cardY = safeTop + 120, cardH = 90
    for (var si = 0; si < 3; si++) {
      var lv = D.stats[statKeys[si]] || 1
      if (lv >= 5) continue
      var cost = lv * 30 + 20
      var ubw = W * 0.18, ubh = 28
      var ubx = W * 0.78 - ubw / 2, uby = cardY + si * (cardH + 12) + 30
      if (render.hitTest(tx, ty, ubx, uby, ubw, ubh)) {
        if (D.coins >= cost) {
          D.stats[statKeys[si]]++; D.coins -= cost
          saveField('stats', D.stats); saveField('coins', D.coins)
        } else {
          // 金币不足，看广告赚15金币
          ad.showRewardedVideo(function(completed) {
            if (completed) { D.coins += 15; saveField('coins', D.coins) }
          })
        }
        return
      }
    }
  } else if (scene === 'leagueMap') {
    if (tx < W * 0.25 && ty < safeTop + 50) { scene = 'home'; return }
    var progress = D.leagueWins.length
    // 按钮区域覆盖下半屏（按钮位置动态，用宽松检测）
    if (progress < LEAGUE_SCHEDULE.length) {
      if (ty > H * 0.55 && render.hitTest(tx, ty, cx - W * 0.3, ty - 5, W * 0.6, W * 0.12)) {
        startLeagueMatch(progress); return
      }
    } else {
      if (ty > H * 0.6 && ty < H * 0.85) {
        D.leagueWins = []; saveField('leagueWins', D.leagueWins)
        wx.removeStorageSync('koOpponents'); return
      }
    }
  } else if (scene === 'wcMap') {
    if (tx < W * 0.25 && ty < safeTop + 50) { scene = 'home'; return }
    if (D.leagueWins.length < 6) return
    var progress = D.wcWins.length
    var nodeY = safeTop + 70, nodeH = 64
    var btnY4 = nodeY + WC_SCHEDULE.length * nodeH + 10
    if (progress < WC_SCHEDULE.length) {
      if (render.hitTest(tx, ty, cx - W * 0.25, btnY4, W * 0.5, W * 0.11)) {
        startWCMatch(progress); return
      }
    } else {
      if (render.hitTest(tx, ty, cx - W * 0.25, btnY4 + 40, W * 0.5, W * 0.11)) {
        D.wcWins = []; saveField('wcWins', D.wcWins); return
      }
    }
  } else if (scene === 'match') {
    if (matchCountdown <= 0 && guideStep <= 0) {
      // 多点触控：遍历所有新触点
      for (var ti = 0; ti < e.changedTouches.length; ti++) {
        var ct = e.changedTouches[ti]
        var ttx = ct.clientX, tty = ct.clientY, tid = ct.identifier
        // 射门按钮（按下开始蓄力）
        if (Math.sqrt(Math.pow(ttx-BTN_SHOOT.x,2)+Math.pow(tty-BTN_SHOOT.y,2)) < BTN_SHOOT.r + 10) {
          shootBtnPressed = true; shootBtnTouchId = tid
          shootChargeStart = Date.now()
          continue
        }
        // 传球按钮（按下开始蓄力）
        if (Math.sqrt(Math.pow(ttx-BTN_PASS.x,2)+Math.pow(tty-BTN_PASS.y,2)) < BTN_PASS.r + 10) {
          passBtnPressed = true; passBtnTouchId = tid
          passChargeStart = Date.now()
          continue
        }
        // 切换按钮
        if (Math.sqrt(Math.pow(ttx-BTN_SWITCH.x,2)+Math.pow(tty-BTN_SWITCH.y,2)) < BTN_SWITCH.r + 10) {
          switchBtnPressed = true; switchBtnTouchId = tid
          switchToNearest()
          continue
        }
        // 左半屏：摇杆
        if (ttx < W * 0.5 && !joystick.active) {
          joystick.active = true; joystick.touchId = tid
          joystick.baseX = ttx; joystick.baseY = tty
          joystick.stickX = ttx; joystick.stickY = tty
          joystick.dx = 0; joystick.dy = 0
          continue
        }
        // 点击球场上的我方球员切换控制权
        for (var pi = 0; pi < gkIdx(); pi++) {
          if (pi === ctrlIdx) continue
          if (dist2({x:ttx, y:tty}, myTeam[pi]) < PLAYER_R * 3) {
            setCtrl(pi)
            floats.push({ x: myTeam[pi].x, y: myTeam[pi].y - 20, text: '切换#' + myTeam[pi].num, color: '#ffd700', born: Date.now() })
            break
          }
        }
      }
      return
    }
    // 新手引导
    if (guideStep > 0) {
      if (guideStep === 1) { guideStep = 2; guideTimer = 0; return }
      else if (guideStep === 2) {
        guideStep = 0; hasPlayedBefore = true
        wx.setStorageSync('hasPlayed', true)
        return
      }
    }
  } else if (scene === 'prematch') {
    // 开球
    if (render.hitTest(tx, ty, cx - W * 0.25, H * 0.76, W * 0.5, W * 0.1)) {
      scene = 'match'; initMatch(); return
    }
    if (ty > H * 0.83) { scene = matchMode === 'league' ? 'leagueMap' : 'wcMap'; return }
  } else if (scene === 'matchResult') {
    var bw2 = W * 0.5, bh2 = W * 0.11
    var schedule = matchMode === 'league' ? LEAGUE_SCHEDULE : WC_SCHEDULE
    var progress = matchMode === 'league' ? D.leagueWins.length : D.wcWins.length

    // 激励视频：双倍金币点击
    if (!adDoubleUsed) {
      var isWinAd = myGoals > opGoals
      var adReward = isWinAd ? (myGoals * 5 + 15) : 5
      var adBtnW2 = W * 0.45, adBtnH2 = W * 0.09
      var adBtnX2 = cx - adBtnW2 / 2, adBtnY2 = safeTop + H * 0.56 + 14
      if (render.hitTest(tx, ty, adBtnX2, adBtnY2, adBtnW2, adBtnH2)) {
        ad.showRewardedVideo(function(completed) {
          if (completed) {
            adDoubleUsed = true
            D.coins += adReward; saveField('coins', D.coins)
          }
        })
        return
      }
    }

    // 失败重来
    var isWinOrDraw = myGoals >= opGoals
    var lSched = matchMode === 'league' ? LEAGUE_SCHEDULE[matchIdx] : null
    var needRetry2 = false
    if (matchMode === 'wc' && !isWinOrDraw) needRetry2 = true
    else if (matchMode === 'league' && lSched) {
      if (lSched.leg === 2) {
        var l1R = D.leagueWins[matchIdx - 1]
        var aM = (l1R ? l1R.myGoals : 0) + myGoals
        var aO = (l1R ? l1R.opGoals : 0) + opGoals
        if (aM < aO) needRetry2 = true
      } else if (lSched.leg === 1) {
        needRetry2 = false // 第一回合不需要重赛
      } else {
        if (myGoals < opGoals) needRetry2 = true
      }
    }
    if (needRetry2) {
      if (render.hitTest(tx, ty, cx - bw2 / 2, H * 0.72, bw2, bh2)) {
        ad.hideBanner()
        if (matchMode === 'league') {
          // 两回合淘汰赛失败：回退到第一回合重赛
          if (lSched && lSched.leg === 2) {
            D.leagueWins.pop(); saveField('leagueWins', D.leagueWins) // 删掉第一回合记录
            startLeagueMatch(matchIdx - 1)
          } else {
            startLeagueMatch(matchIdx)
          }
        } else startWCMatch(matchIdx)
        return
      }
    } else if (progress < schedule.length) {
      // 下一场
      if (render.hitTest(tx, ty, cx - bw2 / 2, H * 0.70, bw2, bh2)) {
        ad.hideBanner()
        if (matchMode === 'league') startLeagueMatch(progress)
        else startWCMatch(progress)
        return
      }
    }
    // 分享
    if (render.hitTest(tx, ty, cx - bw2 / 2, H * 0.82, bw2, bh2)) { shareGame(); return }
    // 返回
    if (ty > H * 0.90) { ad.hideBanner(); scene = 'home'; return }
  } else if (scene === 'chlAttack' && chlPhase === 'aim') {
    // 点球：摇杆 + 射门按钮
    for (var cti = 0; cti < e.changedTouches.length; cti++) {
      var cct = e.changedTouches[cti]
      var cttx = cct.clientX, ctty = cct.clientY, ctid = cct.identifier
      // 射门按钮（蓄力开始）
      var chlBtnX2 = W * 0.82, chlBtnY2 = penaltySpotY + PLAYER_R * 5
      if (Math.sqrt(Math.pow(cttx-chlBtnX2,2)+Math.pow(ctty-chlBtnY2,2)) < 42) {
        shootBtnPressed = true; shootBtnTouchId = ctid; shootChargeStart = Date.now()
        continue
      }
      // 摇杆
      if (cttx < W * 0.5 && !joystick.active) {
        joystick.active = true; joystick.touchId = ctid
        joystick.baseX = cttx; joystick.baseY = ctty
        joystick.stickX = cttx; joystick.stickY = ctty
        joystick.dx = 0; joystick.dy = 0
        continue
      }
    }
    return
  } else if (scene === 'chlAttack' && chlPhase === 'done') {
    // 分享按钮（大号）
    if (render.hitTest(tx, ty, cx - W*0.3, H*0.65-W*0.06, W*0.6, W*0.12)) {
      shareChallengeAttack(); return
    }
    // 返回首页
    if (ty > H * 0.79) { scene = 'home'; return }
  } else if (scene === 'chlDefend' && (chlPhase === 'ready' || chlPhase === 'incoming')) {
    // 扑救：摇杆控制守门员
    for (var dti = 0; dti < e.changedTouches.length; dti++) {
      var dct = e.changedTouches[dti]
      if (!joystick.active) {
        joystick.active = true; joystick.touchId = dct.identifier
        joystick.baseX = dct.clientX; joystick.baseY = dct.clientY
        joystick.stickX = dct.clientX; joystick.stickY = dct.clientY
        joystick.dx = 0; joystick.dy = 0
        break
      }
    }
    return
  } else if (scene === 'chlDefend' && chlPhase === 'done') {
    if (render.hitTest(tx, ty, cx - W*0.25, H*0.55, W*0.5, W*0.11)) {
      scene = 'chlResult'; return
    }
  } else if (scene === 'chlResult') {
    var st2 = safeTop
    if (chlRole === 'attack') {
      // 发给好友
      if (render.hitTest(tx, ty, cx - W*0.3, st2 + H*0.62 - W*0.06, W*0.6, W*0.12)) {
        shareChallengeAttack(); return
      }
    } else {
      // 分享结果
      if (render.hitTest(tx, ty, cx - W*0.25, st2 + H*0.66, W*0.5, W*0.1)) {
        shareChallengeResult(); return
      }
      // 换我来射
      if (render.hitTest(tx, ty, cx - W*0.25, st2 + H*0.76, W*0.5, W*0.1)) {
        initChlAttack(); return
      }
    }
    if (ty > H * 0.89) { scene = 'home'; return }
  }
})

wx.onTouchMove(function(e) {
  if (!touchDown) return
  var touch = e.touches[0]
  touchX = touch.clientX; touchY = touch.clientY
  // 摇杆跟踪
  if ((scene === 'match' || scene === 'chlAttack' || scene === 'chlDefend') && joystick.active) {
    for (var ti = 0; ti < e.changedTouches.length; ti++) {
      var ct = e.changedTouches[ti]
      if (ct.identifier === joystick.touchId) {
        var jdx = ct.clientX - joystick.baseX, jdy = ct.clientY - joystick.baseY
        var jd = Math.sqrt(jdx * jdx + jdy * jdy)
        if (jd > JOY_RADIUS) { jdx = jdx / jd * JOY_RADIUS; jdy = jdy / jd * JOY_RADIUS }
        joystick.dx = jdx; joystick.dy = jdy
        joystick.stickX = joystick.baseX + jdx; joystick.stickY = joystick.baseY + jdy
        break
      }
    }
  }
})

wx.onTouchEnd(function(e) {
  // 多点触控：只有所有手指都抬起才算touchDown=false
  if (e.touches.length === 0) { touchDown = false; playerGrabbed = false }
  else { touchDown = true }

  var dx = touchX - touchStartX, dy = touchY - touchStartY
  var dist = Math.sqrt(dx * dx + dy * dy)
  var now = Date.now()

  // 摇杆 / 按钮释放（match模式，点球模式有自己的处理）
  if (scene === 'match') {
    for (var ti = 0; ti < e.changedTouches.length; ti++) {
      var ct = e.changedTouches[ti]
      if (ct.identifier === joystick.touchId) {
        joystick.active = false; joystick.touchId = -1
        joystick.dx = 0; joystick.dy = 0
      }
      if (ct.identifier === shootBtnTouchId) {
        // 松开射门：根据蓄力时间计算力度
        if (ball.side==='my'&&ball.idx===ctrlIdx) {
          var chgT = Math.min(Date.now() - shootChargeStart, CHARGE_MAX_MS)
          var power = 0.7 + (chgT / CHARGE_MAX_MS) * 0.8 // 0.7 ~ 1.5
          var jD2=Math.sqrt(joystick.dx*joystick.dx+joystick.dy*joystick.dy)
          if (jD2>3) { myShoot(joystick.dx*0.35, -Math.abs(joystick.dy)*0.35-5, power) }
          else { myShoot(0, -1, power) }
        }
        shootBtnPressed = false; shootBtnTouchId = -1; shootChargeStart = 0
      }
      if (ct.identifier === passBtnTouchId) {
        // 松开传球：根据蓄力时间计算力度
        if (ball.side==='my'&&ball.idx===ctrlIdx) {
          var chgTP = Math.min(Date.now() - passChargeStart, CHARGE_MAX_MS)
          var powerP = 0.7 + (chgTP / CHARGE_MAX_MS) * 0.8
          var jD3=Math.sqrt(joystick.dx*joystick.dx+joystick.dy*joystick.dy)
          if (jD3>3) { myPass(joystick.dx, joystick.dy, powerP) }
          else { myPass(0, -1, powerP) }
        }
        passBtnPressed = false; passBtnTouchId = -1; passChargeStart = 0
      }
      if (ct.identifier === switchBtnTouchId) { switchBtnPressed = false; switchBtnTouchId = -1 }
    }
  }

  // 点球射门（蓄力释放）
  if (scene === 'chlAttack' && chlPhase === 'aim') {
    for (var cti2 = 0; cti2 < e.changedTouches.length; cti2++) {
      var cct2 = e.changedTouches[cti2]
      if (cct2.identifier === shootBtnTouchId) {
        var chgTC = Math.min(Date.now() - shootChargeStart, CHARGE_MAX_MS)
        var pwC = 0.7 + (chgTC / CHARGE_MAX_MS) * 0.8
        var jD5 = Math.sqrt(joystick.dx*joystick.dx + joystick.dy*joystick.dy)
        if (jD5 > 3) { chlShoot(joystick.dx*0.35, -Math.abs(joystick.dy)*0.35-5, pwC) }
        else { chlShoot(0, -1, pwC) }
        shootBtnPressed = false; shootBtnTouchId = -1; shootChargeStart = 0
      }
      if (cct2.identifier === joystick.touchId) {
        joystick.active = false; joystick.touchId = -1; joystick.dx = 0; joystick.dy = 0
      }
    }
  }
  // 扑救模式：摇杆释放
  if (scene === 'chlDefend') {
    for (var dti2 = 0; dti2 < e.changedTouches.length; dti2++) {
      if (e.changedTouches[dti2].identifier === joystick.touchId) {
        joystick.active = false; joystick.touchId = -1; joystick.dx = 0; joystick.dy = 0
      }
    }
  }
})

// ==================== 比赛入口 ====================
function startLeagueMatch(idx) {
  matchMode = 'league'; matchIdx = idx
  var s = LEAGUE_SCHEDULE[idx]
  // 淘汰赛：揭晓对手
  var opIdx
  if (idx >= 12) {
    opIdx = revealKOOpponent(idx)
  } else {
    opIdx = getLeagueOpponent(idx)
  }
  opponentTeam = TEAMS[opIdx]
  matchDiff = s.diff
  matchDuration = 90000 // 90秒
  scene = 'prematch'
}

function startWCMatch(idx) {
  matchMode = 'wc'; matchIdx = idx
  opponentTeam = getWCOpponent(idx)
  matchDiff = WC_SCHEDULE[idx].diff
  matchDuration = 90000
  scene = 'prematch'
}

// ==================== 分享 ====================
function shareGame() {
  var myT = getMyTeam()
  var opT = opponentTeam || { city:'对手' }
  var resultText = myGoals > opGoals ? '获胜！' : myGoals === opGoals ? '战平！' : '惜败！'
  wx.shareAppMessage({
    title: '绿茵逐梦 · ' + myT.city + ' ' + myGoals + ':' + opGoals + ' ' + opT.city + ' ' + resultText
  })
}

function shareChallengeAttack() {
  var myT = getMyTeam()
  wx.shareAppMessage({
    title: '绿茵逐梦 · ' + (D.nickname||'我') + '的点球成绩 ' + chlGoals + '/' + CHL_TOTAL,
    query: chlId ? 'chlId=' + chlId : ''
  })
}

function shareChallengeResult() {
  var myT = getMyTeam()
  wx.shareAppMessage({
    title: '绿茵逐梦 · ' + (D.nickname||'我') + '扑出 ' + chlSaves + '/' + CHL_TOTAL + ' 球',
    query: ''
  })
}

wx.onShareAppMessage(function() {
  // 如果有挑战ID，带上
  if (chlId && (scene === 'chlResult' || scene === 'chlAttack')) {
    var myT = getMyTeam()
    return {
      title: '绿茵逐梦 · ' + (D.nickname||'我') + '的点球成绩 ' + chlGoals + '/' + CHL_TOTAL,
      query: 'chlId=' + chlId
    }
  }
  // 比赛结束时分享带对手信息
  if (scene === 'matchResult' && opponentTeam) {
    var myT2 = getMyTeam()
    var opT2 = opponentTeam
    var res = myGoals > opGoals ? '获胜！' : myGoals === opGoals ? '战平！' : '惜败！'
    return { title: '绿茵逐梦 · ' + myT2.city + ' ' + myGoals + ':' + opGoals + ' ' + opT2.city + ' ' + res, query: '' }
  }
  return { title: '绿茵逐梦 · 苏超城市足球对决', query: '' }
})

// ==================== 处理分享链接进入 ====================
function checkLaunchChallenge() {
  try {
    var opts = wx.getLaunchOptionsSync()
    if (opts.query && opts.query.chlId) {
      pendingChallengeId = opts.query.chlId
      loadAndStartDefense(pendingChallengeId)
    }
  } catch(e) {}
}

wx.onShow(function(res) {
  if (res && res.query && res.query.chlId) {
    var cid = res.query.chlId
    if (cid && cid !== pendingChallengeId) {
      pendingChallengeId = cid
      loadAndStartDefense(cid)
    }
  }
})

function loadAndStartDefense(challengeId) {
  wx.showLoading({ title: '加载挑战...' })
  try {
    wx.cloud.callFunction({
      name: 'challenge',
      data: { action: 'get', challengeId: challengeId },
      success: function(res) {
        wx.hideLoading()
        if (res.result && res.result.code === 0 && res.result.data) {
          var data = res.result.data
          if (data.defenderSaves !== null && data.defenderSaves !== undefined) {
            // 已经有人应战了，显示结果
            chlData = data; chlRole = 'defend'
            chlSaves = data.defenderSaves
            chlGoals = data.goalsScored
            scene = 'chlResult'
          } else {
            // 需要确认昵称/战队后进入防守
            if (!D.nickname) {
              askNickname(function() { initChlDefend(data) })
            } else if (D.teamIdx < 0) {
              scene = 'teamSelect'
              // 选完队后需要手动进入，暂存数据
              chlData = data
            } else {
              initChlDefend(data)
            }
          }
        } else {
          wx.showToast({ title: '挑战不存在或已过期', icon: 'none' })
        }
      },
      fail: function() {
        wx.hideLoading()
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    })
  } catch(e) {
    wx.hideLoading()
  }
}

// ==================== 启动 ====================
ad.initAds()
checkLaunchChallenge()
requestAnimationFrame(frame)
