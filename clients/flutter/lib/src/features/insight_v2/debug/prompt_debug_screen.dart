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

/// 调参支持的 key → 下拉里展示的中文。
const Map<String, String> _kPromptKeyLabels = <String, String>{
  InsightV2PromptKey.system: '基底 system prompt',
  InsightV2PromptKey.profileAugmentation: '个性化增强 (profile augmentation)',
};

/// augmentation 模板里运行时被替换的占位符。
/// 保存前若一个都没有，几乎一定是误删，需用户确认。
const List<String> _kProfilePlaceholders = <String>[
  '{{age}}',
  '{{gender}}',
  '{{zodiac}}',
  '{{mbti}}',
];

class _PromptDebugScreenState extends State<PromptDebugScreen> {
  final TextEditingController _controller = TextEditingController();
  bool _loading = true;
  bool _saving = false;
  String? _error;
  InsightV2PromptInfo? _info;
  String _selectedKey = InsightV2PromptKey.defaultKey;

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
      final info = await widget.client.getPrompt(key: _selectedKey);
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

  Future<void> _onKeyChanged(String? key) async {
    if (key == null || key == _selectedKey || _loading || _saving) {
      return;
    }
    setState(() => _selectedKey = key);
    await _load();
  }

  Future<void> _upload() async {
    final content = _controller.text.trim();
    if (content.isEmpty) {
      _toast('内容不能为空');
      return;
    }
    if (_selectedKey == InsightV2PromptKey.profileAugmentation &&
        !_hasAnyPlaceholder(content)) {
      final confirmed = await _confirmMissingPlaceholders();
      if (confirmed != true) {
        return;
      }
    }
    setState(() => _saving = true);
    try {
      final info = await widget.client.updatePrompt(content, key: _selectedKey);
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
      final info = await widget.client.resetPrompt(key: _selectedKey);
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

  bool _hasAnyPlaceholder(String content) {
    return _kProfilePlaceholders.any(content.contains);
  }

  Future<bool?> _confirmMissingPlaceholders() {
    return showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('未检测到占位符'),
          content: const Text(
            'augmentation 文本里没有 {{age}} / {{gender}} / {{zodiac}} / {{mbti}} '
            '中的任何一个，运行时将无法把档案值填进去，会以字面量送进 LLM。\n\n'
            '确定继续上传吗？',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('取消'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              style: FilledButton.styleFrom(backgroundColor: AppColors.accent),
              child: const Text('仍然上传'),
            ),
          ],
        );
      },
    );
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
          _PromptKeySelector(
            selected: _selectedKey,
            enabled: !_saving,
            onChanged: _onKeyChanged,
          ),
          const SizedBox(height: 12),
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

class _PromptKeySelector extends StatelessWidget {
  const _PromptKeySelector({
    required this.selected,
    required this.enabled,
    required this.onChanged,
  });

  final String selected;
  final bool enabled;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Row(
        children: [
          const Text('Prompt：', style: AppTypography.body),
          Expanded(
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: selected,
                isExpanded: true,
                onChanged: enabled ? onChanged : null,
                items: [
                  for (final key in InsightV2PromptKey.all)
                    DropdownMenuItem(
                      value: key,
                      child: Text(
                        _kPromptKeyLabels[key] ?? key,
                        style: AppTypography.body,
                      ),
                    ),
                ],
              ),
            ),
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
