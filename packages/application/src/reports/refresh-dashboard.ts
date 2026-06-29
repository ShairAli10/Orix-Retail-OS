import type { ApplicationService } from "../shared/application-service.js";
import type {
  RepositoryApplicationOperation,
  UseCaseFactoryOptions
} from "../shared/use-case-factory.js";
import { createRepositoryUseCase } from "../shared/use-case-factory.js";

export type RefreshDashboardInput = Record<string, unknown> & {
  readonly storeId: string;
};

export type RefreshDashboardOutput = {
  readonly refreshedAt: string;
};

export type RefreshDashboardOperation = RepositoryApplicationOperation<
  RefreshDashboardInput,
  RefreshDashboardOutput
>;

export const createRefreshDashboardUseCase = (
  options: UseCaseFactoryOptions<RefreshDashboardInput, RefreshDashboardOutput>
): ApplicationService<RefreshDashboardInput, RefreshDashboardOutput> =>
  createRepositoryUseCase(
    {
      name: "reports.refresh-dashboard",
      permission: "reports.dashboard.refresh",
      requiredFields: ["storeId"]
    },
    options
  );
