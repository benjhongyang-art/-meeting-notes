import { formatDuration, formatTaipei, formatTimestamp, taipeiDateInput } from "@/lib/format";
import { displaySpeaker } from "@/lib/speakers";
import type { Meeting } from "@/lib/types";

export function Printable({ meeting }: { meeting: Meeting }) {
  const minutes = meeting.minutes;
  const title = minutes?.title.trim() || meeting.title;
  return (
    <article className="print-sheet space-y-5 rounded-[28px] bg-card px-5 py-6 ring-1 ring-foreground/10 sm:px-8">
      <header>
        <p className="text-xs tracking-wide text-primary">會記</p>
        <h2 className="mt-1 text-2xl font-medium">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {minutes?.date || taipeiDateInput(meeting.createdAt) || "日期未記載"}
          {" · "}
          建立於 {formatTaipei(meeting.createdAt)}
          {meeting.durationSec > 0 ? ` · ${formatDuration(meeting.durationSec)}` : ""}
        </p>
        {minutes && minutes.attendees.length > 0 ? (
          <p className="mt-1 text-sm">出席者：{minutes.attendees.join("、")}</p>
        ) : null}
      </header>
      {minutes ? (
        <>
          <Section title="摘要">
            <p className="whitespace-pre-wrap text-sm leading-7">{minutes.summary || "（無）"}</p>
          </Section>
          <Section title="討論重點">
            <Bullet items={minutes.discussionPoints} />
          </Section>
          <Section title="決議">
            <Bullet items={minutes.decisions} />
          </Section>
          <Section title="待辦事項">
            {minutes.actionItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">（無）</p>
            ) : (
              <ul className="space-y-2">
                {minutes.actionItems.map((item) => (
                  <li key={item.id} className="text-sm leading-6">
                    {item.task || "（未填事項）"}
                    <span className="text-muted-foreground">
                      {" "}
                      · {item.owner || "未指定"} · {item.dueDate || "未定期限"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">尚未產生會議紀錄。</p>
      )}
      <Section title="逐字稿">
        {meeting.segments.length === 0 ? (
          <p className="text-sm text-muted-foreground">（沒有逐字稿）</p>
        ) : (
          <ol className="space-y-3">
            {meeting.segments.map((segment) => {
              const who = displaySpeaker(segment.speaker, meeting.speakerNames);
              return (
                <li key={segment.id}>
                  <p className="font-mono text-xs text-muted-foreground">
                    {formatTimestamp(segment.startMs)}
                    {who ? `  ${who}` : ""}
                  </p>
                  <p className="mt-1 text-sm leading-7">{segment.text}</p>
                </li>
              );
            })}
          </ol>
        )}
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-base font-medium">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Bullet({ items }: { items: string[] }) {
  const filled = items.map((item) => item.trim()).filter(Boolean);
  if (filled.length === 0) return <p className="text-sm text-muted-foreground">（無）</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-6">
      {filled.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
