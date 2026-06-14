import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import '../insight/widgets/bottom_question_input.dart';
import '../insight/widgets/loading_error_card.dart';
import '../profile/profile_api_client.dart';
import '../profile/profile_screen.dart';
import 'debug/prompt_debug_screen.dart';
import 'history/insight_v2_history_screen.dart';
import 'insight_v2_api_client.dart';
import 'insight_v2_view_model.dart';
import 'widgets/insight_v2_cards.dart';

/// 强制开启 prompt 调参入口（即使 release）：`--dart-define=FAVORME_PROMPT_DEBUG=true`。
const bool _kPromptDebugForced = bool.fromEnvironment('FAVORME_PROMPT_DEBUG');

/// 调参入口是否可见：debug 构建或显式开关。
bool get _promptDebugEnabled => kDebugMode || _kPromptDebugForced;

class InsightV2Screen extends StatefulWidget {
  const InsightV2Screen({
    super.key,
    required this.viewModel,
    required this.client,
    this.profileClient,
  });

  final InsightV2ViewModel viewModel;
  final InsightV2Client client;

  /// 个人档案入口；为空时 AppBar 不显示档案按钮（测试中可省）。
  final ProfileClient? profileClient;

  @override
  State<InsightV2Screen> createState() => _InsightV2ScreenState();
}

class _InsightV2ScreenState extends State<InsightV2Screen> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.viewModel.dilemma);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onBottomSubmit() {
    final text = _controller.text.trim();
    if (text.isEmpty) {
      return;
    }
    final vm = widget.viewModel;
    if (vm.state == InsightV2FlowState.needInfo) {
      vm.submitReply(text);
    } else {
      vm.startSession(text);
    }
    _controller.clear();
  }

  void _openHistory() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => InsightV2HistoryScreen(client: widget.client),
      ),
    );
  }

  void _openPromptDebug() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PromptDebugScreen(client: widget.client),
      ),
    );
  }

  void _openProfile() {
    final client = widget.profileClient;
    if (client == null) return;
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ProfileScreen(client: client),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: widget.viewModel,
      builder: (context, _) {
        final vm = widget.viewModel;
        return WillPopScope(
          onWillPop: () async {
            if (vm.canNavigateBackInFlow) {
              vm.resetToIdle();
              return false;
            }
            return true;
          },
          child: Scaffold(
            backgroundColor: AppColors.background,
            body: SafeArea(
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 480),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                    child: Column(
                      children: [
                        _Header(
                          onHistory: _openHistory,
                          onDebug: _promptDebugEnabled ? _openPromptDebug : null,
                          onProfile:
                              widget.profileClient == null ? null : _openProfile,
                        ),
                        Expanded(child: _buildBody(vm)),
                        const SizedBox(height: 16),
                        BottomQuestionInput(
                          controller: _controller,
                          enabled: vm.canEditInput,
                          onSubmitted: _onBottomSubmit,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildBody(InsightV2ViewModel vm) {
    return AnimatedSwitcher(
      duration: AppMotion.cardEntranceDuration,
      transitionBuilder: (child, animation) {
        return FadeTransition(
          opacity: animation,
          child: SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0, 0.04),
              end: Offset.zero,
            ).animate(animation),
            child: child,
          ),
        );
      },
      child: _contentFor(vm),
    );
  }

  Widget _contentFor(InsightV2ViewModel vm) {
    switch (vm.state) {
      case InsightV2FlowState.idle:
        return const _IdlePrompt(key: ValueKey('idle'));
      case InsightV2FlowState.starting:
      case InsightV2FlowState.submitting:
        return _FlowStack(
          key: const ValueKey('loading'),
          dilemma: vm.dilemma,
          child: _V2LoadingCard(copy: vm.loadingCopy),
        );
      case InsightV2FlowState.needInfo:
        return _FlowStack(
          key: const ValueKey('needInfo'),
          dilemma: vm.dilemma,
          child: V2ClarifyCard(clarifyQuestion: vm.clarifyQuestion ?? ''),
        );
      case InsightV2FlowState.answering:
        final question = vm.question;
        return _FlowStack(
          key: ValueKey('question-${question?.questionId ?? vm.askedCount}'),
          dilemma: vm.dilemma,
          child: question == null
              ? const SizedBox.shrink()
              : V2QuestionCard(
                  progressText: vm.progressText,
                  question: question,
                  enabled: !vm.isBusy,
                  onSelected: vm.submitLevel,
                  onRegenerate: vm.regenerate,
                ),
        );
      case InsightV2FlowState.showingResult:
        final report = vm.report;
        return _FlowStack(
          key: const ValueKey('result'),
          dilemma: vm.dilemma,
          child: report == null
              ? const SizedBox.shrink()
              : V2ResultCard(
                  report: report,
                  onAskAgain: () => vm.resetToIdle(),
                  onViewHistory: _openHistory,
                ),
        );
      case InsightV2FlowState.error:
        return _FlowStack(
          key: const ValueKey('error'),
          dilemma: vm.dilemma,
          child: LoadingErrorCard.error(
            message: vm.errorMessage ?? '刚刚没有连上服务。请检查网络后重试。',
            onRetry: vm.retry,
          ),
        );
    }
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.onHistory,
    this.onDebug,
    this.onProfile,
  });

  final VoidCallback onHistory;
  final VoidCallback? onDebug;
  final VoidCallback? onProfile;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Expanded(child: Text('点醒', style: AppTypography.action)),
        if (onDebug != null)
          IconButton(
            onPressed: onDebug,
            tooltip: 'Prompt 调参',
            icon: const Icon(Icons.tune_rounded, color: AppColors.textSecondary),
          ),
        if (onProfile != null)
          IconButton(
            onPressed: onProfile,
            tooltip: '个人档案',
            icon: const Icon(Icons.person_outline_rounded,
                color: AppColors.textSecondary),
          ),
        IconButton(
          onPressed: onHistory,
          tooltip: '历史记录',
          icon: const Icon(Icons.history_rounded, color: AppColors.textSecondary),
        ),
      ],
    );
  }
}

class _IdlePrompt extends StatelessWidget {
  const _IdlePrompt({super.key});

  @override
  Widget build(BuildContext context) {
    return const Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('你在纠结什么？', style: AppTypography.heading),
        SizedBox(height: 12),
        Text(
          '说出你正卡住的选择，我会用几道直觉小题，帮你照见心里早已倾向的那一边。',
          style: AppTypography.body,
        ),
      ],
    );
  }
}

class _FlowStack extends StatelessWidget {
  const _FlowStack({
    super.key,
    required this.dilemma,
    required this.child,
  });

  final String dilemma;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      reverse: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (dilemma.isNotEmpty)
            Align(
              alignment: Alignment.centerRight,
              child: Container(
                constraints: const BoxConstraints(maxWidth: 320),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.accent.withOpacity(0.13),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(dilemma, style: AppTypography.body),
              ),
            ),
          const SizedBox(height: 20),
          child,
        ],
      ),
    );
  }
}

class _V2LoadingCard extends StatefulWidget {
  const _V2LoadingCard({required this.copy});

  final String copy;

  @override
  State<_V2LoadingCard> createState() => _V2LoadingCardState();
}

class _V2LoadingCardState extends State<_V2LoadingCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: AppMotion.loadingBreathDuration,
      lowerBound: 0.72,
      upperBound: 1,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.loadingWash,
        borderRadius: BorderRadius.circular(AppRadii.card),
        border: Border.all(color: AppColors.borderSoft),
        boxShadow: AppShadows.soft,
      ),
      child: Semantics(
        label: widget.copy,
        child: FadeTransition(
          opacity: _controller,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(
                width: 10,
                height: 10,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: AppColors.accent,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(widget.copy, style: AppTypography.action),
            ],
          ),
        ),
      ),
    );
  }
}
