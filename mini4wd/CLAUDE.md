# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

迷你四驱车赛事管理系统 - 包含后端API、Web管理端、微信小程序端三个独立项目。系统实现赛事"创建-报名管理-分组编排-计时录分-成绩统计-公示归档"全流程数字化。

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

- Host: rm-uf62h6o3tcrd8bte6.mysql.rds.aliyuncs.com
- User: develop_user / developadmin@123
- Schema: test
- 建表SQL: `backend/src/main/resources/db/schema.sql`
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

- **角色权限**: SUPER_ADMIN(全权限) > VENUE_OWNER(本场地全权限) > EVENT_ADMIN(单赛事管理) > REFEREE(成绩录入)
- **赛事状态流转**: DRAFT → REG_NOT_STARTED → REGISTRATION → REG_CLOSED → GROUPING → IN_PROGRESS → ENDED → PUBLISHED → ARCHIVED
- **分组规则**: 每组人数不可超过赛道轨数(3轨/5轨)
- **成绩规则**: 用时格式 MM:SS.mmm，违规罚时叠加，未完赛排名置后
- **参赛编号格式**: 赛事ID后3位 + 3位序号 (如 001001)
- **登录安全**: 连续3次失败锁定10分钟
- **赛制配置**: event_group.round_config JSON 定义每轮 mode/advancePerGroup/mandatory/source

## 个人赛 vs 组队赛流程

### 个人赛 (已实现)
```
报名(按人) → 分组(N人一组) → 每轮点选晋级/录入成绩 → 下一轮自动分组 → 决赛 → 公示
```
- 分组单位: 个人 (race_grouping 存每人的组号+车道)
- 录入: 每人一条用时 或 点选晋级
- 晋级: 每组前N人晋级, 淘汰者进复活赛

### 组队赛 (待实现)
```
报名(按队) → 分组(M队一组) → 每组按顺位赛多场 → 计队伍总分 → 队伍晋级/淘汰 → 决赛 → 公示
```

**核心差异:**
1. **分组单位是队伍** — 3队一组=9人(3人×3队), 不是9个个人
2. **每组赛多场** — 第1顺位3人赛一场, 第2顺位3人赛一场, 第3顺位3人赛一场
3. **按名次计分** — 每场: 1st=5分, 2nd=3分, 3rd=1分, 未完赛=0分 (system_config.team_scoring_3v)
4. **队伍总分** — 所有顺位场次得分之和 (最高15分)
5. **按队伍晋级** — 总分最高的队伍晋级, advanceUnit=TEAM

**待开发项:**
- 后端: 队伍分组 API (按 race_team 分组, 不是 registration)
- 后端: 队伍成绩聚合 API (sum per team)
- 前端 ScoreInput: 组队赛模式 — 展示队伍结构, 按顺位录入, 显示队伍总分
- 前端 GroupManage: 组队赛模式 — 按队伍分组 (3队一组)
- 前端: 队伍晋级 (点选队伍, 不是个人)
