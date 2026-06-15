export interface RgmBlock {
  id: string;
  label: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface RgmTemplate {
  id: string;
  tenantId: string;
  contractId: string;
  name: string;
  blocks: RgmBlock[];
  updatedAt: string;
  updatedBy: string;
}

export interface RgmPreview {
  contractId: string;
  contractCode: string;
  period: string;
  blocks: RgmBlock[];
  data: {
    scheduledWorkOrders: number;
    completedWorkOrders: number;
    approvedWorkOrders: number;
    onTimePct: number;
    openRequests: number;
    measurement: { gross: number; discount: number; net: number } | null;
    executiveSummary: string;
  };
}
