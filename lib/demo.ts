import type { Meeting } from "@/lib/types";

export const DEMO_ID = "demo-knowledge-base";

const DEMO: Meeting = {
  id: DEMO_ID,
  title: "客服知識庫上線會議",
  createdAt: "2026-11-18T02:30:00.000Z",
  updatedAt: "2026-11-18T03:05:00.000Z",
  durationSec: 92,
  source: "demo",
  transcriptSource: "demo",
  speakerNames: {
    A: "陳品妤",
    B: "Kevin Chen",
    C: "林子謙",
    D: "周書涵",
  },
  segments: [
    {
      id: "demo-1",
      startMs: 3_000,
      endMs: 18_000,
      speaker: "A",
      text: "我們今天確認客服知識庫下週二上線的範圍。英文版跟繁中版都要在同一個 release。",
    },
    {
      id: "demo-2",
      startMs: 18_000,
      endMs: 32_000,
      speaker: "B",
      text: "Onboarding 文章我已經改到八成，剩下退款流程那篇要等法務。",
    },
    {
      id: "demo-3",
      startMs: 32_000,
      endMs: 48_000,
      speaker: "C",
      text: "法務說週四前回覆。如果來不及，退款那篇就先不上，不要擋整個 launch。",
    },
    {
      id: "demo-4",
      startMs: 48_000,
      endMs: 65_000,
      speaker: "D",
      text: "搜尋的 SLA 我們先訂 99.5%。超過就走 status page，不要先做簡訊通知。",
    },
    {
      id: "demo-5",
      startMs: 65_000,
      endMs: 82_000,
      speaker: "A",
      text: "好，那決議是下週二上線。退款文章若週四前沒過就延後。Kevin 週五前補完 onboarding，子謙跟法務對時程。",
    },
    {
      id: "demo-6",
      startMs: 82_000,
      endMs: 92_000,
      speaker: "D",
      text: "我週三前把監控儀表板的錯誤率加上繁中搜尋。",
    },
  ],
  minutes: {
    title: "客服知識庫上線會議",
    date: "2026-11-18",
    attendees: ["陳品妤", "Kevin Chen", "林子謙", "周書涵"],
    summary:
      "團隊確認客服知識庫於下週二上線，繁中與英文同一版發布。退款流程文章若法務週四前未通過就延後，不阻擋上線。搜尋可用性先以 99.5% 為目標，異常時只更新狀態頁。",
    discussionPoints: [
      "繁中與英文知識庫要同一版上線。",
      "Onboarding 文章已完成約八成，退款流程仍待法務。",
      "搜尋 SLA 暫訂 99.5%，異常時使用 status page，暫不做簡訊通知。",
    ],
    decisions: [
      "下週二上線，退款文章若週四前未通過就延後。",
      "搜尋異常先走狀態頁，不先做簡訊通知。",
    ],
    actionItems: [
      { id: "demo-a1", task: "補完 onboarding 文章", owner: "Kevin Chen", dueDate: "2026-11-21" },
      { id: "demo-a2", task: "與法務確認退款文章時程", owner: "林子謙", dueDate: "2026-11-20" },
      { id: "demo-a3", task: "在監控儀表板加上繁中搜尋錯誤率", owner: "周書涵", dueDate: "2026-11-19" },
    ],
  },
};

export function demoMeeting(): Meeting {
  return structuredClone(DEMO);
}
