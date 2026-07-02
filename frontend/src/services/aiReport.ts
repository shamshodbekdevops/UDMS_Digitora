import { api } from "@/lib/api";

export interface SessionData {
  driverName: string;
  deviceId: string;
  totalAlerts: number;
  dangerEvents: number;
  avgPerclos: number;
  maxPerclos: number;
  sessionDuration: string;
  alarmBreakdown: {
    level0: number;
    level1: number;
    level2: number;
    level3: number;
  };
  recentEvents: Array<{
    timestamp: string;
    level: number;
    message: string;
  }>;
  language: "uz" | "en" | "ko";
}

const LANG_INSTRUCTION: Record<string, string> = {
  uz: "Hisobotni O'zbek tilida yoz.",
  en: "Write the report in English.",
  ko: "보고서를 한국어로 작성하세요.",
};

export async function generateAIReport(data: SessionData): Promise<string> {
  const langInstruction = LANG_INSTRUCTION[data.language] ?? LANG_INSTRUCTION.uz;

  const prompt = `
You are a professional driver safety analyst for a logistics company.
Analyze the following driver monitoring data and write a detailed safety report.

Driver: ${data.driverName}
Device: ${data.deviceId}
Session Duration: ${data.sessionDuration}

ALERT STATISTICS:
- Total alerts: ${data.totalAlerts}
- Danger events (Level 3): ${data.dangerEvents}
- Average PERCLOS: ${(data.avgPerclos * 100).toFixed(1)}%
- Maximum PERCLOS: ${(data.maxPerclos * 100).toFixed(1)}%

ALARM BREAKDOWN:
- Level 0 (Normal): ${data.alarmBreakdown.level0} events
- Level 1 (Distraction): ${data.alarmBreakdown.level1} events
- Level 2 (Micro-sleep): ${data.alarmBreakdown.level2} events
- Level 3 (Critical): ${data.alarmBreakdown.level3} events

RECENT EVENTS (last 10):
${data.recentEvents.map((e) => `[${e.timestamp}] Level ${e.level}: ${e.message}`).join("\n")}

${langInstruction}

Write a professional safety report with these sections:
1. UMUMIY XULOSA / SUMMARY / 종합 요약 (2-3 sentences)
2. XAVF TAHLILI / RISK ANALYSIS / 위험 분석 (identify main risks)
3. TENDENSIYA / TREND / 경향 (how alertness changed during session)
4. TAVSIYALAR / RECOMMENDATIONS / 권고사항 (3-4 specific recommendations)
5. XAVFSIZLIK BALI / SAFETY SCORE / 안전 점수 (give a score 0-100 with explanation)

Keep it professional, concise, and actionable. Use emojis sparingly for section headers only.
`.trim();

  const result = await api.post<{ text: string }>("/ai-report/", {
    prompt,
    max_tokens: 1024,
  });

  if (!result.text) throw new Error("AI javob bo'sh keldi");
  return result.text;
}
