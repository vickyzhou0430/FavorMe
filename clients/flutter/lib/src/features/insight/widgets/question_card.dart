import 'package:flutter/material.dart';

import '../../../theme/app_theme.dart';
import '../insight_models.dart';

class QuestionCard extends StatelessWidget {
  const QuestionCard({
    super.key,
    required this.progressText,
    required this.question,
    required this.selectedOptionId,
    required this.showPrevious,
    required this.enabled,
    required this.onOptionSelected,
    required this.onPrevious,
  });

  final String progressText;
  final InsightQuestion question;
  final String? selectedOptionId;
  final bool showPrevious;
  final bool enabled;
  final ValueChanged<InsightOption> onOptionSelected;
  final VoidCallback onPrevious;

  @override
  Widget build(BuildContext context) {
    // Progress text comes from the ViewModel as "第 {current} / 3 问".
    // UI-SPEC gate: 24px card radius, 999px pills, 44px target,
    // 0.98 press scale, and 220-320ms fade/upward entrance motion.
    return _CardEntrance(
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadii.card),
          border: Border.all(color: AppColors.borderSoft),
          boxShadow: AppShadows.soft,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(progressText, style: AppTypography.caption),
                ),
                if (showPrevious)
                  _PressScale(
                    enabled: enabled,
                    onTap: onPrevious,
                    child: const ConstrainedBox(
                      constraints: BoxConstraints(
                        minHeight: AppSizes.minTouchTarget,
                      ),
                      child: Align(
                        alignment: Alignment.centerRight,
                        child: Text('上一题', style: AppTypography.action),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(question.title, style: AppTypography.action),
            const SizedBox(height: 18),
            for (final option in question.options) ...[
              _OptionPill(
                option: option,
                selected: selectedOptionId == option.id,
                enabled: enabled,
                onTap: () => onOptionSelected(option),
              ),
              const SizedBox(height: 10),
            ],
          ],
        ),
      ),
    );
  }
}

class _OptionPill extends StatelessWidget {
  const _OptionPill({
    required this.option,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  final InsightOption option;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final background =
        selected ? AppColors.accent.withOpacity(0.13) : AppColors.surface;
    final border = selected ? AppColors.accent : AppColors.borderSoft;
    final label = selected ? '${option.label}，语义已选中' : option.label;

    return Semantics(
      selected: selected,
      button: true,
      label: label,
      child: _PressScale(
        enabled: enabled,
        onTap: onTap,
        child: AnimatedContainer(
          duration: AppMotion.selectionDuration,
          constraints: const BoxConstraints(
            minHeight: AppSizes.minTouchTarget,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: background,
            border: Border.all(color: border),
            borderRadius: BorderRadius.circular(AppRadii.optionPill),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(option.label, style: AppTypography.body),
              ),
              if (selected)
                const Text('已选', style: AppTypography.caption),
            ],
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
      behavior: HitTestBehavior.opaque,
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
