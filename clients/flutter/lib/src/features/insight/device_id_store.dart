import 'dart:io';
import 'dart:math';

import 'package:android_id/android_id.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:path_provider/path_provider.dart';

/// 设备级稳定身份。后端把它当作匿名用户的 PK（`User.deviceId`），所以这个值在
/// **同一设备 + 同一应用签名**下应当跨重装稳定（见 docs/tasks/006）。
abstract interface class DeviceIdStore {
  Future<String> readOrCreate();
}

/// 文件持久化的 device id：
///
/// - 首次启动时：
///   1) 已有文件 → 直接读
///   2) 平台硬件 ID（Android `ANDROID_ID` / iOS `identifierForVendor`）
///   3) 随机兜底（`flutter-dev-xxx`，桌面端/无法读取硬件 ID 时）
/// - 默认存储路径：`getApplicationSupportDirectory()`（**不是** `systemTemp`），
///   `systemTemp` 在 Android 上属于 app cache，被系统/卸载擦除；
///   ApplicationSupport 同样在 app 沙盒内（卸载也会被擦），但语义上是
///   「应该长期保留」的目录，平台备份策略也会优先涵盖它。
///
/// 重装恢复历史的本质来源是硬件 ID：即便文件被擦，下一次首启走步骤 2 时
/// 会重新算出**同一个** id，从而后端关联到原 `User` 行（见 task-006）。
class FileDeviceIdStore implements DeviceIdStore {
  FileDeviceIdStore({
    File? file,
    HardwareDeviceIdReader? hardwareReader,
  })  : _explicitFile = file,
        _hardwareReader = hardwareReader ?? PlatformHardwareDeviceIdReader();

  final File? _explicitFile;
  final HardwareDeviceIdReader _hardwareReader;
  File? _resolvedFile;

  Future<File> _file() async {
    if (_explicitFile != null) return _explicitFile;
    if (_resolvedFile != null) return _resolvedFile!;
    final dir = await getApplicationSupportDirectory();
    return _resolvedFile = File('${dir.path}/favorme_flutter_device_id.txt');
  }

  @override
  Future<String> readOrCreate() async {
    final file = await _file();
    if (await file.exists()) {
      final existing = (await file.readAsString()).trim();
      if (existing.isNotEmpty) {
        return existing;
      }
    }

    final id = await _resolveNewId();
    await file.parent.create(recursive: true);
    await file.writeAsString(id, flush: true);
    return id;
  }

  Future<String> _resolveNewId() async {
    final fromHardware = await _hardwareReader.tryRead();
    if (fromHardware != null && fromHardware.isNotEmpty) {
      return fromHardware;
    }
    return _generateRandomFallback();
  }

  String _generateRandomFallback() {
    final random = Random.secure();
    final suffix = List<int>.generate(8, (_) => random.nextInt(256))
        .map((byte) => byte.toRadixString(16).padLeft(2, '0'))
        .join();
    return 'flutter-dev-$suffix';
  }
}

/// 读平台硬件 ID 的抽象（便于测试注入）。
abstract interface class HardwareDeviceIdReader {
  Future<String?> tryRead();
}

/// 真机实现：Android `ANDROID_ID`、iOS `identifierForVendor`、其它平台返回 null。
class PlatformHardwareDeviceIdReader implements HardwareDeviceIdReader {
  PlatformHardwareDeviceIdReader({
    AndroidId? androidIdPlugin,
    DeviceInfoPlugin? deviceInfoPlugin,
  })  : _androidIdPlugin = androidIdPlugin ?? const AndroidId(),
        _deviceInfoPlugin = deviceInfoPlugin ?? DeviceInfoPlugin();

  final AndroidId _androidIdPlugin;
  final DeviceInfoPlugin _deviceInfoPlugin;

  @override
  Future<String?> tryRead() async {
    try {
      if (Platform.isAndroid) {
        final id = await _androidIdPlugin.getId();
        if (id != null && id.isNotEmpty) {
          return 'android-$id';
        }
      } else if (Platform.isIOS) {
        final info = await _deviceInfoPlugin.iosInfo;
        final id = info.identifierForVendor;
        if (id != null && id.isNotEmpty) {
          return 'ios-$id';
        }
      }
    } catch (_) {
      // 读硬件 ID 失败不应阻塞 app 启动；落回随机 fallback。
      return null;
    }
    return null;
  }
}

class InMemoryDeviceIdStore implements DeviceIdStore {
  InMemoryDeviceIdStore({String seed = 'flutter-test-device'}) : _value = seed;

  String _value;

  @override
  Future<String> readOrCreate() async {
    if (_value.trim().isEmpty) {
      _value = 'flutter-test-device';
    }
    return _value;
  }
}
