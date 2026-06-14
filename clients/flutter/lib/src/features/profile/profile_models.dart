// 用户档案模型 + 受控枚举（性别 / 星座 / MBTI）。
//
// 对接后端 `/v1/users/me`（见 ADR-006 / 任务 005）。
// 枚举 key 与后端 `backend/src/users/profile.constants.ts` 严格对齐；
// label 为中文展示，写到后端始终用 key。

enum ProfileGender {
  male('male', '男'),
  female('female', '女'),
  nonBinary('non_binary', '非二元 / 其他'),
  preferNotToSay('prefer_not_to_say', '不愿透露');

  const ProfileGender(this.wireName, this.label);

  final String wireName;
  final String label;

  static ProfileGender? fromWire(Object? value) {
    if (value is! String) return null;
    for (final v in values) {
      if (v.wireName == value) return v;
    }
    return null;
  }
}

enum ProfileZodiac {
  aries('aries', '白羊座'),
  taurus('taurus', '金牛座'),
  gemini('gemini', '双子座'),
  cancer('cancer', '巨蟹座'),
  leo('leo', '狮子座'),
  virgo('virgo', '处女座'),
  libra('libra', '天秤座'),
  scorpio('scorpio', '天蝎座'),
  sagittarius('sagittarius', '射手座'),
  capricorn('capricorn', '摩羯座'),
  aquarius('aquarius', '水瓶座'),
  pisces('pisces', '双鱼座');

  const ProfileZodiac(this.wireName, this.label);

  final String wireName;
  final String label;

  static ProfileZodiac? fromWire(Object? value) {
    if (value is! String) return null;
    for (final v in values) {
      if (v.wireName == value) return v;
    }
    return null;
  }
}

const List<String> profileMbtiTypes = <String>[
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
];

class UserProfile {
  const UserProfile({
    this.birthday,
    this.gender,
    this.zodiac,
    this.mbti,
    this.useProfileInPrompt = false,
  });

  /// 后端用 YYYY-MM-DD 字符串传，客户端用 DateTime 表达。
  final DateTime? birthday;
  final ProfileGender? gender;
  final ProfileZodiac? zodiac;

  /// 16 个合法值之一；非法值会在解析时被丢弃。
  final String? mbti;
  final bool useProfileInPrompt;

  UserProfile copyWith({
    Object? birthday = _unset,
    Object? gender = _unset,
    Object? zodiac = _unset,
    Object? mbti = _unset,
    bool? useProfileInPrompt,
  }) {
    return UserProfile(
      birthday: identical(birthday, _unset) ? this.birthday : birthday as DateTime?,
      gender: identical(gender, _unset) ? this.gender : gender as ProfileGender?,
      zodiac: identical(zodiac, _unset) ? this.zodiac : zodiac as ProfileZodiac?,
      mbti: identical(mbti, _unset) ? this.mbti : mbti as String?,
      useProfileInPrompt: useProfileInPrompt ?? this.useProfileInPrompt,
    );
  }

  factory UserProfile.fromJson(Map<String, Object?> json) {
    final birthdayStr = json['birthday'];
    DateTime? birthday;
    if (birthdayStr is String && birthdayStr.isNotEmpty) {
      birthday = DateTime.tryParse(birthdayStr);
    }
    final mbtiRaw = json['mbti'];
    final mbti = (mbtiRaw is String && profileMbtiTypes.contains(mbtiRaw))
        ? mbtiRaw
        : null;
    return UserProfile(
      birthday: birthday,
      gender: ProfileGender.fromWire(json['gender']),
      zodiac: ProfileZodiac.fromWire(json['zodiac']),
      mbti: mbti,
      useProfileInPrompt: json['useProfileInPrompt'] == true,
    );
  }
}

/// PATCH 体：仅包含「需要变更」的字段；未传 = 不变；显式 null = 清空。
/// 使用方调用 [withClearedX] 把字段标记为待清空。
class UpdateProfileRequest {
  UpdateProfileRequest({
    this.birthday = _unset,
    this.gender = _unset,
    this.zodiac = _unset,
    this.mbti = _unset,
    this.useProfileInPrompt,
  });

  Object? birthday;
  Object? gender;
  Object? zodiac;
  Object? mbti;
  bool? useProfileInPrompt;

  Map<String, Object?> toJson() {
    final body = <String, Object?>{};
    if (!identical(birthday, _unset)) {
      body['birthday'] = birthday == null
          ? null
          : _formatDate(birthday as DateTime);
    }
    if (!identical(gender, _unset)) {
      body['gender'] = (gender as ProfileGender?)?.wireName;
    }
    if (!identical(zodiac, _unset)) {
      body['zodiac'] = (zodiac as ProfileZodiac?)?.wireName;
    }
    if (!identical(mbti, _unset)) {
      body['mbti'] = mbti;
    }
    if (useProfileInPrompt != null) {
      body['useProfileInPrompt'] = useProfileInPrompt;
    }
    return body;
  }
}

const Object _unset = Object();

String _formatDate(DateTime d) {
  final yyyy = d.year.toString().padLeft(4, '0');
  final mm = d.month.toString().padLeft(2, '0');
  final dd = d.day.toString().padLeft(2, '0');
  return '$yyyy-$mm-$dd';
}
