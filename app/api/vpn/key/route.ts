import { generateVPNKeyBackend } from "@/lib/features/vpn/fetch/vpn.server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { NextResponse } from "next/server";

export async function POST() {
  const accessToken = await getAccessTokenFromCookie();

  if (!accessToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const res = await generateVPNKeyBackend(accessToken);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Failed to generate VPN key" }));
      return NextResponse.json(errorData, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
