import { API_BASE_HEADER, API_KEY_HEADER } from "@/lib/settings";
import { resolveUpstream, UpstreamError, upstreamUrl } from "@/lib/upstream";

type FetchLike = typeof fetch;

export async function forwardToOpenAI(
  request: Request,
  path: string,
  fetchImpl: FetchLike = fetch,
  method: "GET" | "POST" = "POST",
): Promise<Response> {
  const apiKey = request.headers.get(API_KEY_HEADER)?.trim() ?? "";
  if (!apiKey) {
    return Response.json({ error: "缺少 API 金鑰。請在設定中輸入。" }, { status: 400 });
  }
  let target: string;
  try {
    const base = resolveUpstream(request.headers.get(API_BASE_HEADER));
    target = upstreamUrl(base, path);
  } catch (error) {
    const message = error instanceof UpstreamError ? error.message : "API 基底網址無法使用。";
    return Response.json({ error: message }, { status: 400 });
  }

  const contentType = request.headers.get("content-type");
  const body = method === "GET" ? undefined : await request.arrayBuffer();
  let upstream: Response;
  try {
    upstream = await fetchImpl(target, {
      method,
      redirect: "manual",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(contentType && method !== "GET" ? { "content-type": contentType } : {}),
      },
      body,
    });
  } catch {
    return Response.json(
      { error: "連不到上游 API。請檢查網路，或確認 API 基底網址正確。" },
      { status: 502 },
    );
  }
  if (upstream.status >= 300 && upstream.status < 400) {
    return Response.json({ error: "上游 API 回傳了重新導向，已中止請求。" }, { status: 502 });
  }
  const bytes = await upstream.arrayBuffer();
  const responseType = upstream.headers.get("content-type") ?? "application/json";
  return new Response(bytes, {
    status: upstream.status,
    headers: { "content-type": responseType },
  });
}
