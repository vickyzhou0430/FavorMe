export type NumerologyEnergy = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

function digitsOf(input: string) {
  return (input.match(/\d/g) || []).map((d) => Number(d));
}

export function reduceNumber(input: string | number): NumerologyEnergy {
  const s = String(input ?? "");
  let sum = digitsOf(s).reduce((a, b) => a + b, 0);
  if (sum === 0) sum = 9;
  while (sum > 9) {
    sum = digitsOf(String(sum)).reduce((a, b) => a + b, 0);
    if (sum === 0) sum = 9;
  }
  return sum as NumerologyEnergy;
}

export function getUniversalDay(date = new Date()): NumerologyEnergy {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return reduceNumber(`${y}${m}${d}`);
}

export function getPersonalDay(params: {
  birthMonth: number;
  birthDay: number;
  date?: Date;
}): NumerologyEnergy {
  const date = params.date ?? new Date();
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return reduceNumber(`${params.birthMonth}${params.birthDay}${y}${m}${d}`);
}

export function energyLabel(energy: NumerologyEnergy) {
  const labels: Record<NumerologyEnergy, string> = {
    1: "Initiate",
    2: "Collaborate",
    3: "Express",
    4: "Ground",
    5: "Shift",
    6: "Care",
    7: "Insight",
    8: "Achieve",
    9: "Complete",
  };
  return labels[energy];
}

export function universalTheme(energy: NumerologyEnergy) {
  const themes: Record<NumerologyEnergy, string> = {
    1: "Start & set direction",
    2: "Connect & align",
    3: "Express & inspire",
    4: "Order & execution",
    5: "Change & communicate",
    6: "Repair & nurture",
    7: "Review & see clearly",
    8: "Results & value",
    9: "Close & upgrade",
  };
  return themes[energy];
}

export function baseRuleSnippets() {
  return [
    "1 — Initiation: good for launches, submissions, leading.",
    "4 — Stability: good for contracts, grounding, organizing.",
    "5 — Movement: good for communication, travel, breaking routine.",
    "8 — Results: good for money, power, outcomes.",
  ].join("\n");
}

export function compatibilityStars(
  personalDay: NumerologyEnergy,
  universalDay: NumerologyEnergy,
): 1 | 2 | 3 | 4 | 5 {
  const dist = Math.abs(personalDay - universalDay);
  if (dist === 0) return 5;
  if (dist === 1) return 4;
  if (dist === 2) return 3;
  if (dist === 3) return 2;
  return 1;
}

export function suggestedAction(stars: 1 | 2 | 3 | 4 | 5): "Act" | "Wait" {
  return stars >= 4 ? "Act" : "Wait";
}

export function baseDecisionReasons(params: {
  lifeNumber: NumerologyEnergy;
  personalDay: NumerologyEnergy;
  universalDay: NumerologyEnergy;
}) {
  const { lifeNumber, personalDay, universalDay } = params;
  const p = `${personalDay} (${energyLabel(personalDay)})`;
  const u = `${universalDay} (${energyLabel(universalDay)})`;
  const l = `${lifeNumber} (${energyLabel(lifeNumber)})`;

  const reasons: string[] = [];
  reasons.push(
    `Your personal day is ${p}, universal day is ${u}: today’s theme is “${universalTheme(universalDay)}”.`,
  );
  if (personalDay === 1 && universalDay === 4) {
    reasons.push(
      "Initiation meets a grounded day: turn ideas into a short list and take the first small step.",
    );
  } else if (personalDay === 4) {
    reasons.push(
      "Stability is online: good for grounding, tidying, and turning fog into a plan.",
    );
  } else if (personalDay === 5) {
    reasons.push("Shift energy is stronger: clarify first, communicate, then decide.");
  } else if (personalDay === 8) {
    reasons.push("Achievement energy is stronger: speak to outcomes and value clearly.");
  } else {
    reasons.push(
      `Your ${p} pairs with today’s ${u} in a complementary rhythm: follow the world’s tempo, then add your energy.`,
    );
  }
  reasons.push(
    `From life-path ${l}, this choice aligns resources and direction toward your “next version.”`,
  );
  return reasons;
}

export function basePositiveReverse(stars: 1 | 2 | 3 | 4 | 5) {
  if (stars >= 4) {
    return "Strong fit: the universe is giving you a “flow day”—each step gets easier feedback.";
  }
  if (stars === 3) {
    return "Medium fit: the universe nudges you to steady the rhythm first, then accelerate—confirm key variables.";
  }
  return "Lower fit is okay too: the universe is buying you prep time so you can win more calmly.";
}
