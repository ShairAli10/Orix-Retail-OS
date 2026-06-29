export type DateRangeFilter = {
  readonly from?: string;
  readonly to?: string;
};

export type ArchiveVisibility = "active" | "archived" | "all";

export type RepositoryFilter = {
  readonly storeId?: string;
  readonly branchId?: string;
  readonly businessDayId?: string;
  readonly status?: string;
  readonly documentNumber?: string;
  readonly search?: string;
  readonly dateRange?: DateRangeFilter;
  readonly archived?: ArchiveVisibility;
};

export type OptimisticConcurrency = {
  readonly expectedUpdatedAt?: string;
  readonly expectedSyncVersion?: number;
};

export type AuditMetadata = {
  readonly userId?: string;
  readonly timestamp: string;
};
