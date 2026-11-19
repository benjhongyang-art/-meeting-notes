import { DEFAULT_OPENAI_BASE } from "@/lib/constants";

export class UpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamError";
  }
}

export function resolveUpstream(input: string | null | undefined): URL {
  const raw = (input?.trim() || DEFAULT_OPENAI_BASE).replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UpstreamError("API 基底網址格式不正確。");
  }
  if (url.protocol !== "https:") {
    throw new UpstreamError("API 基底網址必須是 HTTPS。");
  }
  if (url.username || url.password) {
    throw new UpstreamError("請不要把帳號或密碼寫在網址裡。金鑰請填在 API 金鑰欄位。");
  }
  if (isBlockedHost(url.hostname)) {
    throw new UpstreamError("不允許連到本機、內部網路或私有網段。");
  }
  url.hash = "";
  return url;
}

export function upstreamUrl(base: URL, path: string): string {
  const prefix = base.pathname.replace(/\/+$/, "");
  const suffix = path.replace(/^\/+/, "");
  const query = base.search || "";
  return `${base.origin}${prefix}/${suffix}${query}`;
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "::"
  ) {
    return true;
  }
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const numbers = ipv4.slice(1).map(Number);
    if (numbers.some((part) => part > 255)) return true;
    const [a, b] = numbers;
    if (a === 10 || a === 127 || a === 0 || a === 255) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (host.includes(":")) {
    return host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd");
  }
  return false;
}
