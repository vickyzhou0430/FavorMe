import 'dart:io';

import 'package:favorme_flutter/src/features/insight/device_id_store.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeHardwareReader implements HardwareDeviceIdReader {
  _FakeHardwareReader(this.value);
  final String? value;
  int calls = 0;

  @override
  Future<String?> tryRead() async {
    calls += 1;
    return value;
  }
}

void main() {
  group('FileDeviceIdStore', () {
    late Directory tempDir;
    late File tempFile;

    setUp(() async {
      tempDir = await Directory.systemTemp.createTemp('device_id_test_');
      tempFile = File('${tempDir.path}/device_id.txt');
    });

    tearDown(() async {
      if (await tempDir.exists()) {
        await tempDir.delete(recursive: true);
      }
    });

    test('returns existing file content untouched (cache hit)', () async {
      await tempFile.writeAsString('android-existing-value\n');
      final hw = _FakeHardwareReader('android-should-not-be-used');
      final store = FileDeviceIdStore(file: tempFile, hardwareReader: hw);

      final id = await store.readOrCreate();

      expect(id, 'android-existing-value');
      expect(hw.calls, 0, reason: 'hardware reader skipped when file exists');
    });

    test('writes hardware id when file missing and hardware available', () async {
      final hw = _FakeHardwareReader('android-abc123');
      final store = FileDeviceIdStore(file: tempFile, hardwareReader: hw);

      final id = await store.readOrCreate();

      expect(id, 'android-abc123');
      expect(await tempFile.readAsString(), 'android-abc123');
    });

    test('falls back to flutter-dev-<random> when hardware returns null', () async {
      final hw = _FakeHardwareReader(null);
      final store = FileDeviceIdStore(file: tempFile, hardwareReader: hw);

      final id = await store.readOrCreate();

      expect(id, startsWith('flutter-dev-'));
      expect(await tempFile.readAsString(), id);
    });

    test('falls back when hardware returns empty string', () async {
      final hw = _FakeHardwareReader('');
      final store = FileDeviceIdStore(file: tempFile, hardwareReader: hw);

      final id = await store.readOrCreate();

      expect(id, startsWith('flutter-dev-'));
    });

    test(
        'simulates reinstall: file deleted, hardware reader returns the same id, '
        'next readOrCreate yields the same value', () async {
      final hw = _FakeHardwareReader('android-stable-001');
      final store = FileDeviceIdStore(file: tempFile, hardwareReader: hw);

      final first = await store.readOrCreate();
      // 模拟 app 重装：app 沙盒清空 → 文件丢失。硬件 id 不变。
      await tempFile.delete();

      final second = await store.readOrCreate();

      expect(second, first);
      expect(second, 'android-stable-001');
    });
  });
}
