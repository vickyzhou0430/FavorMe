import 'dart:async';
import 'dart:convert';
import 'dart:developer' as developer;
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';

import '../insight/device_id_store.dart';
import '../insight/insight_api_client.dart' show InsightApiException;
import 'insight_v2_models.dart';

const Duration _defaultRequestTimeout = Duration(
  seconds: int.fromEnvironment(
    'FAVORME_API_TIMEOUT_SECONDS',
    defaultValue: 60,
  ),
);

const String _logName = 'insight_v2.api';

abstract interface class InsightV2Client {
  Future<InsightV2Turn> startSession({required String dilemma});

  Future<InsightV2Turn> answer({
    required String sessionId,
    required String questionId,
    required InsightV2Level level,
  });

  Future<InsightV2Turn> reply({
    required String sessionId,
    required String replyText,
  });

  Future<InsightV2Turn> regenerate({required String sessionId});

  Future<InsightV2SessionDetail> getSession(String sessionId);

  Future<InsightV2HistoryPage> listSessions({int? limit, String? cursor});

  Future<InsightV2PromptInfo> getPrompt({String? key});

  Future<InsightV2PromptInfo> updatePrompt(String content, {String? key});

  Future<InsightV2PromptInfo> resetPrompt({String? key});
}

class InsightV2ApiClient implements InsightV2Client {
  InsightV2ApiClient({
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
  Future<InsightV2Turn> startSession({required String dilemma}) async {
    final json = await _send(
      method: 'POST',
      path: '/v1/insight-v2/sessions',
      body: jsonEncode({'dilemma': dilemma, 'inputMode': 'text'}),
    );
    return _parse(json, InsightV2Turn.fromJson, 'TURN');
  }

  @override
  Future<InsightV2Turn> answer({
    required String sessionId,
    required String questionId,
    required InsightV2Level level,
  }) async {
    final json = await _send(
      method: 'POST',
      path: '/v1/insight-v2/sessions/$sessionId/turns',
      body: jsonEncode({
        'action': 'answer',
        'questionId': questionId,
        'level': level.wireName,
      }),
    );
    return _parse(json, InsightV2Turn.fromJson, 'TURN');
  }

  @override
  Future<InsightV2Turn> reply({
    required String sessionId,
    required String replyText,
  }) async {
    final json = await _send(
      method: 'POST',
      path: '/v1/insight-v2/sessions/$sessionId/turns',
      body: jsonEncode({'action': 'reply', 'replyText': replyText}),
    );
    return _parse(json, InsightV2Turn.fromJson, 'TURN');
  }

  @override
  Future<InsightV2Turn> regenerate({required String sessionId}) async {
    final json = await _send(
      method: 'POST',
      path: '/v1/insight-v2/sessions/$sessionId/turns',
      body: jsonEncode({'action': 'regenerate'}),
    );
    return _parse(json, InsightV2Turn.fromJson, 'TURN');
  }

  @override
  Future<InsightV2SessionDetail> getSession(String sessionId) async {
    final json = await _send(
      method: 'GET',
      path: '/v1/insight-v2/sessions/$sessionId',
    );
    return _parse(json, InsightV2SessionDetail.fromJson, 'SESSION');
  }

  @override
  Future<InsightV2HistoryPage> listSessions({int? limit, String? cursor}) async {
    final query = <String, String>{
      if (limit != null) 'limit': '$limit',
      if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
    };
    final json = await _send(
      method: 'GET',
      path: '/v1/insight-v2/sessions',
      query: query,
    );
    return _parse(json, InsightV2HistoryPage.fromJson, 'HISTORY');
  }

  @override
  Future<InsightV2PromptInfo> getPrompt({String? key}) async {
    final json = await _send(
      method: 'GET',
      path: '/v1/insight-v2/prompt',
      query: _keyQuery(key),
    );
    return _parse(json, InsightV2PromptInfo.fromJson, 'PROMPT');
  }

  @override
  Future<InsightV2PromptInfo> updatePrompt(String content, {String? key}) async {
    final json = await _send(
      method: 'PUT',
      path: '/v1/insight-v2/prompt',
      query: _keyQuery(key),
      body: jsonEncode({'content': content}),
    );
    return _parse(json, InsightV2PromptInfo.fromJson, 'PROMPT');
  }

  @override
  Future<InsightV2PromptInfo> resetPrompt({String? key}) async {
    final json = await _send(
      method: 'DELETE',
      path: '/v1/insight-v2/prompt',
      query: _keyQuery(key),
    );
    return _parse(json, InsightV2PromptInfo.fromJson, 'PROMPT');
  }

  Map<String, String>? _keyQuery(String? key) =>
      (key == null || key.isEmpty) ? null : {'key': key};

  T _parse<T>(
    Map<String, Object?> json,
    T Function(Map<String, Object?>) fromJson,
    String label,
  ) {
    try {
      return fromJson(json);
    } on FormatException catch (error) {
      _log('malformed $label response: ${error.message}', level: 1000);
      throw InsightApiException(
        code: 'MALFORMED_${label}_RESPONSE',
        message: error.message,
      );
    }
  }

  Future<Map<String, Object?>> _send({
    required String method,
    required String path,
    Map<String, String>? query,
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

    final endpoint = _endpoint(path, query);
    final headers = {
      'Authorization': 'Bearer $token',
      'X-Device-Id': deviceId,
      'Content-Type': 'application/json',
    };
    final stopwatch = Stopwatch()..start();
    _log('$method $path start host=${endpoint.host}:${endpoint.port}');

    http.Response response;
    try {
      final Future<http.Response> future;
      switch (method) {
        case 'GET':
          future = _httpClient.get(endpoint, headers: headers);
        case 'PUT':
          future = _httpClient.put(endpoint, headers: headers, body: body);
        case 'DELETE':
          future = _httpClient.delete(endpoint, headers: headers);
        default:
          future = _httpClient.post(endpoint, headers: headers, body: body);
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
        message: '无法建立安全连接（TLS 握手失败）。可临时使用 '
            '--dart-define=FAVORME_ALLOW_BAD_TLS=true（仅调试用），或改用受信任证书。详情：${e.message}',
      );
    } on SocketException catch (e) {
      throw InsightApiException(
        code: 'NETWORK_UNREACHABLE',
        message: '无法连接服务器（${e.message}）。'
            '模拟器常用 http://10.0.2.2:3000；真机请用局域网 IP 或 HTTPS 域名。',
      );
    } on http.ClientException catch (e) {
      throw InsightApiException(
        code: 'NETWORK_UNREACHABLE',
        message: '无法连接服务器：${e.message}。请确认 FAVORME_API_BASE_URL。',
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

  Uri _endpoint(String path, Map<String, String>? query) {
    final normalized = baseUrl.trim().replaceFirst(RegExp(r'/$'), '');
    final uri = Uri.parse('$normalized$path');
    if (query == null || query.isEmpty) {
      return uri;
    }
    return uri.replace(queryParameters: {...uri.queryParameters, ...query});
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
