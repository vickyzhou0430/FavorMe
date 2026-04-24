import type { UserProfile } from "@/lib/user-store";

function zodiacFromBirthday(birthday: string) {
  if (!birthday) return "";
  const md = birthday.slice(5);
  const ranges: Array<[string, string, string]> = [
    ["03-21", "04-19", "白羊座"],
    ["04-20", "05-20", "金牛座"],
    ["05-21", "06-21", "双子座"],
    ["06-22", "07-22", "巨蟹座"],
    ["07-23", "08-22", "狮子座"],
    ["08-23", "09-22", "处女座"],
    ["09-23", "10-23", "天秤座"],
    ["10-24", "11-22", "天蝎座"],
    ["11-23", "12-21", "射手座"],
    ["12-22", "12-31", "摩羯座"],
    ["01-01", "01-19", "摩羯座"],
    ["01-20", "02-18", "水瓶座"],
    ["02-19", "03-20", "双鱼座"],
  ];
  return ranges.find(([s, e]) => md >= s && md <= e)?.[2] || "";
}

/** 轻量 MBTI 气质提示，供模型贴合语气，勿当标签硬套 */
const MBTI_HINT: Partial<Record<string, string>> = {
  INTJ: "偏好结构与长远规划",
  INTP: "重逻辑与可能性",
  ENTJ: "目标感强、讲效率",
  ENTP: "爱思辨、反应快",
  INFJ: "细腻共情、在意意义感",
  INFP: "重感受与价值认同",
  ENFJ: "在意关系和谐与他人感受",
  ENFP: "热情发散、怕束缚",
  ISTJ: "重规则与可靠交付",
  ISFJ: "体贴细致、怕冲突",
  ESTJ: "理性务实、重执行与秩序",
  ESFJ: "合群体贴、在意评价",
  ISTP: "务实冷静、少说多做",
  ISFP: "温和敏感、随感受走",
  ESTP: "行动派、敢冒险",
  ESFP: "外向乐天、活在当下",
};

/**
 * 拼成 Prompt 里的「用户资料」一句，风格接近官方范例（生日星座、MBTI、气质、共情向描述）。
 */
export function buildGuideProfileNarrative(user: UserProfile | null): string {
  if (!user) {
    return "（访客未登录：请给通用、温柔、理性的三段回复，仍保持同款语感与结构）";
  }
  const birthDot = user.birthday ? user.birthday.replace(/-/g, ".") : "未填生日";
  const zodiac = user.birthday ? zodiacFromBirthday(user.birthday) : "";
  const mbti = user.mbti?.trim() || "未填 MBTI";
  const hint = MBTI_HINT[user.mbti || ""] || "性格特质因人而异";
  const gender =
    user.gender === "female" ? "女生" : user.gender === "male" ? "男生" : "朋友";
  const tail = "易在意他人评价、偶尔自我内耗";
  const astro = zodiac ? `${birthDot} ${zodiac}` : birthDot;
  return `${astro}、${mbti}、${hint}、${tail}的${gender}（请结合以上信息做性格化推理，勿机械堆砌标签）`;
}
