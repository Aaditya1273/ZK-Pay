export type ServiceType = "A2MCP" | "A2A";
export type ServiceTypeLabel = "api_service" | "agent_to_agent";
export type Role = "user" | "asp" | "evaluator";
export type PipelineStepId = "idle" | "generating" | "reviewing" | "deploying" | "done";
export type DeployStatus = "idle" | "precheck" | "uploading" | "validating" | "creating" | "activating" | "success" | "failed";
export type ValidationSeverity = "block" | "warn" | "info";

export interface AspIdentity {
  name: string;
  description: string;
  avatar: string | null;
  role: Role;
}

export interface Service {
  id?: string;
  serviceName: string;
  serviceDescription: string;
  serviceType: ServiceType;
  fee: string;
  endpoint?: string;
}

export interface PricingSuggestion {
  model: "pay_per_call" | "subscription" | "escrow";
  fee: string;
  currency: string;
  description: string;
}

export interface MarketingKit {
  xPost: string;
  demoScript: string;
  tagline: string;
  announcement: string;
}

export interface PipelineStepRecord {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed";
  progress?: number;
}

export interface GenerationArtifacts {
  identity: AspIdentity;
  services: Service[];
  pricing: PricingSuggestion;
  marketing: MarketingKit;
}

export interface ValidationFinding {
  field: string;
  code: string;
  severity: ValidationSeverity;
  issue: string;
  fix: string;
}

export interface ValidationResult {
  pass: boolean;
  findings: ValidationFinding[];
}

export interface DeployProgress {
  status: DeployStatus;
  message: string;
  progress: number;
  result?: {
    agentId?: string;
    avatarUrl?: string;
    validationPassed?: boolean;
  };
  error?: string;
}

export interface DeployResult {
  agentId: string;
  agentName: string;
  services: Service[];
  avatarUrl: string;
  status: "published" | "pending_review" | "failed";
  marketplaceUrl?: string;
}
