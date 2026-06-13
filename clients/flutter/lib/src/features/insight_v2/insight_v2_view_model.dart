import 'package:flutter/foundation.dart';

import '../insight/insight_api_client.dart' show InsightApiException;
import 'insight_v2_api_client.dart';
import 'insight_v2_models.dart';

enum InsightV2FlowState {
  idle,
  starting,
  needInfo,
  answering,
  submitting,
  showingResult,
  error,
}

/// 重试目标：错误发生时记住要重放哪一步。
enum _RetryTarget { start, answer, reply, regenerate }

/// 「点醒」动态问卷的会话状态机（客户端侧）。
///
/// 服务端是收题权威；客户端只负责：发起会话、按状态渲染、回传五级选择/追问补充、
/// 请求换题，以及失败重试。题量动态（3–5），进度以 askedCount 体现。
class InsightV2ViewModel extends ChangeNotifier {
  InsightV2ViewModel({required InsightV2Client client}) : _client = client;

  final InsightV2Client _client;

  InsightV2FlowState _state = InsightV2FlowState.idle;
  String _dilemma = '';
  String? _sessionId;
  String? _errorMessage;
  int _requestSeq = 0;

  InsightV2Question? _question;
  String? _clarifyQuestion;
  InsightV2Report? _report;
  int _askedCount = 0;

  _RetryTarget? _retryTarget;
  InsightV2Level? _retryLevel;
  String? _retryText;

  InsightV2FlowState get state => _state;
  String get dilemma => _dilemma;
  String? get sessionId => _sessionId;
  String? get errorMessage => _errorMessage;
  InsightV2Question? get question => _question;
  String? get clarifyQuestion => _clarifyQuestion;
  InsightV2Report? get report => _report;
  int get askedCount => _askedCount;

  bool get isBusy =>
      _state == InsightV2FlowState.starting ||
      _state == InsightV2FlowState.submitting;

  /// 底部输入框何时可编辑：首页发起，或追问阶段补充信息。
  bool get canEditInput =>
      _state == InsightV2FlowState.idle ||
      _state == InsightV2FlowState.needInfo;

  bool get canNavigateBackInFlow =>
      _state == InsightV2FlowState.answering ||
      _state == InsightV2FlowState.needInfo;

  /// 动态进度文案：当前正在回答第几问（题量不固定，故不写分母）。
  String get progressText => '第 $_askedCount 问 · 凭直觉选';

  String get loadingCopy {
    if (_state == InsightV2FlowState.starting) {
      return '正在读懂你的纠结…';
    }
    if (_askedCount >= 2) {
      return '正在生成你的点醒…';
    }
    return '正在想下一个问题…';
  }

  Future<void> startSession(String value) async {
    final trimmed = value.trim();
    if (trimmed.isEmpty || isBusy) {
      return;
    }
    _resetTransient();
    _dilemma = trimmed;
    _sessionId = null;
    final seq = ++_requestSeq;
    _setState(InsightV2FlowState.starting);

    await _run(
      seq: seq,
      target: _RetryTarget.start,
      action: () => _client.startSession(dilemma: trimmed),
    );
  }

  Future<void> submitLevel(InsightV2Level level) async {
    final question = _question;
    final sessionId = _sessionId;
    if (question == null ||
        sessionId == null ||
        _state != InsightV2FlowState.answering) {
      return;
    }
    final seq = ++_requestSeq;
    _retryLevel = level;
    _setState(InsightV2FlowState.submitting);

    await _run(
      seq: seq,
      target: _RetryTarget.answer,
      action: () => _client.answer(
        sessionId: sessionId,
        questionId: question.questionId,
        level: level,
      ),
    );
  }

  Future<void> submitReply(String value) async {
    final trimmed = value.trim();
    final sessionId = _sessionId;
    if (trimmed.isEmpty ||
        sessionId == null ||
        _state != InsightV2FlowState.needInfo) {
      return;
    }
    final seq = ++_requestSeq;
    _retryText = trimmed;
    _setState(InsightV2FlowState.submitting);

    await _run(
      seq: seq,
      target: _RetryTarget.reply,
      action: () => _client.reply(sessionId: sessionId, replyText: trimmed),
    );
  }

  Future<void> regenerate() async {
    final sessionId = _sessionId;
    if (sessionId == null || _state != InsightV2FlowState.answering) {
      return;
    }
    final seq = ++_requestSeq;
    _setState(InsightV2FlowState.submitting);

    await _run(
      seq: seq,
      target: _RetryTarget.regenerate,
      action: () => _client.regenerate(sessionId: sessionId),
    );
  }

  Future<void> retry() {
    if (isBusy) {
      return Future<void>.value();
    }
    switch (_retryTarget) {
      case _RetryTarget.start:
      case null:
        return startSession(_dilemma);
      case _RetryTarget.answer:
        final level = _retryLevel;
        if (level == null) {
          return startSession(_dilemma);
        }
        _state = InsightV2FlowState.answering;
        return submitLevel(level);
      case _RetryTarget.reply:
        final text = _retryText;
        if (text == null) {
          return Future<void>.value();
        }
        _state = InsightV2FlowState.needInfo;
        return submitReply(text);
      case _RetryTarget.regenerate:
        _state = InsightV2FlowState.answering;
        return regenerate();
    }
  }

  void resetToIdle({bool keepDilemma = false}) {
    _requestSeq++;
    if (!keepDilemma) {
      _dilemma = '';
    }
    _sessionId = null;
    _resetTransient();
    _setState(InsightV2FlowState.idle);
  }

  Future<void> _run({
    required int seq,
    required _RetryTarget target,
    required Future<InsightV2Turn> Function() action,
  }) async {
    try {
      final turn = await action();
      if (seq != _requestSeq) {
        return;
      }
      _retryTarget = null;
      _applyTurn(turn);
    } on InsightApiException catch (error) {
      if (seq != _requestSeq) {
        return;
      }
      _retryTarget = target;
      _errorMessage = _messageFor(error);
      _setState(InsightV2FlowState.error);
    } on Object {
      if (seq != _requestSeq) {
        return;
      }
      _retryTarget = target;
      _errorMessage = '刚刚没有连上服务。请检查网络后重试。';
      _setState(InsightV2FlowState.error);
    }
  }

  void _applyTurn(InsightV2Turn turn) {
    _sessionId = turn.sessionId;
    _askedCount = turn.askedCount;
    switch (turn.status) {
      case InsightV2Status.needInfo:
        _clarifyQuestion = turn.clarifyQuestion;
        _question = null;
        _setState(InsightV2FlowState.needInfo);
      case InsightV2Status.questioning:
        _question = turn.question;
        _clarifyQuestion = null;
        _setState(InsightV2FlowState.answering);
      case InsightV2Status.finished:
        _report = turn.report;
        _question = null;
        _clarifyQuestion = null;
        _setState(InsightV2FlowState.showingResult);
    }
  }

  void _resetTransient() {
    _errorMessage = null;
    _question = null;
    _clarifyQuestion = null;
    _report = null;
    _askedCount = 0;
    _retryTarget = null;
    _retryLevel = null;
    _retryText = null;
  }

  void _setState(InsightV2FlowState next) {
    _state = next;
    notifyListeners();
  }

  String _messageFor(InsightApiException error) {
    switch (error.code) {
      case 'INVALID_QUESTION_INPUT':
        final server = error.message.trim();
        return server.isNotEmpty
            ? server
            : '这个问题还不够明确。换个更具体的说法，我再陪你想想。';
      case 'TLS_HANDSHAKE_FAILED':
      case 'NETWORK_UNREACHABLE':
      case 'NETWORK_TIMEOUT':
        return error.message;
      case 'SESSION_ALREADY_FINISHED':
        return '这次的点醒已经完成啦，开启新的一次吧。';
      default:
        return '刚刚没有连上服务。请检查网络后重试。';
    }
  }
}
