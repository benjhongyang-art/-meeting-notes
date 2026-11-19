import { forwardToOpenAI } from "@/lib/proxy";

export async function POST(request: Request) {
  return forwardToOpenAI(request, "models", fetch, "GET");
}
