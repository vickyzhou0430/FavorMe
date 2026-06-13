import 'package:flutter/material.dart';

import '../../../theme/app_theme.dart';
import '../../insight/insight_api_client.dart' show InsightApiException;
import '../insight_v2_api_client.dart';
import '../insight_v2_models.dart';
import '../widgets/insight_v2_cards.dart';

/// 历史记录列表页。
class InsightV2HistoryScreen extends StatefulWidget {
  const InsightV2HistoryScreen({super.key, required this.client});

  final InsightV2Client client;

  @override
  State<InsightV2HistoryScreen> createState() => _InsightV2HistoryScreenState();
}

class _InsightV2HistoryScreenState extends State<InsightV2HistoryScreen> {
  bool _loading = true;
  String? _error;
  List<InsightV2SessionSummary> _items = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final page = await widget.client.listSessions(limit: 30);
      if (!mounted) {
        return;
      }
      setState(() {
        _items = page.items;
        _loading = false;
      });
    } on InsightApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.message;
        _loading = false;
      });
    } on Object {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = '刚刚没有连上服务。请检查网络后重试。';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        foregroundColor: AppColors.textPrimary,
        title: const Text('历史记录', style: AppTypography.action),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: _buildBody(),
          ),
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.accent));
    }
    final error = _error;
    if (error != null) {
      return _ErrorState(message: error, onRetry: _load);
    }
    if (_items.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text('还没有历史记录。先去问一次吧。', style: AppTypography.body),
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(20),
      itemCount: _items.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final item = _items[index];
        return _HistoryTile(
          item: item,
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => InsightV2HistoryDetailScreen(
                client: widget.client,
                sessionId: item.id,
              ),
            ),
          ),
        );
      },
    );
  }
}

class _HistoryTile extends StatelessWidget {
  const _HistoryTile({required this.item, required this.onTap});

  final InsightV2SessionSummary item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final subtitle = item.awakeningQuote?.isNotEmpty == true
        ? item.awakeningQuote!
        : (item.status == InsightV2Status.finished ? '已完成' : '未完成');
    return PressScale(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadii.card),
          border: Border.all(color: AppColors.borderSoft),
          boxShadow: AppShadows.soft,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              item.dilemma,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.action,
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.caption,
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Text('${item.askedCount} 问', style: AppTypography.caption),
                if (item.tendency?.isNotEmpty == true) ...[
                  const SizedBox(width: 12),
                  Text(
                    '倾向 · ${item.tendency}',
                    style: AppTypography.caption.copyWith(color: AppColors.accent),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// 历史详情页。
class InsightV2HistoryDetailScreen extends StatefulWidget {
  const InsightV2HistoryDetailScreen({
    super.key,
    required this.client,
    required this.sessionId,
  });

  final InsightV2Client client;
  final String sessionId;

  @override
  State<InsightV2HistoryDetailScreen> createState() =>
      _InsightV2HistoryDetailScreenState();
}

class _InsightV2HistoryDetailScreenState
    extends State<InsightV2HistoryDetailScreen> {
  bool _loading = true;
  String? _error;
  InsightV2SessionDetail? _detail;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final detail = await widget.client.getSession(widget.sessionId);
      if (!mounted) {
        return;
      }
      setState(() {
        _detail = detail;
        _loading = false;
      });
    } on InsightApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.message;
        _loading = false;
      });
    } on Object {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = '刚刚没有连上服务。请检查网络后重试。';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        foregroundColor: AppColors.textPrimary,
        title: const Text('这一次的点醒', style: AppTypography.action),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: _buildBody(),
          ),
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.accent));
    }
    final error = _error;
    if (error != null) {
      return _ErrorState(message: error, onRetry: _load);
    }
    final detail = _detail;
    if (detail == null) {
      return const SizedBox.shrink();
    }
    final report = detail.report;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(detail.dilemma, style: AppTypography.action),
          const SizedBox(height: 16),
          if (report != null) ...[
            Text(
              report.awakeningQuote,
              style: AppTypography.heading.copyWith(height: 1.35),
            ),
            if (report.tendency.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text('当下倾向 · ${report.tendency}',
                  style: AppTypography.caption.copyWith(color: AppColors.accent)),
            ],
            if (report.analysis.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(report.analysis, style: AppTypography.body.copyWith(height: 1.6)),
            ],
            if (report.actionAdvice.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text('行动建议：${report.actionAdvice}', style: AppTypography.body),
            ],
            const SizedBox(height: 20),
          ] else ...[
            const Text('这次会话尚未完成。', style: AppTypography.body),
            const SizedBox(height: 20),
          ],
          if (detail.trajectory.isNotEmpty)
            TrajectoryList(items: detail.trajectory),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, style: AppTypography.body, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            PressScale(
              onTap: onRetry,
              child: Container(
                constraints: const BoxConstraints(minHeight: AppSizes.minTouchTarget),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.accent,
                  borderRadius: BorderRadius.circular(AppRadii.optionPill),
                ),
                child: Text('重试',
                    style: AppTypography.action.copyWith(color: AppColors.surface)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
