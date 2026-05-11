import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import 'insight_view_model.dart';
import 'widgets/bottom_question_input.dart';
import 'widgets/loading_error_card.dart';
import 'widgets/question_card.dart';
import 'widgets/result_card.dart';

class InsightFlowScreen extends StatefulWidget {
  const InsightFlowScreen({
    super.key,
    required this.viewModel,
  });

  final InsightViewModel viewModel;

  @override
  State<InsightFlowScreen> createState() => _InsightFlowScreenState();
}

class _InsightFlowScreenState extends State<InsightFlowScreen> {
  late final TextEditingController _controller;
  InsightFlowState _previousViewModelState = InsightFlowState.idle;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.viewModel.rawQuestion);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: widget.viewModel,
      builder: (context, _) {
        final viewModel = widget.viewModel;
        // After send we clear the field; restore draft when invalid-question error returns.
        if (viewModel.state == InsightFlowState.error &&
            viewModel.canEditQuestionInput &&
            _previousViewModelState == InsightFlowState.generatingQuestions) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted) {
              return;
            }
            final vm = widget.viewModel;
            if (vm.state == InsightFlowState.error && vm.canEditQuestionInput) {
              if (_controller.text != vm.rawQuestion) {
                _controller.text = vm.rawQuestion;
              }
            }
          });
        }
        _previousViewModelState = viewModel.state;

        // Only mirror a non-empty VM draft (e.g. goBack with keepRawQuestion). When
        // rawQuestion is still empty, the user may be composing — do not overwrite.
        if (viewModel.state == InsightFlowState.idle &&
            viewModel.rawQuestion.isNotEmpty &&
            viewModel.rawQuestion != _controller.text) {
          _controller.text = viewModel.rawQuestion;
        }
        return WillPopScope(
          onWillPop: () async {
            if (viewModel.canNavigateBackInFlow) {
              viewModel.goBack();
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
                    padding: const EdgeInsets.fromLTRB(20, 28, 20, 16),
                    child: Column(
                      children: [
                        Expanded(child: _buildBody(viewModel)),
                        const SizedBox(height: 24),
                        BottomQuestionInput(
                          controller: _controller,
                          enabled: viewModel.canEditQuestionInput,
                          onSubmitted: () {
                            final text = _controller.text.trim();
                            if (text.isEmpty) {
                              return;
                            }
                            viewModel.submitQuestion(text);
                            _controller.clear();
                          },
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

  Widget _buildBody(InsightViewModel viewModel) {
    return AnimatedSwitcher(
      duration: AppMotion.cardEntranceDuration,
      transitionBuilder: (child, animation) {
        final offset = Tween<Offset>(
          begin: const Offset(0, 0.04),
          end: Offset.zero,
        ).animate(animation);
        return FadeTransition(
          opacity: animation,
          child: SlideTransition(position: offset, child: child),
        );
      },
      child: _contentFor(viewModel),
    );
  }

  Widget _contentFor(InsightViewModel viewModel) {
    switch (viewModel.state) {
      case InsightFlowState.idle:
        return const _IdlePrompt(key: ValueKey('idle'));
      case InsightFlowState.questionSubmitted:
      case InsightFlowState.generatingQuestions:
        return _FlowStack(
          key: const ValueKey('loading'),
          rawQuestion: viewModel.rawQuestion,
          child: const LoadingErrorCard.loading(kind: LoadingCardKind.questions),
        );
      case InsightFlowState.answeringQuestion:
        final question = viewModel.currentQuestion;
        return _FlowStack(
          key: ValueKey('question-${viewModel.currentQuestionIndex}'),
          rawQuestion: viewModel.rawQuestion,
          child: question == null
              ? const SizedBox.shrink()
              : QuestionCard(
                  progressText: viewModel.progressText,
                  question: question,
                  selectedOptionId: viewModel.selectedOptionIdFor(question),
                  showPrevious: viewModel.currentQuestionIndex > 0,
                  enabled: !viewModel.isBusy,
                  onOptionSelected: (option) {
                    viewModel.selectOption(question, option);
                  },
                  onPrevious: viewModel.goBack,
                ),
        );
      case InsightFlowState.submittingAnswers:
        return _FlowStack(
          key: const ValueKey('submittingAnswers'),
          rawQuestion: viewModel.rawQuestion,
          child: const LoadingErrorCard.loading(
            kind: LoadingCardKind.conclusion,
          ),
        );
      case InsightFlowState.showingResult:
        return _FlowStack(
          key: const ValueKey('result'),
          rawQuestion: viewModel.rawQuestion,
          child: ResultCard(
            conclusion: viewModel.conclusion ?? '',
            onAskAgain: () => viewModel.resetToIdle(),
            onHome: () => viewModel.resetToIdle(),
          ),
        );
      case InsightFlowState.error:
        return _FlowStack(
          key: const ValueKey('error'),
          rawQuestion: viewModel.rawQuestion,
          child: LoadingErrorCard.error(
            message: viewModel.errorMessage ?? '刚刚没有连上服务。请检查网络后重试。',
            onRetry: viewModel.retry,
          ),
        );
    }
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
        Text('你今天想问什么？', style: AppTypography.heading),
        SizedBox(height: 12),
        Text(
          '输入一个正在纠结的选择，我会用三问帮你看见当下更偏向的 51%。',
          style: AppTypography.body,
        ),
      ],
    );
  }
}

class _FlowStack extends StatelessWidget {
  const _FlowStack({
    super.key,
    required this.rawQuestion,
    required this.child,
  });

  final String rawQuestion;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Spacer(),
        Align(
          alignment: Alignment.centerRight,
          child: Container(
            constraints: const BoxConstraints(maxWidth: 320),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.accent.withOpacity(0.13),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(rawQuestion, style: AppTypography.body),
          ),
        ),
        const SizedBox(height: 20),
        _CardEntrance(child: child),
        const Spacer(flex: 2),
      ],
    );
  }
}

class _CardEntrance extends StatelessWidget {
  const _CardEntrance({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: AppMotion.cardEntranceDuration,
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.translate(
            offset: Offset(
              0,
              (1 - value) * AppMotion.cardEntranceOffset.dy.abs(),
            ),
            child: child,
          ),
        );
      },
      child: child,
    );
  }
}
