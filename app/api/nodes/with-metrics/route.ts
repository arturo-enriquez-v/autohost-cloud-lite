import { NextResponse } from "next/server";
import { getNodesWithMetricsBackend, mapNodeWithMetricsFromBackend } from "@/lib/features/nodes/nodes/fetch/nodes.server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import type { NodeWithMetricsBackendResponse } from "@/lib/types";

export async function GET() {
  const accessToken = await getAccessTokenFromCookie();

  if (!accessToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const res = await getNodesWithMetricsBackend(accessToken);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(errorData, { status: res.status });
    }

    const backendNodes: NodeWithMetricsBackendResponse[] | null = await res.json();
    
    // Validar que la respuesta sea un array
    if (!backendNodes || !Array.isArray(backendNodes)) {
      return NextResponse.json([], { status: 200 });
    }
    
    // Mapear nodos y calcular estado basado en last_seen_at
    const mappedNodes = backendNodes.map((node) => {
      const mappedNode = mapNodeWithMetricsFromBackend(node);
      return mappedNode;
    });
    
    return NextResponse.json(mappedNodes, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
