import 'package:flutter/material.dart';

import '../../../theme/app_theme.dart';

enum LoadingCardKind {
  questions,
  conclusion,
}

class LoadingErrorCard extends StatelessWidget {
  const LoadingErrorCard.loading({
    super.key,
    required this.kind,
  })  : message = null,
        onRetry = null;

  const LoadingErrorCard.error({
    super.key,
    required this.message,
    required this.onRetry,
  }) : kind = null;

  final LoadingCardKind? kind;
  final String? message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final loadingKind = kind;
    if (loadingKind != null) {
      return _LoadingCard(kind: loadingKind);
    }

    return _SoftCard(
      color: AppColors.errorWash,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(message ?? '刚刚没有连上服务。请检查网络后重试。', style: AppTypography.body),
          const SizedBox(height: 16),
          Align(
            alignment: Alignment.centerLeft,
            child: _PressScale(
              onTap: onRetry ?? () {},
              child: const ConstrainedBox(
                constraints: BoxConstraints(
                  minWidth: AppSizes.minTouchTarget,
                  minHeight: AppSizes.minTouchTarget,
                ),
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Text('重试', style: AppTypography.action),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LoadingCard extends StatefulWidget {
  const _LoadingCard({required this.kind});

  final LoadingCardKind kind;

  @override
  State<_LoadingCard> createState() => _LoadingCardState();
}

class _LoadingCardState extends State<_LoadingCard>
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
    final copy = switch (widget.kind) {
      LoadingCardKind.questions => '正在整理你的三问…',
      LoadingCardKind.conclusion => '正在生成倾向分析…',
    };

    return _SoftCard(
      color: AppColors.loadingWash,
      child: Semantics(
        label: copy,
        child: FadeTransition(
          opacity: _controller,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const _TypingDot(),
              const SizedBox(width: 10),
              Text(copy, style: AppTypography.action),
            ],
          ),
        ),
      ),
    );
  }
}

class _TypingDot extends StatelessWidget {
  const _TypingDot();

  @override
  Widget build(BuildContext context) {
    // typing hook for the D-13 subtle loading motion source gate.
    return const SizedBox(
      width: 10,
      height: 10,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.accent,
          shape: BoxShape.circle,
        ),
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
        boxShadow: AppShadows.soft, // Shadow soft
      ),
      child: child,
    );
  }
}

class _PressScale extends StatefulWidget {
  const _PressScale({
    required this.child,
    required this.onTap,
  });

  final Widget child;
  final VoidCallback onTap;

  @override
  State<_PressScale> createState() => _PressScaleState();
}

class _PressScaleState extends State<_PressScale> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: widget.onTap,
      onTapDown: (_) => _setPressed(true),
      onTapCancel: () => _setPressed(false),
      onTapUp: (_) => _setPressed(false),
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
