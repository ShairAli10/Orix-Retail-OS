import type { ApplicationService } from "../shared/application-service.js";
import type {
  RepositoryApplicationOperation,
  UseCaseFactoryOptions
} from "../shared/use-case-factory.js";
import { createRepositoryUseCase } from "../shared/use-case-factory.js";

export type OpenDayInput = Record<string, unknown> & {
  readonly branchId: string;
  readonly businessDate: string;
};

export type OpenDayOutput = {
  readonly businessDayId: string;
};

export type OpenDayOperation = RepositoryApplicationOperation<OpenDayInput, OpenDayOutput>;

export const createOpenDayUseCase = (
  options: UseCaseFactoryOptions<OpenDayInput, OpenDayOutput>
): ApplicationService<OpenDayInput, OpenDayOutput> =>
  createRepositoryUseCase(
    {
      name: "business-day.open-day",
      permission: "business-day.open",
      requiredFields: ["branchId", "businessDate"]
    },
    options
  );
