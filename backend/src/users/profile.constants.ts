/**
 * 用户档案的可选值（性别 / 星座 / MBTI）。
 * 服务端与 prompt augmentation 共用，客户端可镜像 enum 做本地化。
 * 标签为中文展示用，写入 DB 始终用 key。
 */

export const PROFILE_GENDERS = ['male', 'female', 'non_binary', 'prefer_not_to_say'] as const;
export type ProfileGender = (typeof PROFILE_GENDERS)[number];

export const PROFILE_GENDER_LABELS: Record<ProfileGender, string> = {
  male: '男',
  female: '女',
  non_binary: '非二元 / 其他',
  prefer_not_to_say: '不愿透露',
};

export const PROFILE_ZODIACS = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
] as const;
export type ProfileZodiac = (typeof PROFILE_ZODIACS)[number];

export const PROFILE_ZODIAC_LABELS: Record<ProfileZodiac, string> = {
  aries: '白羊座',
  taurus: '金牛座',
  gemini: '双子座',
  cancer: '巨蟹座',
  leo: '狮子座',
  virgo: '处女座',
  libra: '天秤座',
  scorpio: '天蝎座',
  sagittarius: '射手座',
  capricorn: '摩羯座',
  aquarius: '水瓶座',
  pisces: '双鱼座',
};

export const PROFILE_MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const;
export type ProfileMbti = (typeof PROFILE_MBTI_TYPES)[number];

/** 生日合法范围（防极端值）：1900-01-01 起，到当前年。 */
export const PROFILE_BIRTHDAY_MIN_ISO = '1900-01-01';
