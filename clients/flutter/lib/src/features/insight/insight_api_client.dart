import 'dart:async';
import 'dart:convert';
import 'dart:developer' as developer;
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';

import 'device_id_store.dart';
import 'insight_models.dart';

/// Per-request timeout for Insight API calls.
///
/// Override at build time with `--dart-define=FAVORME_API_TIMEOUT_SECONDS=...`
/// when the backend (or LLM) is slow during local development. The default of
/// 60s is intentionally generous because the first `/v1/insight/submit` call
/// includes LLM cold-start latency.
const Duration _defaultRequestTimeout = Duration(
  seconds: int.fromEnvironment(
    'FAVORME_API_TIMEOUT_SECONDS',
    defaultValue: 60,
  ),
);

const String _logName = 'insight.api';

abstract interface class InsightQuestionsClient {
  Future<InsightQuestionsResponse> generateQuestions({
    required String rawQuestion,
  });

  Future<InsightSubmitResponse> submitInsight({
    required String rawQuestion,
    required List<InsightQuestion> questions,
    required List<InsightAnswer> answers,
  });
}

class InsightApiException implements Exception {
  const InsightApiException({
    required this.message,
    this.statusCode,
    this.code,
    this.requestId,
  });

  final String message;
  final int? statusCode;
  final String? code;
  final String? requestId;

  @override
  String toString() {
    return 'InsightApiException($statusCode, $code, $message, $requestId)';
  }
}

class InsightApiClient implements InsightQuestionsClient {
  InsightApiClient({
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
  Future<InsightQuestionsResponse> generateQuestions({
    required String rawQuestion,
  }) async {
    final response = await _postJson(
      path: '/v1/insight/questions',
      body: jsonEncode({
        'rawQuestion': rawQuestion,
        'inputMode': 'text',
      }),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final decoded = _decodeErrorBody(response.body);
      final code = decoded['code'] as String?;
      final requestId = decoded['requestId'] as String?;
      _log(
        'POST /v1/insight/questions non-2xx status=${response.statusCode} '
        'code=$code requestId=$requestId',
        level: 900,
      );
      throw InsightApiException(
        statusCode: response.statusCode,
        code: code,
        message: decoded['message'] as String? ?? 'Request failed.',
        requestId: requestId,
      );
    }

    final decoded = _decodeObject(response.body);
    try {
      return InsightQuestionsResponse.fromJson(decoded);
    } on FormatException catch (error) {
      _log(
        'POST /v1/insight/questions malformed response: ${error.message}',
        level: 1000,
      );
      throw InsightApiException(
        statusCode: response.statusCode,
        code: 'MALFORMED_QUESTIONS_RESPONSE',
        message: error.message,
      );
    }
  }

  @override
  Future<InsightSubmitResponse> submitInsight({
    required String rawQuestion,
    required List<InsightQuestion> questions,
    required List<InsightAnswer> answers,
  }) async {
    final response = await _postJson(
      path: '/v1/insight/submit',
      body: jsonEncode({
        'rawQuestion': rawQuestion,
        'questions': questions.map((question) => question.toJson()).toList(),
        'answers': answers.map((answer) => answer.toJson()).toList(),
      }),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final decoded = _decodeErrorBody(response.body);
      final code = decoded['code'] as String?;
      final requestId = decoded['requestId'] as String?;
      _log(
        'POST /v1/insight/submit non-2xx status=${response.statusCode} '
        'code=$code requestId=$requestId',
        level: 900,
      );
      throw InsightApiException(
        statusCode: response.statusCode,
        code: code,
        message: decoded['message'] as String? ?? 'Request failed.',
        requestId: requestId,
      );
    }

    final decoded = _decodeObject(response.body);
    try {
      return InsightSubmitResponse.fromJson(decoded);
    } on FormatException catch (error) {
      _log(
        'POST /v1/insight/submit malformed response: ${error.message}',
        level: 1000,
      );
      throw InsightApiException(
        statusCode: response.statusCode,
        code: 'MALFORMED_SUBMIT_RESPONSE',
        message: error.message,
      );
    }
  }

  Future<http.Response> _postJson({
    required String path,
    required String body,
  }) async {
    final token = apiToken.trim();
    if (token.isEmpty) {
      _log('POST $path aborted: CLIENT_CONFIG_MISSING', level: 1000);
      throw const InsightApiException(
        code: 'CLIENT_CONFIG_MISSING',
        message: 'API token is not configured.',
      );
    }

    final deviceId = (await _deviceIdStore.readOrCreate()).trim();
    if (deviceId.isEmpty) {
      _log('POST $path aborted: DEVICE_ID_MISSING', level: 1000);
      throw const InsightApiException(
        code: 'DEVICE_ID_MISSING',
        message: 'Device id is not available.',
      );
    }

    final endpoint = _endpoint(path);
    final stopwatch = Stopwatch()..start();
    _log(
      'POST $path start host=${endpoint.host}:${endpoint.port} '
      'bytes=${body.length} timeout=${_requestTimeout.inSeconds}s',
    );

    try {
      final response = await _httpClient
          .post(
            endpoint,
            headers: {
              'Authorization': 'Bearer $token',
              'X-Device-Id': deviceId,
              'Content-Type': 'application/json',
            },
            body: body,
          )
          .timeout(_requestTimeout);
      _log(
        'POST $path -> ${response.statusCode} '
        'in ${stopwatch.elapsedMilliseconds}ms '
        'bytes=${response.bodyBytes.length}',
        level: response.statusCode >= 400 ? 900 : 0,
      );
      return response;
    } on TimeoutException catch (e) {
      _log(
        'POST $path TIMEOUT after ${stopwatch.elapsedMilliseconds}ms '
        '(limit=${_requestTimeout.inSeconds}s)',
        level: 1000,
        error: e,
      );
      throw const InsightApiException(
        code: 'NETWORK_TIMEOUT',
        message: 'Network request timed out.',
      );
    } on HandshakeException catch (e) {
      _log(
        'POST $path TLS handshake failed after ${stopwatch.elapsedMilliseconds}ms: ${e.message}',
        level: 1000,
        error: e,
      );
      throw InsightApiException(
        code: 'TLS_HANDSHAKE_FAILED',
        message: _tlsUserMessage(e),
      );
    } on SocketException catch (e) {
      _log(
        'POST $path SOCKET error after ${stopwatch.elapsedMilliseconds}ms: '
        'os=${e.osError?.errorCode} msg=${e.osError?.message ?? e.message}',
        level: 1000,
        error: e,
      );
      throw InsightApiException(
        code: 'NETWORK_UNREACHABLE',
        message: _socketUserMessage(e),
      );
    } on http.ClientException catch (e) {
      _log(
        'POST $path ClientException after ${stopwatch.elapsedMilliseconds}ms: ${e.message}',
        level: 1000,
        error: e,
      );
      final lower = e.message.toLowerCase();
      if (lower.contains('handshake') ||
          lower.contains('certificate') ||
          lower.contains('tls')) {
        throw InsightApiException(
          code: 'TLS_HANDSHAKE_FAILED',
          message:
              '无法建立安全连接（证书校验失败）。若后端为自签名 HTTPS，可临时使用 --dart-define=FAVORME_ALLOW_BAD_TLS=true（仅调试用），或改用 http:// 与文档中的 cleartext 配置。详情：${e.message}',
        );
      }
      throw InsightApiException(
        code: 'NETWORK_UNREACHABLE',
        message:
            '无法连接服务器：${e.message}。请确认 FAVORME_API_BASE_URL：Android 模拟器常用 http://10.0.2.2:3000；真机请使用电脑的局域网 IP 或 HTTPS 域名。',
      );
    }
  }

  /// Emit a debug-only structured log on the `insight.api` channel.
  ///
  /// Gated by [kDebugMode] so release builds never write request metadata to
  /// `logcat` / DevTools, even though we already restrict ourselves to
  /// metadata (URL host, status, duration, error code) and never log raw
  /// question bodies, answers, or server message strings.
  static void _log(String message, {Object? error, int level = 0}) {
    if (!kDebugMode) {
      return;
    }
    developer.log(message, name: _logName, error: error, level: level);
  }

  /// Default client uses [IOClient] so we can optionally relax TLS in local dev
  /// (`FAVORME_ALLOW_BAD_TLS=true`) when curl trusts a cert the app does not.
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

  static String _tlsUserMessage(HandshakeException e) {
    return '无法建立安全连接（TLS 握手失败）。若 curl 可用而 App 不行，多为证书不被系统信任：'
        '可临时添加 --dart-define=FAVORME_ALLOW_BAD_TLS=true（仅调试用），或改用受信任证书 / http:// 联调。详情：${e.message}';
  }

  static String _socketUserMessage(SocketException e) {
    final hint = e.message.contains('10.0.2.2')
        ? '10.0.2.2 仅在模拟器上指向本机；真机请改为电脑的局域网 IP 或公网 HTTPS。'
        : '请检查 FAVORME_API_BASE_URL、本机防火墙与手机网络。';
    return '无法连接服务器（${e.message}）。$hint';
  }

  Uri _endpoint(String path) {
    final normalized = baseUrl.trim().replaceFirst(RegExp(r'/$'), '');
    return Uri.parse('$normalized$path');
  }

  Map<String, Object?> _decodeObject(String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map) {
        return Map<String, Object?>.from(decoded);
      }
    } on FormatException {
      // Fall through to typed error below.
    }
    throw const InsightApiException(
      code: 'MALFORMED_API_RESPONSE',
      message: 'API response is not valid JSON.',
    );
  }

  Map<String, Object?> _decodeErrorBody(String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map) {
        return Map<String, Object?>.from(decoded);
      }
    } on FormatException {
      // Treat malformed error bodies as safe local errors.
    }
    return const {
      'code': 'API_ERROR',
      'message': 'Request failed.',
    };
  }
}
