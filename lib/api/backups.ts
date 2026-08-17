import { backendFetch } from "@/lib/api";

export interface StorageCredential {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  bucket: string;
  region: string;
  access_key_id: string;
  is_default: boolean;
  created_at: string;
}

export interface BackupConfig {
  id?: string;
  node_id?: string;
  container_name?: string;
  volumes?: string[] | any;
  cron_expression?: string;
  retention_count?: number;
  pause_container?: boolean;
  storage_credential_id?: string;
  enabled: boolean;
}

export interface BackupRecord {
  id: string;
  backup_config_id: string;
  node_id: string;
  container_name: string;
  s3_key: string;
  file_size_bytes: number;
  trigger_type: string;
  status: string;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export async function fetchStorageCredentials(accessToken: string): Promise<StorageCredential[]> {
  const res = await backendFetch("/v1/backups/credentials", {}, accessToken);
  if (!res.ok) return [];
  return res.json();
}

export async function createStorageCredentialBackend(data: any, accessToken: string) {
  return backendFetch("/v1/backups/credentials", {
    method: "POST",
    body: JSON.stringify(data),
  }, accessToken);
}

export async function deleteStorageCredentialBackend(id: string, accessToken: string) {
  return backendFetch(`/v1/backups/credentials/${id}`, {
    method: "DELETE",
  }, accessToken);
}

export async function fetchBackupConfig(nodeId: string, containerName: string, accessToken: string): Promise<BackupConfig | null> {
  const res = await backendFetch(`/v1/backups/config/${nodeId}/${containerName}`, {}, accessToken);
  if (!res.ok) return null;
  return res.json();
}

export async function upsertBackupConfigBackend(nodeId: string, containerName: string, config: any, accessToken: string) {
  return backendFetch(`/v1/backups/config/${nodeId}/${containerName}`, {
    method: "PUT",
    body: JSON.stringify(config),
  }, accessToken);
}

export async function fetchBackupRecords(nodeId: string, containerName: string, accessToken: string): Promise<BackupRecord[]> {
  const res = await backendFetch(`/v1/backups/records/${nodeId}/${containerName}`, {}, accessToken);
  if (!res.ok) return [];
  return res.json();
}

export async function runManualBackupBackend(nodeId: string, containerName: string, accessToken: string) {
  return backendFetch(`/v1/backups/run/${nodeId}/${containerName}`, {
    method: "POST",
  }, accessToken);
}

export async function restoreBackupBackend(recordId: string, accessToken: string) {
  return backendFetch(`/v1/backups/restore/${recordId}`, {
    method: "POST",
  }, accessToken);
}
