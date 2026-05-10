import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'device_id_store.dart';
import 'insight_models.dart';

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
  })  : _deviceIdStore = deviceIdStore,
        _httpClient = httpClient ?? http.Client();

  final String baseUrl;
  final String apiToken;
  final DeviceIdStore _deviceIdStore;
  final http.Client _httpClient;

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
      throw InsightApiException(
        statusCode: response.statusCode,
        code: decoded['code'] as String?,
        message: decoded['message'] as String? ?? 'Request failed.',
        requestId: decoded['requestId'] as String?,
      );
    }

    final decoded = _decodeObject(response.body);
    try {
      return InsightQuestionsResponse.fromJson(decoded);
    } on FormatException catch (error) {
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
      throw InsightApiException(
        statusCode: response.statusCode,
        code: decoded['code'] as String?,
        message: decoded['message'] as String? ?? 'Request failed.',
        requestId: decoded['requestId'] as String?,
      );
    }

    final decoded = _decodeObject(response.body);
    try {
      return InsightSubmitResponse.fromJson(decoded);
    } on FormatException catch (error) {
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

    try {
      return await _httpClient
          .post(
            _endpoint(path),
            headers: {
              'Authorization': 'Bearer $token',
              'X-Device-Id': deviceId,
              'Content-Type': 'application/json',
            },
            body: body,
          )
          .timeout(const Duration(seconds: 20));
    } on TimeoutException {
      throw const InsightApiException(
        code: 'NETWORK_TIMEOUT',
        message: 'Network request timed out.',
      );
    } on http.ClientException {
      throw const InsightApiException(
        code: 'NETWORK_ERROR',
        message: 'Network request failed.',
      );
    }
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
