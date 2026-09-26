import { backendFetch } from "@/lib/api";

export async function getClustersBackend(accessToken?: string) {
  return backendFetch("/v1/clusters", { method: "GET" }, accessToken);
}

export async function getClusterByIDBackend(id: string, accessToken?: string) {
  return backendFetch(`/v1/clusters/${id}`, { method: "GET" }, accessToken);
}

export async function createClusterBackend(
  body: { name: string; manager_node_id: string; worker_node_ids: string[] },
  accessToken?: string
) {
  return backendFetch(
    "/v1/clusters",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    accessToken
  );
}

export async function deleteClusterBackend(id: string, accessToken?: string) {
  return backendFetch(`/v1/clusters/${id}`, { method: "DELETE" }, accessToken);
}

export async function addClusterNodeBackend(
  clusterId: string,
  body: { node_id: string; role: string },
  accessToken?: string
) {
  return backendFetch(
    `/v1/clusters/${clusterId}/nodes`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    accessToken
  );
}

export async function removeClusterNodeBackend(
  clusterId: string,
  nodeId: string,
  accessToken?: string
) {
  return backendFetch(`/v1/clusters/${clusterId}/nodes/${nodeId}`, { method: "DELETE" }, accessToken);
}

export async function createClusterServiceBackend(
  clusterId: string,
  body: { name: string; image: string; ports?: string; env_vars?: Record<string, string>; replicas?: number },
  accessToken?: string
) {
  return backendFetch(
    `/v1/clusters/${clusterId}/services`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    accessToken
  );
}

export async function scaleClusterServiceBackend(
  clusterId: string,
  serviceId: string,
  replicas: number,
  accessToken?: string
) {
  return backendFetch(
    `/v1/clusters/${clusterId}/services/${serviceId}/scale`,
    {
      method: "PUT",
      body: JSON.stringify({ replicas }),
    },
    accessToken
  );
}

export async function deleteClusterServiceBackend(
  clusterId: string,
  serviceId: string,
  accessToken?: string
) {
  return backendFetch(`/v1/clusters/${clusterId}/services/${serviceId}`, { method: "DELETE" }, accessToken);
}

export async function configureAutoscalingBackend(
  clusterId: string,
  serviceId: string,
  policy: Record<string, any>,
  accessToken?: string
) {
  return backendFetch(
    `/v1/clusters/${clusterId}/services/${serviceId}/autoscaling`,
    {
      method: "PUT",
      body: JSON.stringify(policy),
    },
    accessToken
  );
}
