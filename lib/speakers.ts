export function displaySpeaker(speaker: string, names: Record<string, string>): string {
  const id = speaker.trim();
  if (!id) return "";
  const renamed = names[id];
  if (renamed && renamed.trim()) return renamed.trim();
  if (/^[A-Za-z]$/.test(id) || /^speaker\s*\d+$/i.test(id) || /^\d+$/.test(id)) {
    return `講者 ${id}`;
  }
  return id;
}

export function speakerIds(segments: { speaker: string }[]): string[] {
  const ids: string[] = [];
  for (const segment of segments) {
    const id = segment.speaker.trim();
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}
