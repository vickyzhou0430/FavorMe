import 'package:flutter/material.dart';

import '../../../theme/app_theme.dart';
import '../../insight/insight_api_client.dart' show InsightApiException;
import '../insight_v2_api_client.dart';
import '../insight_v2_models.dart';

/// Debug 调参屏：拉取当前生效提示词，编辑后上传到后端运行时生效，无需重新部署。
///
/// 仅在客户端 debug 模式下入口可见；后端写操作另需 `INSIGHT_V2_PROMPT_OVERRIDE_ENABLED=true`。
class PromptDebugScreen extends StatefulWidget {
  const PromptDebugScreen({super.key, required this.client});

  final InsightV2Client client;

  @override
  State<PromptDebugScreen> createState() => _PromptDebugScreenState();
}

class _PromptDebugScreenState extends State<PromptDebugScreen> {
  final TextEditingController _controller = TextEditingController();
  bool _loading = true;
  bool _saving = false;
  String? _error;
  InsightV2PromptInfo? _info;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final info = await widget.client.getPrompt();
      if (!mounted) {
        return;
      }
      setState(() {
        _info = info;
        _controller.text = info.effectivePrompt;
        _loading = false;
      });
    } on Object catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = _messageOf(error);
        _loading = false;
      });
    }
  }

  Future<void> _upload() async {
    final content = _controller.text.trim();
    if (content.isEmpty) {
      _toast('内容不能为空');
      return;
    }
    setState(() => _saving = true);
    try {
      final info = await widget.client.updatePrompt(content);
      if (!mounted) {
        return;
      }
      setState(() {
        _info = info;
        _controller.text = info.effectivePrompt;
        _saving = false;
      });
      _toast('已上传，运行时即时生效');
    } on Object catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _saving = false);
      _toast(_messageOf(error));
    }
  }

  Future<void> _reset() async {
    setState(() => _saving = true);
    try {
      final info = await widget.client.resetPrompt();
      if (!mounted) {
        return;
      }
      setState(() {
        _info = info;
        _controller.text = info.effectivePrompt;
        _saving = false;
      });
      _toast('已清除覆盖，回退到内置默认');
    } on Object catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _saving = false);
      _toast(_messageOf(error));
    }
  }

  void _loadDefaultIntoEditor() {
    final info = _info;
    if (info != null) {
      _controller.text = info.defaultPrompt;
      _toast('已把内置默认载入编辑框（未上传）');
    }
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  String _messageOf(Object error) {
    if (error is InsightApiException) {
      return error.message;
    }
    return '请求失败，请检查网络与后端配置。';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        foregroundColor: AppColors.textPrimary,
        title: const Text('Prompt 调参（Debug）', style: AppTypography.action),
        actions: [
          IconButton(
            tooltip: '刷新',
            onPressed: _loading || _saving ? null : _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: SafeArea(child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.accent));
    }
    final error = _error;
    if (error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(error, textAlign: TextAlign.center, style: AppTypography.body),
              const SizedBox(height: 16),
              FilledButton(onPressed: _load, child: const Text('重试')),
            ],
          ),
        ),
      );
    }

    final info = _info;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (info != null) _StatusBanner(info: info),
          const SizedBox(height: 12),
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderSoft),
              ),
              padding: const EdgeInsets.all(12),
              child: TextField(
                controller: _controller,
                maxLines: null,
                expands: true,
                textAlignVertical: TextAlignVertical.top,
                enabled: !_saving,
                style: const TextStyle(fontSize: 13, height: 1.4),
                decoration: const InputDecoration(
                  border: InputBorder.none,
                  hintText: '系统提示词…',
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _saving ? null : _loadDefaultIntoEditor,
                  child: const Text('载入默认'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton(
                  onPressed: _saving ? null : _reset,
                  child: const Text('清除覆盖'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  onPressed: _saving ? null : _upload,
                  style: FilledButton.styleFrom(backgroundColor: AppColors.accent),
                  child: Text(_saving ? '上传中…' : '上传'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatusBanner extends StatelessWidget {
  const _StatusBanner({required this.info});

  final InsightV2PromptInfo info;

  @override
  Widget build(BuildContext context) {
    final enabled = info.enabled;
    final color = enabled ? AppColors.loadingWash : AppColors.errorWash;
    final lines = <String>[
      enabled ? '覆盖功能已开启，上传后运行时即时生效。' : '后端未开启覆盖功能（只读）。',
      info.hasOverride ? '当前正在使用覆盖版本。' : '当前使用内置默认。',
      if (info.updatedBy != null) '最近更新：${info.updatedBy}',
    ];
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final line in lines)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 1),
              child: Text(line, style: AppTypography.caption),
            ),
        ],
      ),
    );
  }
}
