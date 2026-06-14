import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import '../insight/insight_api_client.dart' show InsightApiException;
import 'profile_api_client.dart';
import 'profile_models.dart';

/// 个人档案页：表单 + 「结合个人信息出题」开关。见 ADR-006。
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, required this.client});

  final ProfileClient client;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

enum _LoadState { loading, ready, error }

class _ProfileScreenState extends State<ProfileScreen> {
  _LoadState _state = _LoadState.loading;
  String? _errorMessage;

  bool _useProfile = false;
  DateTime? _birthday;
  ProfileGender? _gender;
  ProfileZodiac? _zodiac;
  String? _mbti;

  /// 服务端最近一次同步的快照，用于计算需要 PATCH 的差异字段。
  UserProfile? _snapshot;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _state = _LoadState.loading;
      _errorMessage = null;
    });
    try {
      final profile = await widget.client.getProfile();
      if (!mounted) return;
      setState(() {
        _state = _LoadState.ready;
        _snapshot = profile;
        _useProfile = profile.useProfileInPrompt;
        _birthday = profile.birthday;
        _gender = profile.gender;
        _zodiac = profile.zodiac;
        _mbti = profile.mbti;
      });
    } on InsightApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _state = _LoadState.error;
        _errorMessage = e.message;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _state = _LoadState.error;
        _errorMessage = '加载失败：$e';
      });
    }
  }

  Future<void> _save() async {
    if (_saving) return;
    final snap = _snapshot;
    if (snap == null) return;

    final req = UpdateProfileRequest();
    if (_useProfile != snap.useProfileInPrompt) {
      req.useProfileInPrompt = _useProfile;
    }
    if (_birthday != snap.birthday) {
      req.birthday = _birthday;
    }
    if (_gender != snap.gender) {
      req.gender = _gender;
    }
    if (_zodiac != snap.zodiac) {
      req.zodiac = _zodiac;
    }
    if (_mbti != snap.mbti) {
      req.mbti = _mbti;
    }
    if (req.toJson().isEmpty) {
      _toast('没有改动');
      return;
    }

    setState(() => _saving = true);
    try {
      final updated = await widget.client.updateProfile(req);
      if (!mounted) return;
      setState(() {
        _snapshot = updated;
        _saving = false;
      });
      _toast('已保存');
    } on InsightApiException catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      _toast('保存失败：${e.message}');
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      _toast('保存失败：$e');
    }
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _pickBirthday() async {
    final now = DateTime.now();
    final initial = _birthday ?? DateTime(now.year - 25, now.month, now.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1900, 1, 1),
      lastDate: now,
      helpText: '选择生日',
    );
    if (picked != null) {
      setState(() => _birthday = picked);
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
        title: const Text('个人档案', style: AppTypography.action),
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
    switch (_state) {
      case _LoadState.loading:
        return const Center(child: CircularProgressIndicator());
      case _LoadState.error:
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_errorMessage ?? '加载失败', style: AppTypography.body),
              const SizedBox(height: 16),
              FilledButton(onPressed: _load, child: const Text('重试')),
            ],
          ),
        );
      case _LoadState.ready:
        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            _SectionCard(
              child: SwitchListTile(
                value: _useProfile,
                onChanged: (v) => setState(() => _useProfile = v),
                title: const Text('结合个人信息出题', style: AppTypography.action),
                subtitle: const Text(
                  '开启后，AI 在出题与写报告时会参考你的档案，让题目对你更贴身。可随时关闭对照效果。',
                  style: AppTypography.caption,
                ),
                activeThumbColor: AppColors.accent,
              ),
            ),
            const SizedBox(height: 16),
            _SectionCard(
              child: Column(
                children: [
                  _Row(
                    label: '生日',
                    value: _birthday == null
                        ? '未填写'
                        : _formatDate(_birthday!),
                    onTap: _pickBirthday,
                    onClear: _birthday == null
                        ? null
                        : () => setState(() => _birthday = null),
                  ),
                  const _Divider(),
                  _DropdownRow<ProfileGender>(
                    label: '性别',
                    value: _gender,
                    items: ProfileGender.values
                        .map((g) => DropdownMenuItem(value: g, child: Text(g.label)))
                        .toList(),
                    onChanged: (v) => setState(() => _gender = v),
                  ),
                  const _Divider(),
                  _DropdownRow<ProfileZodiac>(
                    label: '星座',
                    value: _zodiac,
                    items: ProfileZodiac.values
                        .map((z) => DropdownMenuItem(value: z, child: Text(z.label)))
                        .toList(),
                    onChanged: (v) => setState(() => _zodiac = v),
                  ),
                  const _Divider(),
                  _DropdownRow<String>(
                    label: 'MBTI',
                    value: _mbti,
                    items: profileMbtiTypes
                        .map((m) => DropdownMenuItem(value: m, child: Text(m)))
                        .toList(),
                    onChanged: (v) => setState(() => _mbti = v),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _saving ? null : _save,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.accent,
                minimumSize: const Size.fromHeight(AppSizes.inputMinHeight),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadii.inputCapsule),
                ),
              ),
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('保存', style: AppTypography.action),
            ),
            const SizedBox(height: 12),
            const Text(
              '档案任意字段都可留空。AI 不会在题面里直接念出 "你这个 MBTI…"，'
              '只会把档案当成你的"侧写"融入题目情境与报告视角。',
              style: AppTypography.caption,
              textAlign: TextAlign.center,
            ),
          ],
        );
    }
  }
}

String _formatDate(DateTime d) {
  return '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadii.card),
        border: Border.all(color: AppColors.borderSoft),
        boxShadow: AppShadows.soft,
      ),
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: child,
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider();
  @override
  Widget build(BuildContext context) {
    return const Divider(height: 1, color: AppColors.borderSoft, indent: 16, endIndent: 16);
  }
}

class _Row extends StatelessWidget {
  const _Row({
    required this.label,
    required this.value,
    required this.onTap,
    this.onClear,
  });
  final String label;
  final String value;
  final VoidCallback onTap;
  final VoidCallback? onClear;
  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      title: Text(label, style: AppTypography.body),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(value, style: AppTypography.body),
          if (onClear != null)
            IconButton(
              onPressed: onClear,
              tooltip: '清空',
              icon: const Icon(Icons.close_rounded, size: 18, color: AppColors.textSecondary),
            )
          else
            const SizedBox(width: 12),
        ],
      ),
    );
  }
}

class _DropdownRow<T extends Object> extends StatelessWidget {
  const _DropdownRow({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });
  final String label;
  final T? value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Expanded(child: Text(label, style: AppTypography.body)),
          DropdownButtonHideUnderline(
            child: DropdownButton<T?>(
              value: value,
              hint: const Text('未填写', style: AppTypography.body),
              items: <DropdownMenuItem<T?>>[
                const DropdownMenuItem<Never>(
                  value: null,
                  child: Text('未填写'),
                ),
                ...items.map(
                  (i) => DropdownMenuItem<T?>(value: i.value, child: i.child),
                ),
              ],
              onChanged: onChanged,
              alignment: AlignmentDirectional.centerEnd,
            ),
          ),
        ],
      ),
    );
  }
}
