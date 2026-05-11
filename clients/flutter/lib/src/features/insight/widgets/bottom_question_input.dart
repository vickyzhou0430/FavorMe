import 'package:flutter/material.dart';

import '../../../theme/app_theme.dart';

class BottomQuestionInput extends StatefulWidget {
  const BottomQuestionInput({
    super.key,
    required this.controller,
    required this.enabled,
    required this.onSubmitted,
  });

  final TextEditingController controller;
  final bool enabled;
  final VoidCallback onSubmitted;

  @override
  State<BottomQuestionInput> createState() => _BottomQuestionInputState();
}

class _BottomQuestionInputState extends State<BottomQuestionInput> {
  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: AppSizes.inputMinHeight),
      padding: const EdgeInsets.fromLTRB(18, 6, 6, 6),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadii.inputCapsule),
        border: Border.all(color: AppColors.borderSoft),
        boxShadow: AppShadows.soft, // Shadow soft
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
                final canSend = widget.enabled &&
                    widget.controller.text.trim().isNotEmpty;
                if (canSend) {
                  widget.onSubmitted();
                }
              },
            ),
          ),
          const SizedBox(width: 10),
          ValueListenableBuilder<TextEditingValue>(
            valueListenable: widget.controller,
            builder: (context, value, _) {
              final canSend = widget.enabled && value.text.trim().isNotEmpty;
              return Tooltip(
                message: '发送问题',
                child: _PressScale(
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
                    child: Icon(
                      Icons.send_rounded,
                      size: 22,
                      color:
                          canSend ? AppColors.surface : AppColors.textSecondary,
                    ),
                  ),
                ),
              );
            },
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
