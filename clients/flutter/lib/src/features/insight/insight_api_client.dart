import 'dart:convert';

import 'package:http/http.dart' as http;

import 'device_id_store.dart';
import 'insight_models.dart';

abstract interface class InsightQuestionsClient {
  Future<InsightQuestionsResponse> generateQuestions({
    required String rawQuestion,
  });
}

class InsightApiException implements Exception {
  const InsightApiException({
    required this.message,
    this.code,
    this.requestId,
  });

  final String message;
  final String? code;
  final String? requestId;

  @override
  String toString() {
    return 'InsightApiException($code, $message, $requestId)';
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

    final response = await _httpClient.post(
      _endpoint('/v1/insight/questions'),
      headers: {
        'Authorization': 'Bearer $token',
        'X-Device-Id': deviceId,
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'rawQuestion': rawQuestion,
        'inputMode': 'text',
      }),
    );

    final decoded = _decodeObject(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw InsightApiException(
        code: decoded['code'] as String?,
        message: decoded['message'] as String? ?? 'Request failed.',
        requestId: decoded['requestId'] as String?,
      );
    }

    try {
      return InsightQuestionsResponse.fromJson(decoded);
    } on FormatException catch (error) {
      throw InsightApiException(
        code: 'MALFORMED_QUESTIONS_RESPONSE',
        message: error.message,
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
}
