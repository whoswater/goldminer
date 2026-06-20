# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

迷你四驱车赛事管理系统 - 包含后端API、Web管理端、微信小程序端三个独立项目。系统实现赛事"创建-报名管理-分组编排-计时录分-成绩统计-公示"全流程数字化。

## Project Structure

```
mini4wd/
├── mini4wd-server/  # Java Spring Boot 3 后端API服务
├── mini4wd-admin/   # Vue3 + Element Plus Web管理端
├── mini4wd-mp/      # 微信小程序端
```

## Tech Stack

- **Backend**: Java 17, Spring Boot 3.2, MyBatis-Plus 3.5, MySQL, JWT
- **Web Frontend**: Vue 3, Vite, Element Plus, ECharts, Pinia, Vue Router 4
- **Mini Program**: 微信小程序原生框架

## Build & Run

### Backend
```bash
cd mini4wd-server
mvn spring-boot:run
# 运行在 http://localhost:8080, context-path: /api
# 首次运行需先执行 src/main/resources/db/schema.sql 建表
```

### Web Frontend
```bash
cd mini4wd-admin
npm install
npm run dev
# 运行在 http://localhost:3000, 已配置代理到后端8080
```

### Docker 部署
```bash
./deploy.sh up    # 一键构建并启动
./deploy.sh down  # 停止
./deploy.sh logs  # 查看日志
```

### Mini Program
用微信开发者工具打开 `mini4wd-mp/` 目录，配置 `app.js` 中的 `baseUrl` 指向后端地址。

## Database

- 数据库连接信息通过环境变量注入(DB_HOST/DB_USER/DB_PASS)，不硬编码在代码中
- 建表SQL: `mini4wd-server/src/main/resources/db/schema.sql`
- 初始管理员: admin (密码需通过BCrypt生成后替换SQL中的hash)

## Architecture

### Backend
- `controller/` — REST API层，按模块划分(Auth/Event/Registration/Grouping/Score/Account/SystemConfig/Wx)
- `service/impl/` — 业务逻辑层，包含赛事状态流转、分组算法、成绩排名计算
- `entity/` — MyBatis-Plus实体，对应12张数据表
- `dto/` — 请求/响应DTO
- `interceptor/AuthInterceptor` — JWT鉴权拦截器，/wx/** 和 /auth/** 免认证
- `config/GlobalExceptionHandler` — 统一异常处理

### Web Frontend
- `layout/AppLayout.vue` — 主布局，侧边栏按角色动态显示菜单
- `views/` — 10个页面组件对应PRD中8个核心模块
- `api/index.js` — 所有后端API调用封装
- `store/user.js` — Pinia用户状态(token/角色)

### Mini Program
- `utils/api.js` — 后端API封装，调用 /api/wx/* 接口
- 7个页面: 首页、赛事列表、赛事详情、报名、我的报名、成绩查询、个人中心

## Key Business Rules

- **角色权限**: SUPER_ADMIN(全权限) > EVENT_ADMIN(单赛事管理, 仅能管自创赛事). RACER 是默认角色.
- **赛事状态流转**: DRAFT → REG_NOT_STARTED → REGISTRATION → IN_PROGRESS → ENDED → PUBLISHED
- **分组规则**: 每组人数不可超过赛道轨数(3轨/5轨)
- **成绩规则**: 用时格式 MM:SS.mmm，违规罚时叠加，未完赛排名置后
- **参赛编号格式**: 赛事ID后3位 + 3位序号 (如 001001)
- **登录安全**: 连续3次失败锁定10分钟
- **赛制配置**: event_group.round_config JSON 定义每轮 mode/advancePerGroup/mandatory/source

## 实际操作入口 (2026-06)

跟"通常 admin 流程"差异较大, 列实际入口避免误导:

### 报名
| 操作 | 入口 |
|---|---|
| 导入 | PC EventDetail "上传报名表" / mp rosterImport |
| 删除 | PC EventDetail table 操作列 / mp 同 |
| 审核 (通过/驳回) | PC RegistrationTab 通过/驳回按钮 |
| 编辑 | 无单独入口 |

### 分组
| 操作 | 入口 |
|---|---|
| 自动分组 R1 | "开始比赛"按钮一键触发, 内部调 autoGroup |
| 手动分组 | **无** |
| 推进下一轮 | **无单独按钮** — `advanceRound` 是"确认结果"提交时内部自动触发 |
| 回滚/调整结果 | mp "调整结果" 按钮 / PC SpectatorView 同, 调 rollbackRound |

### 成绩
| 操作 | 入口 |
|---|---|
| 录分 / 确认结果 | PC SpectatorView / mp eventProgress |
| 手动锁定 | **无** — `lockScores` 是"确认结果"提交时内部自动触发 |
| 手动解锁 | **无** — `unlockScores` 内部 (rollback 时用) |

### 赛事状态推进
| 目标状态 | 入口 |
|---|---|
| REGISTRATION (开放报名) | PC "推进状态" 按钮 |
| IN_PROGRESS (开始比赛) | "开始比赛" 按钮 (含一键 R1 分组) |
| ENDED | 决赛 submitFinalRanks 内部自动 |
| PUBLISHED (公示) | PC "推进状态" 按钮 |

### 已删除 / 不存在的状态和角色
- `ARCHIVED` (归档): 状态本身已删, 前端 label 残留兜底
- `REG_CLOSED` / `GROUPING`: 历史 doc 漂移, 后端枚举从未有
- `VENUE_OWNER` / `REFEREE` 角色: 已从代码删除 (虚设)

## 个人赛 vs 组队赛流程

### 个人赛 (已实现)
```
报名(按人) → 分组(N人一组) → 每轮点选晋级/录入成绩 → 下一轮自动分组 → 决赛 → 公示
```
- 分组单位: 个人 (race_grouping 存每人的组号+车道)
- 录入: 每人一条用时 或 点选晋级
- 晋级: 每组前N人晋级, 淘汰者进复活赛

### 组队赛 (已实现)
```
报名(按队) → 分组(M队一组) → 每组按顺位赛多场 → 计队伍总分 → 队伍晋级/淘汰 → 决赛(MVP) → 公示
```

**核心差异:**
1. **分组单位是队伍** — 3队一组=9人(3人×3队), 不是9个个人. 后端 `autoTeamGroup` 按 `race_team` 分组
2. **每组赛多场** — 第1顺位3人赛一场, 第2顺位3人赛一场, 第3顺位3人赛一场
3. **组队赛计分** — 分值 9,7,5,3,1,0; 未完赛=0 (system_config.team_scoring_3v/5v). 同组同顺位互斥不能同分
4. **队伍总分** — 所有顺位场次得分之和 (最高15分), 后端聚合返回
5. **按队伍晋级** — 总分最高的队伍晋级, advanceUnit=TEAM
6. **决赛 MVP** — 冠军队跨全赛事得分最高的队员展示 (`/wx/event/{id}/team-mvp`)
