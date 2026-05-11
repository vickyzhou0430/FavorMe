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

Android emulator 访问宿主机后端时使用 `http://10.0.2.2:3000`。Android physical device 不在默认 cleartext 白名单内；请使用 HTTPS 后端地址、HTTPS 隧道，或为自己的本地 LAN 主机临时添加 debug-only network security config。生产或公网测试环境必须使用 HTTPS API 域名。

## Backend Contract

Phase 2 调用 Phase 1 的 REST + JSON 接口：

- `POST /v1/insight/questions`
- `POST /v1/insight/submit`

所有业务请求必须带：

- `Authorization: Bearer <token>`，其中 `<token>` 来自开发期 `API_TOKEN`
- `X-Device-Id`，必须是非空稳定设备标识
- `Content-Type: application/json`

`API_BASE_URL` 与 `API_TOKEN` 在 Flutter 中分别对应 `FAVORME_API_BASE_URL` 与 `FAVORME_API_TOKEN` 的 dart-define 值。AI/vendor keys、完整 prompt 模板、模型路由和商业策略都保持 backend-only，不进入 Flutter 仓库或移动端包。

## Security And Local Configuration

- Use the backend `API_TOKEN` only as development configuration for Phase 2 local testing; never commit real production tokens or paste them into Dart source.
- Keep AI/vendor keys, prompt templates, model routing, and fallback strategy backend-only. Flutter should call the backend API, not model providers directly.
- Use HTTPS outside local development. Cleartext HTTP is allowed only for emulator or LAN backend testing through the scoped Android network config.
- The device id is a stable development identifier for `X-Device-Id`, not formal auth. Production identity, account binding, and payments remain out of scope for this phase.
- Treat the raw question as sensitive user input: do not log raw question bodies in the client, including debug prints, analytics events, crash breadcrumbs, or retry diagnostics.

## Android Network Config

`android/app/src/main/AndroidManifest.xml` 声明 `android.permission.INTERNET` 并引用 `@xml/network_security_config`。该配置只允许本地开发主机 `10.0.2.2`、`localhost`、`127.0.0.1` 使用 cleartext HTTP，方便模拟器联调本机后端。物理 Android 设备如需访问 LAN HTTP 地址，必须使用临时 debug-only 配置显式加入该主机，不能放宽为通配 cleartext。

生产环境仍要求 HTTPS；不要把生产域名加入 cleartext 白名单。

## 构建问题：Gradle PKIX / SSLHandshakeException

`flutter build apk` 首次会由 Gradle Wrapper 下载 `gradle-*-all.zip`。若终端出现 `PKIX path building failed` / `unable to find valid certification path`，通常是 **当前 JDK 不信任下载站点的证书链**（公司 HTTPS 代理、SSL 检查、或本机 Java 信任库过旧）。

本项目已将 Wrapper 的 `distributionUrl` 指向 **腾讯云 Gradle 镜像**（与官方包同源），在部分网络下可绕过对 `services.gradle.org` 的信任或连通问题。若仍失败，可依次尝试：

1. **让 Flutter/Gradle 使用 Android Studio 自带的 JBR**（证书链通常较新），例如在 macOS：
   ```bash
   export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
   cd clients/flutter && flutter build apk
   ```
2. **公司代理根证书**：将公司下发的根 CA 导入上述 JDK 的 `cacerts`，或按 IT 文档配置 `JAVA_TOOL_OPTIONS` / `javax.net.ssl.trustStore`（勿把私钥或内部证书提交到仓库）。
3. **离线安装**：在一台可访问镜像的机器上下载对应版本的 `gradle-8.14-all.zip`，按 Gradle 文档放入本机 `~/.gradle/wrapper/dists/` 下对应哈希目录，再重试构建。

若需改回官方地址，可编辑 `android/gradle/wrapper/gradle-wrapper.properties` 中的 `distributionUrl`。

若曾失败到一半，可删除 `~/.gradle/wrapper/dists` 下对应 `gradle-8.14-all` 子目录后重试，避免使用损坏的缓存包。
