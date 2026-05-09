import type {
    GetNodeRequest,
    UpdateNodeRequest,
    DeleteNodeRequest,
} from "../interfaces/NodeRequests";
import { fetchWithAuth } from "@/lib/api/index";
import { CLIENT_API_NODES_ENDPOINTS } from "./constants";


export async function getAll(): Promise<Response> {
    return fetchWithAuth(CLIENT_API_NODES_ENDPOINTS.NODES.LIST, { method: "GET" });
}

export async function getAllWithMetrics(): Promise<Response> {
    return fetchWithAuth(CLIENT_API_NODES_ENDPOINTS.NODES.WITH_METRICS, { method: "GET" });
}

export async function getNode(
    { id }: GetNodeRequest,
): Promise<Response> {
    return fetchWithAuth(CLIENT_API_NODES_ENDPOINTS.NODES.DETAIL(id), { method: "GET" });
}

export async function update(
    { id, hostname }: UpdateNodeRequest,
): Promise<Response> {
    return fetchWithAuth(
        CLIENT_API_NODES_ENDPOINTS.NODES.UPDATE,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, hostname }),
        },
    );
}

export async function remove(
    { id }: DeleteNodeRequest,
): Promise<Response> {
    return fetchWithAuth(CLIENT_API_NODES_ENDPOINTS.NODES.DELETE(id), { method: "DELETE" });
}

