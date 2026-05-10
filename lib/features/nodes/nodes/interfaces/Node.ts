

export type NodeStatus = "online" | "offline";
export type ContainerStatus = "running" | "stopped";

export interface Container {
  name: string;
  status: ContainerStatus;
}

export interface Node {
    id: string;
    name: string;
    hostname?: string;
    status: NodeStatus;
    cpu: number;
    ram: number;
    disk: number;
    containers: Container[];
    ipLocal?: string;
    os?: string;
    arch?: string;
    versionAgent?: string;
    projectId?: string;
    lastSeenAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

