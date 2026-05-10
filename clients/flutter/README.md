# FavorMe Flutter 客户端

本目录是 Phase 2 Android MVP 的 **Flutter-first** 主实现位置。当前交付目标是 Android-only：用 Flutter 跑通「输入问题 -> 三问选答 -> 倾向结论」闭环，同时保持后续 iOS 复用的代码结构；本阶段不做 iOS 真机验收或发布配置。

`clients/android` 只作为平台说明入口，不承载 Phase 2 功能实现代码。

## Local Run

后端先按 [`../backend/README.md`](../backend/README.md) 启动到本机 `3000` 端口，并在 `backend/.env` 中配置开发用 `API_TOKEN`。Flutter 客户端通过 `--dart-define` 读取本地配置，不在源码中硬编码真实 token：

```bash
flutter pub get
flutter run -d android \
  --dart-define=FAVORME_API_BASE_URL=http://10.0.2.2:3000 \
  --dart-define=FAVORME_API_TOKEN=<backend API_TOKEN>
```

Android emulator 访问宿主机后端时使用 `http://10.0.2.2:3000`。Android physical device 需要把 `FAVORME_API_BASE_URL` 指向同一局域网内可访问的机器地址，例如 `http://192.168.1.23:3000`。生产或公网测试环境应使用 HTTPS API 域名。

## Backend Contract

Phase 2 调用 Phase 1 的 REST + JSON 接口：

- `POST /v1/insight/questions`
- `POST /v1/insight/submit`

所有业务请求必须带：

- `Authorization: Bearer <token>`，其中 `<token>` 来自开发期 `API_TOKEN`
- `X-Device-Id`，必须是非空稳定设备标识
- `Content-Type: application/json`

`API_BASE_URL` 与 `API_TOKEN` 在 Flutter 中分别对应 `FAVORME_API_BASE_URL` 与 `FAVORME_API_TOKEN` 的 dart-define 值。AI/vendor keys、完整 prompt 模板、模型路由和商业策略都保持 backend-only，不进入 Flutter 仓库或移动端包。

## Android Network Config

`android/app/src/main/AndroidManifest.xml` 声明 `android.permission.INTERNET` 并引用 `@xml/network_security_config`。该配置只允许本地开发主机 `10.0.2.2`、`localhost`、`127.0.0.1` 使用 cleartext HTTP，方便模拟器联调本机后端。

生产环境仍要求 HTTPS；不要把生产域名加入 cleartext 白名单。
