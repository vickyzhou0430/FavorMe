import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import 'insight_models.dart';
import 'insight_view_model.dart';

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
        return Scaffold(
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
                      _BottomQuestionInput(
                        controller: _controller,
                        enabled: !viewModel.isBusy,
                        onSubmitted: () {
                          viewModel.submitQuestion(_controller.text);
                        },
                      ),
                    ],
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
          child: const _LoadingQuestionCard(),
        );
      case InsightFlowState.answeringQuestion:
        final question = viewModel.currentQuestion;
        return _FlowStack(
          key: const ValueKey('question'),
          rawQuestion: viewModel.rawQuestion,
          child: question == null
              ? const SizedBox.shrink()
              : _QuestionCard(
                  progressText: viewModel.progressText,
                  question: question,
                ),
        );
      case InsightFlowState.error:
        return _FlowStack(
          key: const ValueKey('error'),
          rawQuestion: viewModel.rawQuestion,
          child: _ErrorCard(
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

class _LoadingQuestionCard extends StatefulWidget {
  const _LoadingQuestionCard();

  @override
  State<_LoadingQuestionCard> createState() => _LoadingQuestionCardState();
}

class _LoadingQuestionCardState extends State<_LoadingQuestionCard>
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
    return _SoftCard(
      color: AppColors.loadingWash,
      child: Semantics(
        label: '正在整理你的三问…',
        child: FadeTransition(
          opacity: _controller,
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SizedBox(
                width: 10,
                height: 10,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: AppColors.accent,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
              SizedBox(width: 10),
              Text('正在整理你的三问…', style: AppTypography.action),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuestionCard extends StatelessWidget {
  const _QuestionCard({
    required this.progressText,
    required this.question,
  });

  final String progressText;
  final InsightQuestion question;

  @override
  Widget build(BuildContext context) {
    return _SoftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(progressText, style: AppTypography.caption),
          const SizedBox(height: 12),
          Text(question.title, style: AppTypography.action),
          const SizedBox(height: 18),
          for (final option in question.options) ...[
            _OptionPill(label: option.label),
            const SizedBox(height: 10),
          ],
        ],
      ),
    );
  }
}

class _OptionPill extends StatelessWidget {
  const _OptionPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: AppSizes.optionMinHeight),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: Border.all(color: AppColors.borderSoft),
          borderRadius: BorderRadius.circular(AppRadii.optionPill),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Text(label, style: AppTypography.body),
        ),
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return _SoftCard(
      color: AppColors.errorWash,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(message, style: AppTypography.body),
          const SizedBox(height: 16),
          Align(
            alignment: Alignment.centerLeft,
            child: _PressScale(
              onTap: onRetry,
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Text('重试', style: AppTypography.action),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SoftCard extends StatelessWidget {
  const _SoftCard({
    required this.child,
    this.color = AppColors.surface,
  });

  final Widget child;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(AppRadii.card),
        border: Border.all(color: AppColors.borderSoft),
        boxShadow: AppShadows.soft,
      ),
      child: child,
    );
  }
}

class _BottomQuestionInput extends StatefulWidget {
  const _BottomQuestionInput({
    required this.controller,
    required this.enabled,
    required this.onSubmitted,
  });

  final TextEditingController controller;
  final bool enabled;
  final VoidCallback onSubmitted;

  @override
  State<_BottomQuestionInput> createState() => _BottomQuestionInputState();
}

class _BottomQuestionInputState extends State<_BottomQuestionInput> {
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    _hasText = widget.controller.text.trim().isNotEmpty;
    widget.controller.addListener(_syncTextState);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_syncTextState);
    super.dispose();
  }

  void _syncTextState() {
    final next = widget.controller.text.trim().isNotEmpty;
    if (next != _hasText) {
      setState(() {
        _hasText = next;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final canSend = widget.enabled && _hasText;
    return Container(
      constraints: const BoxConstraints(minHeight: AppSizes.inputMinHeight),
      padding: const EdgeInsets.fromLTRB(18, 6, 6, 6),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadii.inputCapsule),
        border: Border.all(color: AppColors.borderSoft),
        boxShadow: AppShadows.soft,
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: widget.controller,
              enabled: widget.enabled,
              minLines: 1,
              maxLines: 3,
              style: AppTypography.body,
              decoration: const InputDecoration(
                hintText: '输入你纠结的问题…',
                hintStyle: AppTypography.body,
                border: InputBorder.none,
              ),
              onSubmitted: (_) {
                if (canSend) {
                  widget.onSubmitted();
                }
              },
            ),
          ),
          const SizedBox(width: 10),
          _PressScale(
            enabled: canSend,
            onTap: widget.onSubmitted,
            child: Container(
              constraints: const BoxConstraints(
                minWidth: AppSizes.minTouchTarget,
                minHeight: AppSizes.minTouchTarget,
              ),
              decoration: BoxDecoration(
                color: canSend ? AppColors.accent : AppColors.borderSoft,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: Text(
                '发送问题',
                style: AppTypography.caption.copyWith(
                  color: canSend ? AppColors.surface : AppColors.textSecondary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PressScale extends StatefulWidget {
  const _PressScale({
    required this.child,
    required this.onTap,
    this.enabled = true,
  });

  final Widget child;
  final VoidCallback onTap;
  final bool enabled;

  @override
  State<_PressScale> createState() => _PressScaleState();
}

class _PressScaleState extends State<_PressScale> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.enabled ? widget.onTap : null,
      onTapDown: widget.enabled ? (_) => _setPressed(true) : null,
      onTapCancel: widget.enabled ? () => _setPressed(false) : null,
      onTapUp: widget.enabled ? (_) => _setPressed(false) : null,
      child: AnimatedScale(
        scale: _pressed ? AppMotion.pressScale : 1,
        duration: AppMotion.pressDuration,
        child: widget.child,
      ),
    );
  }

  void _setPressed(bool value) {
    setState(() {
      _pressed = value;
    });
  }
}
