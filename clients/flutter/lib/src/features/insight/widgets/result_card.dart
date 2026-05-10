import 'package:flutter/material.dart';

import '../../../theme/app_theme.dart';

class ResultCard extends StatelessWidget {
  const ResultCard({
    super.key,
    required this.conclusion,
    required this.onAskAgain,
    required this.onHome,
  });

  final String conclusion;
  final VoidCallback onAskAgain;
  final VoidCallback onHome;

  @override
  Widget build(BuildContext context) {
    // UI-SPEC gate: 24px card radius, 44px actions, Shadow soft, and
    // 220-320ms fade/upward entrance motion.
    return _CardEntrance(
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadii.card),
          border: Border.all(color: AppColors.borderSoft),
          boxShadow: AppShadows.soft, // Shadow soft
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('当下倾向', style: AppTypography.heading),
            const SizedBox(height: 16),
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 280),
              child: SingleChildScrollView(
                child: Text(
                  conclusion,
                  style: AppTypography.body.copyWith(height: 1.6),
                ),
              ),
            ),
            const SizedBox(height: 20),
            _ActionButton(
              label: '再问一次',
              primary: true,
              onTap: onAskAgain,
            ),
            const SizedBox(height: 8),
            _ActionButton(
              label: '回到首页',
              primary: false,
              onTap: onHome,
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.label,
    required this.primary,
    required this.onTap,
  });

  final String label;
  final bool primary;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return _PressScale(
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(
          minHeight: AppSizes.minTouchTarget,
        ),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: primary ? AppColors.accent : AppColors.surface,
          border: Border.all(
            color: primary ? AppColors.accent : AppColors.borderSoft,
          ),
          borderRadius: BorderRadius.circular(AppRadii.optionPill),
        ),
        child: Text(
          label,
          style: AppTypography.action.copyWith(
            color: primary ? AppColors.surface : AppColors.textPrimary,
          ),
        ),
      ),
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
