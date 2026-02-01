import { generatePreviewToken } from "@/lib/utils/generatePreviewToken";

export async function POST(req) {
  const body = await req.json();
  const token = await generatePreviewToken(body);
  return Response.json({ token });
}
