import 'package:flutter/material.dart';

import '../../../theme/app_theme.dart';
import '../insight_v2_models.dart';

/// 五级量表选择器：两端为极端立场，中间三档表达倾向程度。
class ScaleSelector extends StatelessWidget {
  const ScaleSelector({
    super.key,
    required this.optionA,
    required this.optionB,
    required this.enabled,
    required this.onSelected,
    this.selected,
  });

  final String optionA;
  final String optionB;
  final bool enabled;
  final InsightV2Level? selected;
  final ValueChanged<InsightV2Level> onSelected;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _Pole(label: optionA, marker: 'A'),
        const SizedBox(height: 12),
        Row(
          children: [
            for (final level in InsightV2Level.values) ...[
              Expanded(
                child: _ScalePill(
                  level: level,
                  selected: selected == level,
                  enabled: enabled,
                  onTap: () => onSelected(level),
                ),
              ),
              if (level != InsightV2Level.b) const SizedBox(width: 8),
            ],
          ],
        ),
        const SizedBox(height: 12),
        _Pole(label: optionB, marker: 'B'),
      ],
    );
  }
}

class _Pole extends StatelessWidget {
  const _Pole({required this.label, required this.marker});

  final String label;
  final String marker;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 24,
          height: 24,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: AppColors.accent.withOpacity(0.13),
            borderRadius: BorderRadius.circular(AppRadii.optionPill),
          ),
          child: Text(
            marker,
            style: AppTypography.caption.copyWith(
              color: AppColors.accent,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(child: Text(label, style: AppTypography.body)),
      ],
    );
  }
}

class _ScalePill extends StatelessWidget {
  const _ScalePill({
    required this.level,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  final InsightV2Level level;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final background =
        selected ? AppColors.accent : AppColors.surface;
    final border = selected ? AppColors.accent : AppColors.borderSoft;
    final textColor = selected ? AppColors.surface : AppColors.textPrimary;

    return Semantics(
      selected: selected,
      button: true,
      label: level.shortLabel,
      child: PressScale(
        enabled: enabled,
        onTap: onTap,
        child: AnimatedContainer(
          duration: AppMotion.selectionDuration,
          constraints: const BoxConstraints(minHeight: AppSizes.minTouchTarget),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: background,
            border: Border.all(color: border),
            borderRadius: BorderRadius.circular(AppRadii.optionPill),
          ),
          child: Text(
            level.shortLabel,
            style: AppTypography.caption.copyWith(color: textColor),
          ),
        ),
      ),
    );
  }
}

/// 单题卡：策略标签 + 题面 + 五级量表 + 换一题。
class V2QuestionCard extends StatelessWidget {
  const V2QuestionCard({
    super.key,
    required this.progressText,
    required this.question,
    required this.enabled,
    required this.onSelected,
    required this.onRegenerate,
    this.selectedLevel,
  });

  final String progressText;
  final InsightV2Question question;
  final bool enabled;
  final InsightV2Level? selectedLevel;
  final ValueChanged<InsightV2Level> onSelected;
  final VoidCallback onRegenerate;

  @override
  Widget build(BuildContext context) {
    return _SoftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(child: Text(progressText, style: AppTypography.caption)),
              PressScale(
                enabled: enabled,
                onTap: onRegenerate,
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  child: Text('换一题', style: AppTypography.caption),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(question.questionText, style: AppTypography.action),
          const SizedBox(height: 20),
          ScaleSelector(
            optionA: question.optionA,
            optionB: question.optionB,
            enabled: enabled,
            selected: selectedLevel,
            onSelected: onSelected,
          ),
        ],
      ),
    );
  }
}

/// 追问卡：模型需要更多信息时显示，用户在底部输入框补充。
class V2ClarifyCard extends StatelessWidget {
  const V2ClarifyCard({super.key, required this.clarifyQuestion});

  final String clarifyQuestion;

  @override
  Widget build(BuildContext context) {
    return _SoftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('再多说一点', style: AppTypography.caption),
          const SizedBox(height: 12),
          Text(clarifyQuestion, style: AppTypography.action),
          const SizedBox(height: 12),
          const Text('在下方输入框补充一句，我就能帮你往下拆。', style: AppTypography.body),
        ],
      ),
    );
  }
}

/// 点醒结果卡：金句 + 倾向 + 分析 + 行动建议 + 作答轨迹。
class V2ResultCard extends StatelessWidget {
  const V2ResultCard({
    super.key,
    required this.report,
    required this.onAskAgain,
    required this.onViewHistory,
  });

  final InsightV2Report report;
  final VoidCallback onAskAgain;
  final VoidCallback onViewHistory;

  @override
  Widget build(BuildContext context) {
    return _SoftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('点醒', style: AppTypography.caption),
          const SizedBox(height: 12),
          Text(
            report.awakeningQuote,
            style: AppTypography.heading.copyWith(height: 1.35),
          ),
          if (report.tendency.isNotEmpty) ...[
            const SizedBox(height: 14),
            _TendencyChip(tendency: report.tendency),
          ],
          const SizedBox(height: 16),
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 280),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (report.analysis.isNotEmpty)
                    Text(
                      report.analysis,
                      style: AppTypography.body.copyWith(height: 1.6),
                    ),
                  if (report.actionAdvice.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _AdviceBox(advice: report.actionAdvice),
                  ],
                  if (report.trajectory.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    TrajectoryList(items: report.trajectory),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          _ActionButton(label: '再问一次', primary: true, onTap: onAskAgain),
          const SizedBox(height: 8),
          _ActionButton(label: '查看历史', primary: false, onTap: onViewHistory),
        ],
      ),
    );
  }
}

class _TendencyChip extends StatelessWidget {
  const _TendencyChip({required this.tendency});

  final String tendency;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.accent.withOpacity(0.13),
          borderRadius: BorderRadius.circular(AppRadii.optionPill),
        ),
        child: Text(
          '当下倾向 · $tendency',
          style: AppTypography.caption.copyWith(
            color: AppColors.accent,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class _AdviceBox extends StatelessWidget {
  const _AdviceBox({required this.advice});

  final String advice;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.loadingWash,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('今天可以做的一件小事', style: AppTypography.caption),
          const SizedBox(height: 6),
          Text(advice, style: AppTypography.body.copyWith(height: 1.5)),
        ],
      ),
    );
  }
}

/// 作答轨迹（结果页与历史详情共用）。
class TrajectoryList extends StatelessWidget {
  const TrajectoryList({super.key, required this.items});

  final List<InsightV2TrajectoryItem> items;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('你的作答轨迹', style: AppTypography.caption),
        const SizedBox(height: 8),
        for (var i = 0; i < items.length; i++) ...[
          _TrajectoryRow(index: i + 1, item: items[i]),
          if (i != items.length - 1) const SizedBox(height: 10),
        ],
      ],
    );
  }
}

class _TrajectoryRow extends StatelessWidget {
  const _TrajectoryRow({required this.index, required this.item});

  final int index;
  final InsightV2TrajectoryItem item;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: AppColors.borderSoft),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Q$index · ${item.strategyLabel.isEmpty ? '提问' : item.strategyLabel}',
            style: AppTypography.caption,
          ),
          const SizedBox(height: 4),
          Text(item.questionText, style: AppTypography.body),
          const SizedBox(height: 6),
          Text(
            describeChoice(item),
            style: AppTypography.caption.copyWith(color: AppColors.accent),
          ),
        ],
      ),
    );
  }
}

/// 把五级选择翻译成可读句子。
String describeChoice(InsightV2TrajectoryItem item) {
  switch (item.level) {
    case InsightV2Level.a:
      return '你选了：${item.optionA}';
    case InsightV2Level.leanA:
      return '你偏向：${item.optionA}';
    case InsightV2Level.middle:
      return '你选了中间，两边都有共鸣';
    case InsightV2Level.leanB:
      return '你偏向：${item.optionB}';
    case InsightV2Level.b:
      return '你选了：${item.optionB}';
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
    return PressScale(
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minHeight: AppSizes.minTouchTarget),
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

class _SoftCard extends StatelessWidget {
  const _SoftCard({required this.child});

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
            offset: Offset(0, (1 - value) * AppMotion.cardEntranceOffset.dy.abs()),
            child: child,
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadii.card),
          border: Border.all(color: AppColors.borderSoft),
          boxShadow: AppShadows.soft,
        ),
        child: child,
      ),
    );
  }
}

/// 复用的按压缩放反馈（D-13 press scale 0.98）。
class PressScale extends StatefulWidget {
  const PressScale({
    super.key,
    required this.child,
    required this.onTap,
    this.enabled = true,
  });

  final Widget child;
  final VoidCallback onTap;
  final bool enabled;

  @override
  State<PressScale> createState() => _PressScaleState();
}

class _PressScaleState extends State<PressScale> {
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
