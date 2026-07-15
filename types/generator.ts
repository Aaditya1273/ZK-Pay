import type { AspIdentity, Service, PricingSuggestion, MarketingKit } from "./asp";

export interface GenerationRequest {
  prompt: string;
  model?: string;
}

export interface GenerationResult {
  identity: AspIdentity;
  services: Service[];
  pricing: PricingSuggestion;
  marketing: MarketingKit;
}

export interface PipelineState {
  currentStep: "idle" | "generating" | "reviewing" | "deploying" | "done";
  steps: Array<{
    id: string;
    label: string;
    status: "pending" | "running" | "completed" | "failed";
    progress?: number;
  }>;
  artifacts: GenerationResult | null;
}
