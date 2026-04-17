# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Android native app for barbershop membership management (理发店会员管理系统). Fully offline, all data stored locally via SQLite/Room. No network requests, no cloud storage.

## Tech Stack

- **Language**: Kotlin
- **UI**: Jetpack Compose + Material 3
- **Database**: Room (SQLite)
- **Architecture**: MVVM (ViewModel + StateFlow/SharedFlow)
- **Navigation**: Compose Navigation
- **Settings**: DataStore Preferences
- **Min SDK**: 26 (Android 8.0)

## Build & Run

```bash
# Build debug APK
./gradlew assembleDebug
# Output: app/build/outputs/apk/debug/tony.apk

# Build release APK
./gradlew assembleRelease

# Install to connected device
./gradlew installDebug
```

Requires Android SDK with compileSdk 34 and JDK 17.

## Architecture

```
app/src/main/java/com/hairshop/member/
├── HairShopApp.kt              — Application class, dependency container
├── MainActivity.kt             — Single activity entry point
├── data/
│   ├── db/
│   │   ├── AppDatabase.kt      — Room database singleton
│   │   ├── entity/             — Room entities (Member, ServiceProject, Barber, Recharge, Order, OrderItem)
│   │   └── dao/                — Room DAOs with Flow-based queries
│   └── repository/             — Repository layer (MemberRepo, ProjectRepo, BarberRepo, OrderRepo, BackupRepo)
├── viewmodel/                  — AndroidViewModels per feature
└── ui/
    ├── theme/Theme.kt          — Material 3 theme
    ├── navigation/             — NavRoutes + AppNavGraph
    ├── components/             — Shared composables (AppTopBar, StatCard, ConfirmDialog)
    └── screens/                — Feature screens (home, member, barber, project, order, record, backup, settings)
```

## Key Design Decisions

- **No DI framework**: Dependencies are wired manually through `HairShopApp` (Application subclass) and `AndroidViewModel`.
- **Flow-based reactive data**: All DAOs return `Flow<T>`, collected as `StateFlow` in ViewModels.
- **Order creation is transactional**: `OrderDao.insertOrderWithItems()` uses `@Transaction` to insert order + items atomically, and deducts member balance if pay type is "余额".
- **Project deletion guard**: Projects with existing order_item references cannot be deleted, only disabled (status=0).
- **Barber deletion guard**: Barbers with existing order references cannot be deleted, only set to inactive (status=0). Each order records barber_id (FK→barber, SET_NULL on delete).
- **Backup/restore**: Copies the raw SQLite `.db` file (plus WAL/SHM) to Downloads/HairShopBackup/. Restore overwrites the database file and requires app restart.
- **Member deletion**: Soft-delete semantics — deleted members' orders remain, showing "已删除会员" via LEFT JOIN.

## Database Schema

Six tables: `member` (with unique phone index), `project`, `barber`, `recharge` (FK→member), `orders` (FK→member, FK→barber), `order_item` (FK→orders with CASCADE delete). Foreign keys use SET_NULL on member/barber deletion so order history is preserved.
