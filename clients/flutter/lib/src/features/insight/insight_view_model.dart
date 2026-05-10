import 'package:flutter/foundation.dart';

import '../../theme/app_theme.dart';
import 'insight_api_client.dart';
import 'insight_models.dart';

enum InsightFlowState {
  idle,
  questionSubmitted,
  generatingQuestions,
  answeringQuestion,
  submittingAnswers,
  showingResult,
  error,
}

enum _RetryTarget {
  generateQuestions,
  submitAnswers,
}

class InsightViewModel extends ChangeNotifier {
  InsightViewModel({required InsightQuestionsClient questionsClient})
      : _questionsClient = questionsClient;

  final InsightQuestionsClient _questionsClient;

  InsightFlowState _state = InsightFlowState.idle;
  String _rawQuestion = '';
  String? _errorMessage;
  List<InsightQuestion> _questions = const [];
  final Map<String, String> _selectedAnswers = {};
  int _currentQuestionIndex = 0;
  int _requestSeq = 0;
  bool _submitInFlight = false;
  String? _conclusion;
  _RetryTarget? _retryTarget;
  bool _invalidQuestionError = false;

  InsightFlowState get state => _state;
  String get rawQuestion => _rawQuestion;
  String? get errorMessage => _errorMessage;
  List<InsightQuestion> get questions => _questions;
  Map<String, String> get selectedAnswers => Map.unmodifiable(_selectedAnswers);
  String? get conclusion => _conclusion;
  int get currentQuestionIndex => _currentQuestionIndex;
  bool get isBusy =>
      _state == InsightFlowState.questionSubmitted ||
      _state == InsightFlowState.generatingQuestions ||
      _state == InsightFlowState.submittingAnswers;
  bool get submittingAnswers => _state == InsightFlowState.submittingAnswers;
  bool get showingResult => _state == InsightFlowState.showingResult;
  bool get canNavigateBackInFlow => _state == InsightFlowState.answeringQuestion;
  bool get canEditQuestionInput =>
      _state == InsightFlowState.idle ||
      (_state == InsightFlowState.error && _invalidQuestionError);

  InsightQuestion? get currentQuestion {
    if (_questions.isEmpty) {
      return null;
    }
    return _questions[_currentQuestionIndex];
  }

  String get progressText => '第 ${_currentQuestionIndex + 1} / 3 问';

  String? selectedOptionIdFor(InsightQuestion question) {
    return _selectedAnswers[question.id];
  }

  Future<void> submitQuestion(String value) async {
    final trimmed = value.trim();
    if (trimmed.isEmpty || isBusy) {
      return;
    }

    final seq = ++_requestSeq;
    _rawQuestion = trimmed;
    _errorMessage = null;
    _questions = const [];
    _selectedAnswers.clear();
    _currentQuestionIndex = 0;
    _submitInFlight = false;
    _conclusion = null;
    _retryTarget = null;
    _invalidQuestionError = false;
    _setState(InsightFlowState.questionSubmitted);
    _setState(InsightFlowState.generatingQuestions);

    try {
      await Future<void>.delayed(AppMotion.loadingMinimumDuration);
      final response = await _questionsClient.generateQuestions(
        rawQuestion: trimmed,
      );
      if (seq != _requestSeq) {
        return;
      }
      _questions = response.questions;
      _currentQuestionIndex = 0;
      _retryTarget = null;
      _setState(InsightFlowState.answeringQuestion);
    } on InsightApiException catch (error) {
      if (seq != _requestSeq) {
        return;
      }
      _retryTarget = _RetryTarget.generateQuestions;
      _invalidQuestionError = error.code == 'INVALID_QUESTION_INPUT';
      _errorMessage = _messageFor(error);
      _setState(InsightFlowState.error);
    } on Object {
      if (seq != _requestSeq) {
        return;
      }
      _retryTarget = _RetryTarget.generateQuestions;
      _invalidQuestionError = false;
      _errorMessage = '刚刚没有连上服务。请检查网络后重试。';
      _setState(InsightFlowState.error);
    }
  }

  Future<void> retry() {
    if (isBusy) {
      return Future<void>.value();
    }
    switch (_retryTarget) {
      case _RetryTarget.submitAnswers:
        return _submitAnswers();
      case _RetryTarget.generateQuestions:
      case null:
        return submitQuestion(_rawQuestion);
    }
  }

  Future<void> selectOption(InsightQuestion question, InsightOption option) async {
    if (isBusy || _state != InsightFlowState.answeringQuestion) {
      return;
    }

    _selectedAnswers[question.id] = option.id;
    notifyListeners();
    await Future<void>.delayed(AppMotion.selectionDuration);

    if (_state != InsightFlowState.answeringQuestion) {
      return;
    }

    if (_currentQuestionIndex < _questions.length - 1) {
      _currentQuestionIndex += 1;
      notifyListeners();
      return;
    }

    await _submitAnswers();
  }

  void goBack() {
    if (isBusy || _state != InsightFlowState.answeringQuestion) {
      return;
    }
    if (_currentQuestionIndex > 0) {
      _currentQuestionIndex -= 1;
      notifyListeners();
      return;
    }
    resetToIdle(keepRawQuestion: true);
  }

  void resetToIdle({bool keepRawQuestion = false}) {
    _requestSeq++;
    if (!keepRawQuestion) {
      _rawQuestion = '';
    }
    _errorMessage = null;
    _questions = const [];
    _selectedAnswers.clear();
    _currentQuestionIndex = 0;
    _submitInFlight = false;
    _conclusion = null;
    _retryTarget = null;
    _invalidQuestionError = false;
    _setState(InsightFlowState.idle);
  }

  Future<void> _submitAnswers() async {
    if (_submitInFlight || _questions.length != 3) {
      return;
    }

    final answers = <InsightAnswer>[];
    for (final question in _questions) {
      final optionId = _selectedAnswers[question.id];
      if (optionId == null) {
        return;
      }
      answers.add(InsightAnswer(questionId: question.id, optionId: optionId));
    }

    final seq = ++_requestSeq;
    _submitInFlight = true;
    _errorMessage = null;
    _setState(InsightFlowState.submittingAnswers);

    try {
      final response = await _questionsClient.submitInsight(
        rawQuestion: _rawQuestion,
        questions: _questions,
        answers: answers,
      );
      if (seq != _requestSeq) {
        return;
      }
      _conclusion = response.conclusion;
      _submitInFlight = false;
      _retryTarget = null;
      _invalidQuestionError = false;
      _setState(InsightFlowState.showingResult);
    } on InsightApiException catch (error) {
      if (seq != _requestSeq) {
        return;
      }
      _submitInFlight = false;
      _retryTarget = _RetryTarget.submitAnswers;
      _invalidQuestionError = false;
      _errorMessage = _messageFor(error);
      _setState(InsightFlowState.error);
    } on Object {
      if (seq != _requestSeq) {
        return;
      }
      _submitInFlight = false;
      _retryTarget = _RetryTarget.submitAnswers;
      _invalidQuestionError = false;
      _errorMessage = '刚刚没有连上服务。请检查网络后重试。';
      _setState(InsightFlowState.error);
    }
  }

  void _setState(InsightFlowState nextState) {
    _state = nextState;
    notifyListeners();
  }

  String _messageFor(InsightApiException error) {
    if (error.code == 'INVALID_QUESTION_INPUT') {
      return '这个问题还不够明确。换个更具体的说法，我再帮你拆成三问。';
    }
    return '刚刚没有连上服务。请检查网络后重试。';
  }
}
