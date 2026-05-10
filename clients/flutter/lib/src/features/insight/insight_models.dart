enum InsightDimension {
  innerPreference('inner_preference'),
  fearBoundary('fear_boundary'),
  activeVsAvoidance('active_vs_avoidance');

  const InsightDimension(this.wireName);

  final String wireName;

  static InsightDimension fromJson(Object? value) {
    for (final dimension in values) {
      if (dimension.wireName == value) {
        return dimension;
      }
    }
    throw const FormatException('Unknown insight dimension');
  }
}

class InsightOption {
  const InsightOption({
    required this.id,
    required this.label,
  });

  final String id;
  final String label;

  factory InsightOption.fromJson(Map<String, Object?> json) {
    final id = json['id'];
    final label = json['label'];
    if (id is! String || id.isEmpty) {
      throw const FormatException('Question option id is required');
    }
    if (label is! String || label.isEmpty) {
      throw const FormatException('Question option label is required');
    }
    return InsightOption(id: id, label: label);
  }

  Map<String, Object?> toJson() {
    return {
      'id': id,
      'label': label,
    };
  }
}

class InsightQuestion {
  const InsightQuestion({
    required this.id,
    required this.dimension,
    required this.title,
    required this.options,
  });

  final String id;
  final InsightDimension dimension;
  final String title;
  final List<InsightOption> options;

  factory InsightQuestion.fromJson(Map<String, Object?> json) {
    final id = json['id'];
    final title = json['title'];
    final options = json['options'];
    if (id is! String || id.isEmpty) {
      throw const FormatException('Question id is required');
    }
    if (title is! String || title.isEmpty) {
      throw const FormatException('Question title is required');
    }
    if (options is! List || options.isEmpty) {
      throw const FormatException('Question options are required');
    }
    return InsightQuestion(
      id: id,
      dimension: InsightDimension.fromJson(json['dimension']),
      title: title,
      options: options
          .map(
            (option) => InsightOption.fromJson(
              Map<String, Object?>.from(option as Map),
            ),
          )
          .toList(growable: false),
    );
  }

  Map<String, Object?> toJson() {
    return {
      'id': id,
      'dimension': dimension.wireName,
      'title': title,
      'options': options.map((option) => option.toJson()).toList(),
    };
  }
}

class InsightAnswer {
  const InsightAnswer({
    required this.questionId,
    required this.optionId,
  });

  final String questionId;
  final String optionId;

  Map<String, Object?> toJson() {
    return {
      'questionId': questionId,
      'optionId': optionId,
    };
  }
}

class InsightQuestionsResponse {
  const InsightQuestionsResponse({required this.questions});

  final List<InsightQuestion> questions;

  factory InsightQuestionsResponse.fromJson(Map<String, Object?> json) {
    final questionsJson = json['questions'];
    if (questionsJson is! List || questionsJson.length != 3) {
      throw const FormatException(
        'Questions response must contain exactly 3 questions',
      );
    }
    return InsightQuestionsResponse(
      questions: questionsJson
          .map(
            (question) => InsightQuestion.fromJson(
              Map<String, Object?>.from(question as Map),
            ),
          )
          .toList(growable: false),
    );
  }
}

class InsightSubmitResponse {
  const InsightSubmitResponse({required this.conclusion});

  final String conclusion;

  factory InsightSubmitResponse.fromJson(Map<String, Object?> json) {
    final conclusion = json['conclusion'];
    if (conclusion is! String || conclusion.isEmpty) {
      throw const FormatException('Submit response conclusion is required');
    }
    return InsightSubmitResponse(conclusion: conclusion);
  }
}
