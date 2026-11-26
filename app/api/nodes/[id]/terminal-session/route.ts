import { NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/cookies";

// GET /api/nodes/[id]/terminal-session
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: nodeId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      node_id: nodeId,
      token: accessToken,
      // PUBLIC_API_URL first: it is read when the server starts, while NEXT_PUBLIC_* is fixed at build time.
      api_url: process.env.PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || "",
    },
    { status: 200 }
  );
}

