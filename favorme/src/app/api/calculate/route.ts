import { NextResponse } from "next/server";

function toDigits(s: string) {
  return (s.match(/\d/g) || []).map((d) => Number(d));
}

function reduceToLifeNumber(digits: number[]) {
  let sum = digits.reduce((a, b) => a + b, 0);
  while (sum > 9) {
    sum = String(sum)
      .split("")
      .reduce((a, b) => a + Number(b), 0);
  }
  return sum === 0 ? 9 : sum;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    birthday?: string;
    input?: string;
  };

  const birthday = (body.birthday || "").trim();
  const digits = toDigits(birthday);
  const lifeNumber = digits.length ? reduceToLifeNumber(digits) : 9;

  const energySeed = (Date.now() + lifeNumber * 97) % 100;
  const energy = 55 + (energySeed % 41); // 55-95

  return NextResponse.json({
    lifeNumber,
    energy,
    todayHint: `Your energy leans steady-with-momentum—aim attention at what you actually want.`,
  });
}

