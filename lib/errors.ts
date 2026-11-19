export function extractErrorMessage(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed) as {
      error?: { message?: string } | string;
      message?: string;
    };
    if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error.trim();
    if (parsed.error && typeof parsed.error === "object" && parsed.error.message) {
      return parsed.error.message.trim();
    }
    if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message.trim();
  } catch {
    // Plain text from a proxy or gateway.
  }
  return trimmed.slice(0, 400);
}

export function humanizeApiError(status: number, body: string): string {
  const message = extractErrorMessage(body);
  if (status === 400 && message && /[\u4e00-\u9fff]/.test(message)) return message;
  if (status === 401) return "API 金鑰無效或已過期。請到設定重新輸入。";
  if (status === 403) return `這個金鑰沒有權限使用所選的模型。${message ? `（${message}）` : ""}`;
  if (status === 404) {
    return `找不到模型或 API 路徑。請確認模型名稱與 API 基底網址。${message ? `（${message}）` : ""}`;
  }
  if (status === 413) return "音檔仍然太大，超過上游限制。請縮短後再試。";
  if (status === 429) return "請求太頻繁，或帳戶額度不足。請稍後再試，或到 OpenAI 查看用量。";
  if (status >= 500) return "語音服務暫時無法使用。請稍後再試。";
  if (message) return `請求失敗（${status}）：${message}`;
  return `請求失敗（${status}）。請稍後再試。`;
}

export function micErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "沒有麥克風權限。請在瀏覽器網址列允許麥克風後，再按一次開始錄音。";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "找不到麥克風。請接上麥克風，或改上傳音檔。";
  }
  if (name === "NotReadableError") {
    return "麥克風被其他程式占用。請關閉其他正在錄音的程式後再試。";
  }
  if (error instanceof Error && error.message) return error.message;
  return "無法開始錄音。請改用上傳音檔，或換一個瀏覽器再試。";
}
