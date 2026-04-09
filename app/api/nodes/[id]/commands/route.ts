import { NextResponse } from "next/server";
import { getNodeCommandsBackend, mapNodeCommandFromBackend } from "@/lib/api/node-commands";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import type { NodeCommandBackendResponse } from "@/lib/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: nodeId } = await params;
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await getNodeCommandsBackend(nodeId, accessToken);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(errorData, { status: res.status });
    }

    const backendCmds: NodeCommandBackendResponse[] | null = await res.json();
    if (!backendCmds || !Array.isArray(backendCmds)) {
      return NextResponse.json([], { status: 200 });
    }

    const commands = backendCmds.map(mapNodeCommandFromBackend);
    return NextResponse.json(commands, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
