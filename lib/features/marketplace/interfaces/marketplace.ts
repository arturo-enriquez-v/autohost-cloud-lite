export interface AppEnvVar {
  key: string;
  label: string;
  description?: string;
  required: boolean;
  secret: boolean;
  default?: string;
}

export interface AppCatalogEntry {
  name: string;
  display_name: string;
  description: string;
  category: string;
  icon?: string;
  env_vars: AppEnvVar[];
}

export interface MarketplaceApp {
  id: string;
  node_id: string;
  app_name: string;
  job_id?: string;
  status: "installing" | "running" | "failed";
  created_at: string;
  updated_at: string;
}

export interface DeployAppResponse {
  marketplace_app_id: string;
  job_id: string;
  app_name: string;
  status: string;
}
