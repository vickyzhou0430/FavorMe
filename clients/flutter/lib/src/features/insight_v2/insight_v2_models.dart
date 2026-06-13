// 「点醒」动态问卷 V2 的客户端数据模型。
//
// 对接后端 `/v1/insight-v2/*`（见 docs/tasks/004 + ADR-005）。
// 后端下发的 JSON 为 camelCase，模型字段与之一一对应。

/// 会话状态机的三态。
enum InsightV2Status {
  needInfo('need_info'),
  questioning('questioning'),
  finished('finished');

  const InsightV2Status(this.wireName);

  final String wireName;

  static InsightV2Status fromJson(Object? value) {
    for (final status in values) {
      if (status.wireName == value) {
        return status;
      }
    }
    throw const FormatException('Unknown insight-v2 status');
  }
}

/// 五级量表程度。
enum InsightV2Level {
  a('a', 'A'),
  leanA('lean_a', '偏A'),
  middle('middle', '中间'),
  leanB('lean_b', '偏B'),
  b('b', 'B');

  const InsightV2Level(this.wireName, this.shortLabel);

  final String wireName;
  final String shortLabel;

  static InsightV2Level fromJson(Object? value) {
    for (final level in values) {
      if (level.wireName == value) {
        return level;
      }
    }
    throw const FormatException('Unknown insight-v2 level');
  }
}

/// 一道题（status=questioning 时的 content）。
class InsightV2Question {
  const InsightV2Question({
    required this.questionId,
    required this.strategy,
    required this.strategyLabel,
    required this.questionText,
    required this.optionA,
    required this.optionB,
  });

  final String questionId;
  final String strategy;
  final String strategyLabel;
  final String questionText;
  final String optionA;
  final String optionB;

  factory InsightV2Question.fromJson(Map<String, Object?> json) {
    final questionId = json['questionId'];
    final questionText = json['questionText'];
    final optionA = json['optionA'];
    final optionB = json['optionB'];
    if (questionId is! String || questionId.isEmpty) {
      throw const FormatException('questionId is required');
    }
    if (questionText is! String || questionText.isEmpty) {
      throw const FormatException('questionText is required');
    }
    if (optionA is! String || optionA.isEmpty || optionB is! String || optionB.isEmpty) {
      throw const FormatException('optionA/optionB are required');
    }
    return InsightV2Question(
      questionId: questionId,
      strategy: json['strategy'] as String? ?? '',
      strategyLabel: json['strategyLabel'] as String? ?? '',
      questionText: questionText,
      optionA: optionA,
      optionB: optionB,
    );
  }
}

/// 已作答题目的轨迹项（结果页/历史详情展示）。
class InsightV2TrajectoryItem {
  const InsightV2TrajectoryItem({
    required this.questionId,
    required this.strategy,
    required this.strategyLabel,
    required this.questionText,
    required this.optionA,
    required this.optionB,
    required this.level,
  });

  final String questionId;
  final String strategy;
  final String strategyLabel;
  final String questionText;
  final String optionA;
  final String optionB;
  final InsightV2Level level;

  factory InsightV2TrajectoryItem.fromJson(Map<String, Object?> json) {
    return InsightV2TrajectoryItem(
      questionId: json['questionId'] as String? ?? '',
      strategy: json['strategy'] as String? ?? '',
      strategyLabel: json['strategyLabel'] as String? ?? '',
      questionText: json['questionText'] as String? ?? '',
      optionA: json['optionA'] as String? ?? '',
      optionB: json['optionB'] as String? ?? '',
      level: InsightV2Level.fromJson(json['level']),
    );
  }
}

/// 点醒报告（status=finished 时的 content）。
class InsightV2Report {
  const InsightV2Report({
    required this.awakeningQuote,
    required this.tendency,
    required this.analysis,
    required this.actionAdvice,
    required this.trajectory,
  });

  final String awakeningQuote;
  final String tendency;
  final String analysis;
  final String actionAdvice;
  final List<InsightV2TrajectoryItem> trajectory;

  factory InsightV2Report.fromJson(Map<String, Object?> json) {
    final awakeningQuote = json['awakeningQuote'];
    if (awakeningQuote is! String || awakeningQuote.isEmpty) {
      throw const FormatException('awakeningQuote is required');
    }
    return InsightV2Report(
      awakeningQuote: awakeningQuote,
      tendency: json['tendency'] as String? ?? '',
      analysis: json['analysis'] as String? ?? '',
      actionAdvice: json['actionAdvice'] as String? ?? '',
      trajectory: _parseTrajectory(json['trajectory']),
    );
  }
}

List<InsightV2TrajectoryItem> _parseTrajectory(Object? value) {
  if (value is! List) {
    return const [];
  }
  return value
      .whereType<Map>()
      .map((item) => InsightV2TrajectoryItem.fromJson(
            Map<String, Object?>.from(item),
          ))
      .toList(growable: false);
}

/// 一轮交互的结果（start / turn 接口返回）。
class InsightV2Turn {
  const InsightV2Turn({
    required this.sessionId,
    required this.status,
    required this.askedCount,
    required this.clarifyCount,
    this.clarifyQuestion,
    this.question,
    this.report,
  });

  final String sessionId;
  final InsightV2Status status;
  final int askedCount;
  final int clarifyCount;
  final String? clarifyQuestion;
  final InsightV2Question? question;
  final InsightV2Report? report;

  factory InsightV2Turn.fromJson(Map<String, Object?> json) {
    final sessionId = json['sessionId'];
    if (sessionId is! String || sessionId.isEmpty) {
      throw const FormatException('sessionId is required');
    }
    final status = InsightV2Status.fromJson(json['status']);
    final content = json['content'];
    final contentMap = content is Map
        ? Map<String, Object?>.from(content)
        : const <String, Object?>{};

    return InsightV2Turn(
      sessionId: sessionId,
      status: status,
      askedCount: (json['askedCount'] as num?)?.toInt() ?? 0,
      clarifyCount: (json['clarifyCount'] as num?)?.toInt() ?? 0,
      clarifyQuestion: status == InsightV2Status.needInfo
          ? contentMap['clarifyQuestion'] as String?
          : null,
      question: status == InsightV2Status.questioning
          ? InsightV2Question.fromJson(contentMap)
          : null,
      report: status == InsightV2Status.finished
          ? InsightV2Report.fromJson(contentMap)
          : null,
    );
  }
}

/// 历史列表项。
class InsightV2SessionSummary {
  const InsightV2SessionSummary({
    required this.id,
    required this.dilemma,
    required this.status,
    required this.askedCount,
    this.awakeningQuote,
    this.tendency,
    this.createdAt,
  });

  final String id;
  final String dilemma;
  final InsightV2Status status;
  final int askedCount;
  final String? awakeningQuote;
  final String? tendency;
  final DateTime? createdAt;

  factory InsightV2SessionSummary.fromJson(Map<String, Object?> json) {
    final id = json['id'];
    if (id is! String || id.isEmpty) {
      throw const FormatException('session id is required');
    }
    return InsightV2SessionSummary(
      id: id,
      dilemma: json['dilemma'] as String? ?? '',
      status: InsightV2Status.fromJson(json['status']),
      askedCount: (json['askedCount'] as num?)?.toInt() ?? 0,
      awakeningQuote: json['awakeningQuote'] as String?,
      tendency: json['tendency'] as String?,
      createdAt: _parseDate(json['createdAt']),
    );
  }
}

/// 历史分页结果。
class InsightV2HistoryPage {
  const InsightV2HistoryPage({required this.items, this.nextCursor});

  final List<InsightV2SessionSummary> items;
  final String? nextCursor;

  factory InsightV2HistoryPage.fromJson(Map<String, Object?> json) {
    final items = json['items'];
    return InsightV2HistoryPage(
      items: items is List
          ? items
              .whereType<Map>()
              .map((item) => InsightV2SessionSummary.fromJson(
                    Map<String, Object?>.from(item),
                  ))
              .toList(growable: false)
          : const [],
      nextCursor: json['nextCursor'] as String?,
    );
  }
}

/// 历史详情（GET session）。
class InsightV2SessionDetail {
  const InsightV2SessionDetail({
    required this.sessionId,
    required this.status,
    required this.dilemma,
    required this.askedCount,
    required this.trajectory,
    this.report,
    this.createdAt,
  });

  final String sessionId;
  final InsightV2Status status;
  final String dilemma;
  final int askedCount;
  final List<InsightV2TrajectoryItem> trajectory;
  final InsightV2Report? report;
  final DateTime? createdAt;

  factory InsightV2SessionDetail.fromJson(Map<String, Object?> json) {
    final sessionId = json['sessionId'];
    if (sessionId is! String || sessionId.isEmpty) {
      throw const FormatException('sessionId is required');
    }
    final reportJson = json['report'];
    return InsightV2SessionDetail(
      sessionId: sessionId,
      status: InsightV2Status.fromJson(json['status']),
      dilemma: json['dilemma'] as String? ?? '',
      askedCount: (json['askedCount'] as num?)?.toInt() ?? 0,
      trajectory: _parseTrajectory(json['trajectory']),
      report: reportJson is Map
          ? InsightV2Report.fromJson(Map<String, Object?>.from(reportJson))
          : null,
      createdAt: _parseDate(json['createdAt']),
    );
  }
}

DateTime? _parseDate(Object? value) {
  if (value is String && value.isNotEmpty) {
    return DateTime.tryParse(value);
  }
  return null;
}

/// Prompt 运行时调参信息（debug 用）。
class InsightV2PromptInfo {
  const InsightV2PromptInfo({
    required this.key,
    required this.enabled,
    required this.hasOverride,
    required this.defaultPrompt,
    required this.effectivePrompt,
    this.updatedAt,
    this.updatedBy,
  });

  final String key;
  final bool enabled;
  final bool hasOverride;
  final String defaultPrompt;
  final String effectivePrompt;
  final DateTime? updatedAt;
  final String? updatedBy;

  factory InsightV2PromptInfo.fromJson(Map<String, Object?> json) {
    final override = json['override'];
    final overrideMap = override is Map
        ? Map<String, Object?>.from(override)
        : const <String, Object?>{};
    return InsightV2PromptInfo(
      key: json['key'] as String? ?? '',
      enabled: json['enabled'] == true,
      hasOverride: json['hasOverride'] == true,
      defaultPrompt: json['defaultPrompt'] as String? ?? '',
      effectivePrompt: json['effectivePrompt'] as String? ?? '',
      updatedAt: _parseDate(overrideMap['updatedAt']),
      updatedBy: overrideMap['updatedBy'] as String?,
    );
  }
}
