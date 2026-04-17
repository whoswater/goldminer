# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"绿茵逐梦狂欢"（简称"绿茵逐梦"）— 微信小游戏，1v1即时对抗足球赛。融合苏超（江苏城市足球联赛）13支城市战队，滑动操控球员移动/射门/防守，90秒一局。

## Build & Run

- Open in **WeChat Developer Tools** → Compile
- AppID: `wx5294f1b66ad699de`
- Cloud: deploy `cloudfunctions/updateScore` and `cloudfunctions/checkText`
- Cloud DB: create collection `ranking` (fields: `openid`, `score`, `nickname`, `team`, `round`, `updateTime`)

## Architecture

- `game.js` — Main: state machine, match physics, AI, touch handling (~900 lines)
- `game.json` — Portrait orientation config
- `js/render.js` — Canvas drawing: pitch, players, goals, UI components
- `js/audio.js` — Procedural audio: BGM, kick/goal/whistle/cheer sounds
- `cloudfunctions/` — Score submission + content moderation

## Core Modules (from design doc)

### Module 1: Team Building (战队养成)
- 13 city teams with 3 buff types: `spd` (speed), `atk` (shot power), `def` (goalkeeper range)
- 3 upgradable stats (atk/spd/def) via training coins, max level 5
- Daily tasks: login, match, win → earn coins

### Module 2: Dual Competition (双线竞技)
- **苏超联赛**: 6 matches (3 group + 2 knockout + final), progressive AI difficulty
- **世界杯狂欢**: 4 matches, unlocked after 3 league wins, fictional opponents, harder AI
- Match: 90s, 1v1 real-time vs AI, swipe to move/shoot, auto-goalkeeper

### Module 3: Rewards (福利系统)
- Coins from wins (goals×5 + 15) and daily tasks
- Cloud leaderboard (total goals, round=99)

## Match Gameplay

- **Controls**: Touch drag = move player, quick upward swipe = shoot
- **Ball ownership**: proximity-based pickup, AI tackles based on difficulty
- **Shooting**: `myShoot()` — ball velocity from swipe direction/speed, modified by atk stat
- **Goalkeeper AI**: auto-tracks ball when near goal, range affected by def stat
- **Opponent AI**: difficulty (0-1) controls speed, tackle rate, shot frequency
- State: `matchCountdown` → active play → `endMatch()` when timer hits 0

## Key State

- `D` object: loaded from wx.Storage, holds nickname, teamIdx, coins, stats, league/wc progress
- `scene` variable: `home|teamSelect|training|leagueMap|wcMap|prematch|match|matchResult|ranking`
- Match entities: `myPlayer`, `opPlayer`, `myGK`, `opGK`, `ball` (each with x, y, velocity)
