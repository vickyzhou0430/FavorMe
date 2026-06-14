# 任务 006：device id 改为硬件 ID 优先 + 持久化目录（短期方案 A）

- **状态**：实现完成（待真机回归）
- **负责人**：Jimmy Sun
- **创建日期**：2026-06-14
- **目标完成**：2026-06-14
- **背景**：用户重装 app 后历史会话不再可见。后端历史数据没丢，但客户端 `deviceId` 来源是「随机串 + 存 systemTemp」，重装 → 新 deviceId → 后端 upsert 出新 `User` 行 → 关联不到老 `InsightV2Session`。详见 ADR-005 与 PRD「用户登录 / 账号体系（📋规划中）」一栏。

## 目标

把 `deviceId` 改成**同一设备 + 同一应用签名下跨重装稳定**的标识，让"重装 app 后历史消失"这个用户感知最强的回归问题封住。**不**做账号体系（长期方案）。

## 不在此任务范围内

- 正式登录/账号系统（手机号、微信等），仍留待 PRD 第七节"用户登录 / 账号体系"节奏
- 跨设备同步（换机器/恢复出厂仍然会丢，需账号才能解决）
- 一次性补救已经丢关联的历史（需后端 SQL 手术，单独处理）
- 客户端任何 UI 变化（开关、引导、登录提示）

## 前置条件

- [x] 后端 `User.deviceId` 维持现状（仍是 `String?` 唯一键），无需 migration
- [x] 客户端 SDK 允许引入 `path_provider` / `device_info_plus` / `android_id` 三个包

## 实现要点

### 1. 依赖

`clients/flutter/pubspec.yaml`：
- `path_provider: ^2.1.5` — 找 `ApplicationSupportDirectory`
- `device_info_plus: ^11.2.0` — iOS 读 `identifierForVendor`
- `android_id: ^0.4.0` — Android 读 `Settings.Secure.ANDROID_ID`（device_info_plus 出于隐私不暴露此值）

版本号同步 `0.2.0+2 → 0.2.1+3`。

### 2. 存储位置

由 `Directory.systemTemp` 改为 `await getApplicationSupportDirectory()`。两者都在 app 沙盒里、卸载都会清，但 ApplicationSupport 是"应当长期保留"的语义，平台备份策略也优先涵盖。**关键不是这里**——重装恢复靠的是步骤 3。

### 3. 首启回退链

```
1) 已有文件 → 读取并返回
2) 平台硬件 ID：
   - Android → android_id.getId() → 拼成 "android-<id>"
   - iOS → DeviceInfoPlugin().iosInfo.identifierForVendor → "ios-<id>"
3) 都没有 → 随机兜底 "flutter-dev-<8hex>"
```

文件擦除后再次首启走 (2)，**硬件 ID 不变 → 同一字符串 → 后端关联回原 `User` 行**，历史恢复。

### 4. 各方案的稳定性边界

| 操作 | Android（ANDROID_ID）| iOS（identifierForVendor）|
|------|---------------------|-------------------------|
| 卸载 → 重装（同签名） | ✅ 不变 | ✅ 不变 |
| 卸载所有同 vendor app → 重装 | ✅ 不变 | ❌ 变（这是 Apple 设计） |
| 换 app 签名（开发版 ↔ release） | ⚠️ Android 8+ 会变 | ✅ 不变 |
| 恢复出厂设置 | ❌ 变 | ❌ 变 |
| 换设备 | ❌ 变 | ❌ 变 |

「换签名会换 id」对开发/测试影响较大：debug 版与 release 版的 device id 不同，是预期行为，不算 bug。

### 5. 接口与测试

- `DeviceIdStore` 接口保持不变；所有 API client 调用点零修改
- `FileDeviceIdStore` 构造函数加 `HardwareDeviceIdReader? hardwareReader` 注入参数，便于单测
- 新增 `test/device_id_store_test.dart`：5 个用例覆盖 cache 命中 / 硬件可用 / 硬件返回 null / 硬件返回空串 / 模拟重装

## 验收标准

- [x] `flutter pub get` 通过，无依赖冲突
- [x] `flutter analyze` 无新增 warning / error
- [x] 16 个 Flutter 测试全部通过（含 5 个新增）
- [ ] 真机回归：装一版（debug 或 release，固定一种）→ 跑一次会话 → `adb uninstall` → 重装 → 看 [InsightV2HistoryScreen](../../clients/flutter/lib/src/features/insight_v2/history/insight_v2_history_screen.dart) 能否看到上一次的会话
- [ ] 真机回归：换签名（debug ↔ release）后 deviceId **会变**（预期），历史**不会**跨签名关联

## 已修改/新增文件

- 改：`clients/flutter/pubspec.yaml`（+ 3 依赖、版本号）
- 改：`clients/flutter/lib/src/features/insight/device_id_store.dart`（回退链 + ApplicationSupport）
- 新：`clients/flutter/test/device_id_store_test.dart`
- 新：本文件

## 阻塞与风险

- **debug 构建与 release 构建 deviceId 不同**：Android 上 ANDROID_ID 在 Android 8+ 按"签名密钥"分桶。开发期切换构建配置会被当成"换了一个人"，是预期但要心里有数。
- **iOS identifierForVendor 不绝对稳定**：用户卸载本 app 时如果设备上同 vendor 的其它 app 也都不在了，下次安装会换 id。本场景不算常见，但要写进 FAQ。
- **隐私合规**：ANDROID_ID 与 identifierForVendor 都是隐私敏感程度较低的设备标识，国内法规一般无需用户同意即可使用，但隐私政策里仍应披露"我们使用设备级匿名标识识别同一用户"。

## 交接给下一会话 / 一次性补救

针对**已经丢历史**的设备（用户当前痛点）：

1. 用 `psql` / Prisma Studio 翻 `InsightV2Session` 表，按 `dilemma` 或 `createdAt` 找到那条会话，记下 `userId`，查到对应 `User.deviceId`（应为 `flutter-dev-xxxx`）
2. 让设备装上本次修复版本，启动 app 后让它做一次任意操作（如打开历史页空请求一次），让新硬件型 deviceId（`android-xxxxx`）在后端 `User` 表里建出来
3. 后端跑：
   ```sql
   -- 把老 User 行的 deviceId 改成新 deviceId（避免唯一键冲突，先清掉新 row）
   DELETE FROM "User" WHERE "deviceId" = '<新 android-xxx>';
   UPDATE "User" SET "deviceId" = '<新 android-xxx>' WHERE "id" = '<老 userId>';
   ```
4. App 端冷启，历史回来

后续根治仍是账号体系（PRD 第七节路线图），见 ADR-005/PRD-001 引用。
