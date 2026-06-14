import 'dart:async';
import 'dart:convert';
import 'dart:developer' as developer;
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';

import '../insight/device_id_store.dart';
import '../insight/insight_api_client.dart' show InsightApiException;
import 'profile_models.dart';

const Duration _defaultRequestTimeout = Duration(
  seconds: int.fromEnvironment(
    'FAVORME_API_TIMEOUT_SECONDS',
    defaultValue: 60,
  ),
);

const String _logName = 'profile.api';

abstract interface class ProfileClient {
  Future<UserProfile> getProfile();
  Future<UserProfile> updateProfile(UpdateProfileRequest request);
}

class ProfileApiClient implements ProfileClient {
  ProfileApiClient({
    required this.baseUrl,
    required this.apiToken,
    required DeviceIdStore deviceIdStore,
    http.Client? httpClient,
    Duration requestTimeout = _defaultRequestTimeout,
  })  : _deviceIdStore = deviceIdStore,
        _requestTimeout = requestTimeout,
        _httpClient = httpClient ?? _createDefaultHttpClient(requestTimeout);

  final String baseUrl;
  final String apiToken;
  final DeviceIdStore _deviceIdStore;
  final http.Client _httpClient;
  final Duration _requestTimeout;

  @override
  Future<UserProfile> getProfile() async {
    final json = await _send(method: 'GET', path: '/v1/users/me');
    return UserProfile.fromJson(json);
  }

  @override
  Future<UserProfile> updateProfile(UpdateProfileRequest request) async {
    final json = await _send(
      method: 'PATCH',
      path: '/v1/users/me',
      body: jsonEncode(request.toJson()),
    );
    return UserProfile.fromJson(json);
  }

  Future<Map<String, Object?>> _send({
    required String method,
    required String path,
    String? body,
  }) async {
    final token = apiToken.trim();
    if (token.isEmpty) {
      throw const InsightApiException(
        code: 'CLIENT_CONFIG_MISSING',
        message: 'API token is not configured.',
      );
    }

    final deviceId = (await _deviceIdStore.readOrCreate()).trim();
    if (deviceId.isEmpty) {
      throw const InsightApiException(
        code: 'DEVICE_ID_MISSING',
        message: 'Device id is not available.',
      );
    }

    final endpoint = _endpoint(path);
    final headers = {
      'Authorization': 'Bearer $token',
      'X-Device-Id': deviceId,
      'Content-Type': 'application/json',
    };
    final stopwatch = Stopwatch()..start();
    _log('$method $path start');

    http.Response response;
    try {
      final Future<http.Response> future;
      switch (method) {
        case 'GET':
          future = _httpClient.get(endpoint, headers: headers);
        case 'PATCH':
          future = _httpClient.patch(endpoint, headers: headers, body: body);
        default:
          throw UnsupportedError('Unsupported method: $method');
      }
      response = await future.timeout(_requestTimeout);
    } on TimeoutException {
      throw const InsightApiException(
        code: 'NETWORK_TIMEOUT',
        message: '网络请求超时。',
      );
    } on HandshakeException catch (e) {
      throw InsightApiException(
        code: 'TLS_HANDSHAKE_FAILED',
        message: '无法建立安全连接（TLS 握手失败）。详情：${e.message}',
      );
    } on SocketException catch (e) {
      throw InsightApiException(
        code: 'NETWORK_UNREACHABLE',
        message: '无法连接服务器（${e.message}）。',
      );
    } on http.ClientException catch (e) {
      throw InsightApiException(
        code: 'NETWORK_UNREACHABLE',
        message: '无法连接服务器：${e.message}。',
      );
    }

    _log(
      '$method $path -> ${response.statusCode} in ${stopwatch.elapsedMilliseconds}ms',
      level: response.statusCode >= 400 ? 900 : 0,
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final decoded = _decode(response.body) ?? const {};
      throw InsightApiException(
        statusCode: response.statusCode,
        code: decoded['code'] as String?,
        message: decoded['message'] as String? ?? '请求失败。',
        requestId: decoded['requestId'] as String?,
      );
    }

    final decoded = _decode(response.body);
    if (decoded == null) {
      throw const InsightApiException(
        code: 'MALFORMED_API_RESPONSE',
        message: 'API response is not valid JSON.',
      );
    }
    return decoded;
  }

  Map<String, Object?>? _decode(String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map) {
        return Map<String, Object?>.from(decoded);
      }
    } on FormatException {
      // fall through
    }
    return null;
  }

  Uri _endpoint(String path) {
    final normalized = baseUrl.trim().replaceFirst(RegExp(r'/$'), '');
    return Uri.parse('$normalized$path');
  }

  static void _log(String message, {int level = 0}) {
    if (!kDebugMode) {
      return;
    }
    developer.log(message, name: _logName, level: level);
  }

  static http.Client _createDefaultHttpClient(Duration connectionTimeout) {
    final inner = HttpClient()..connectionTimeout = connectionTimeout;
    const allowBadTls = bool.fromEnvironment(
      'FAVORME_ALLOW_BAD_TLS',
      defaultValue: false,
    );
    if (allowBadTls) {
      inner.badCertificateCallback = (cert, host, port) => true;
    }
    return IOClient(inner);
  }
}
