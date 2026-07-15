export interface PreCheckResult {
  canCreate: boolean;
  role: string;
  reason?: string;
  consent?: {
    terms: string;
    consentKey: string;
  };
  existingSameRole?: Array<{
    agentId: string;
    name: string;
  }>;
  aspCount?: number;
}

export interface ValidateListingFinding {
  field: string;
  code: string;
  severity: "block" | "warn";
  issue: string;
  fix: string;
}

export interface ValidateListingResult {
  pass: boolean;
  findings: ValidateListingFinding[];
}

export interface CreateResult {
  newAgentId: string | null;
  agent?: {
    agentId: string;
  };
}

export interface ActivateResult {
  success: boolean;
  approvalStatus?: number;
  blockType?: number;
  agentRole?: string;
  submitApproval?: boolean;
}

export interface UploadResult {
  url: string;
}

export interface AgentDetail {
  agentId: string;
  name: string;
  role: string;
  description: string;
  status: string;
  approvalStatus: number;
  rating: number | null;
}

export interface ServiceListEntry {
  id: string;
  serviceName: string;
  serviceDescription: string;
  serviceType: "A2MCP" | "A2A";
  fee: string;
  endpoint?: string;
}
