export interface GetNodeRequest {
  id: string;
}

export interface UpdateNodeRequest {
  id: string;
  hostname: string;
}

export interface DeleteNodeRequest {
  id: string;
}

export interface GetNodeMetricsHistoryRequest {
  nodeId: string;
  from?: string;
  to?: string;
  bucket?: string;
}
