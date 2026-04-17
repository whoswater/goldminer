# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

「冲高高」- 抖音小游戏。方块从左右交替滑入，玩家点击屏幕让方块落下叠放，超出部分被切掉，连续Perfect可恢复宽度。

## Tech Stack

- 原生 Canvas 2D + JavaScript，无框架依赖
- 目标平台：抖音小游戏（当前为浏览器版本）

## Run

直接用浏览器打开 `index.html` 即可运行，无需构建。

## Architecture

- `js/block.js` — Block 类（方块移动、切割判定）和 CutOffPiece 类（碎片下落动画）
- `js/effects.js` — EffectSystem 类（Perfect文字、粒子特效、屏幕闪光）
- `js/game.js` — Game 主类（游戏循环、状态机 ready/playing/over、镜头跟随、渲染）
- `css/style.css` — 全屏居中布局
- `index.html` — 入口

## Key Design Decisions

- 切割逻辑在 `Block.slice()` 静态方法中，返回 placed + cutOff 两部分
- Perfect 判定阈值 5px，触发宽度恢复（连击越高恢复越多，上限20px）
- 方块速度按层数分段递增，50层后缓增避免不可玩
- 镜头平滑跟随，塔高超过屏幕40%位置时开始上移
