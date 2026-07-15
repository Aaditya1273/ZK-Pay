import type { AspIdentity, Service, DeployResult } from "./asp";

export interface DeployRequest {
  identity: AspIdentity;
  services: Service[];
}

export interface DeployProgressState {
  step: "precheck" | "upload" | "validate" | "create" | "activate" | "done" | "error";
  message: string;
  progress: number;
}

export interface DeployResponse {
  success: boolean;
  data?: DeployResult;
  error?: string;
}
