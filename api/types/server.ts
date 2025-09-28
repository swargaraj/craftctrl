export type ServerType =
  | "vanilla"
  | "paper"
  | "bukkit"
  | "spigot"
  | "fabric"
  | "forge"
  | "bedrock";

export type ServerStatus =
  | "starting"
  | "running"
  | "stopping"
  | "stopped"
  | "error";

export interface MinecraftServer {
  id: string;
  name: string;
  version: string;
  type: ServerType;
  ports: number[];
  memory: string;
  containerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateServerRequest {
  name: string;
  version: string;
  type: ServerType;
  ports: number[];
  memory?: string;
}

export interface UpdateServerRequest {
  name?: string;
  memory?: string;
  ports: number[];
}

export interface ServerStats {
  cpuUsage: number;
  memoryUsage: number;
  onlinePlayers: number;
  uptime: number;
  diskUsage: number;
}

export interface DockerContainerInfo {
  id: string;
  name: string;
  status: string;
  state: string;
  created: number;
  ports: Array<{ public: number; private: number }>;
}
