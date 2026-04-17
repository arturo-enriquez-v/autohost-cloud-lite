import { NextRequest, NextResponse } from "next/server";
import { getNodeMarketplaceAppsBackend } from "@/lib/api/marketplace";
import { getAccessTokenFromCookie } from "@/lib/cookies";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { nodeId } = await params;
  const res = await getNodeMarketplaceAppsBackend(nodeId, accessToken);
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
