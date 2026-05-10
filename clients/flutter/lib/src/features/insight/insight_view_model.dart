import 'package:flutter/foundation.dart';

import '../../theme/app_theme.dart';
import 'insight_api_client.dart';
import 'insight_models.dart';

enum InsightFlowState {
  idle,
  questionSubmitted,
  generatingQuestions,
  answeringQuestion,
  error,
}

class InsightViewModel extends ChangeNotifier {
  InsightViewModel({required InsightQuestionsClient questionsClient})
      : _questionsClient = questionsClient;

  final InsightQuestionsClient _questionsClient;

  InsightFlowState _state = InsightFlowState.idle;
  String _rawQuestion = '';
  String? _errorMessage;
  List<InsightQuestion> _questions = const [];
  int _currentQuestionIndex = 0;
  int _requestSeq = 0;

  InsightFlowState get state => _state;
  String get rawQuestion => _rawQuestion;
  String? get errorMessage => _errorMessage;
  List<InsightQuestion> get questions => _questions;
  int get currentQuestionIndex => _currentQuestionIndex;
  bool get isBusy =>
      _state == InsightFlowState.questionSubmitted ||
      _state == InsightFlowState.generatingQuestions;

  InsightQuestion? get currentQuestion {
    if (_questions.isEmpty) {
      return null;
    }
    return _questions[_currentQuestionIndex];
  }

  String get progressText => '第 ${_currentQuestionIndex + 1} / 3 问';

  Future<void> submitQuestion(String value) async {
    final trimmed = value.trim();
    if (trimmed.isEmpty || isBusy) {
      return;
    }

    final seq = ++_requestSeq;
    _rawQuestion = trimmed;
    _errorMessage = null;
    _questions = const [];
    _currentQuestionIndex = 0;
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
      _setState(InsightFlowState.answeringQuestion);
    } on InsightApiException catch (error) {
      if (seq != _requestSeq) {
        return;
      }
      _errorMessage = _messageFor(error);
      _setState(InsightFlowState.error);
    } on Object {
      if (seq != _requestSeq) {
        return;
      }
      _errorMessage = '刚刚没有连上服务。请检查网络后重试。';
      _setState(InsightFlowState.error);
    }
  }

  Future<void> retry() {
    return submitQuestion(_rawQuestion);
  }

  void resetToIdle() {
    _requestSeq++;
    _rawQuestion = '';
    _errorMessage = null;
    _questions = const [];
    _currentQuestionIndex = 0;
    _setState(InsightFlowState.idle);
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
