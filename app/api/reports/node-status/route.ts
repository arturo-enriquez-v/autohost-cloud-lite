import { getAccessTokenFromCookie } from "@/lib/cookies";
import { backendFetch } from "@/lib/api";
import { API_ENDPOINTS } from "@/config/constants";
import { NextResponse } from "next/server";

export async function POST() {
  const accessToken = await getAccessTokenFromCookie();

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await backendFetch(
      API_ENDPOINTS.REPORTS.TRIGGER_NODE_STATUS,
      { method: "POST" },
      accessToken
    );

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
