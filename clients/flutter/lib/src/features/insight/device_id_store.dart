import 'dart:io';
import 'dart:math';

abstract interface class DeviceIdStore {
  Future<String> readOrCreate();
}

class FileDeviceIdStore implements DeviceIdStore {
  FileDeviceIdStore({File? file})
      : _file = file ??
            File(
              '${Directory.systemTemp.path}/favorme_flutter_device_id.txt',
            );

  final File _file;

  @override
  Future<String> readOrCreate() async {
    if (await _file.exists()) {
      final existing = (await _file.readAsString()).trim();
      if (existing.isNotEmpty) {
        return existing;
      }
    }

    final generated = _generateDevelopmentDeviceId();
    await _file.parent.create(recursive: true);
    await _file.writeAsString(generated, flush: true);
    return generated;
  }

  String _generateDevelopmentDeviceId() {
    final random = Random.secure();
    final suffix = List<int>.generate(8, (_) => random.nextInt(256))
        .map((byte) => byte.toRadixString(16).padLeft(2, '0'))
        .join();
    return 'flutter-dev-$suffix';
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
