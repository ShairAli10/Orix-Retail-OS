import type { ApplicationService } from "../shared/application-service.js";
import type {
  RepositoryApplicationOperation,
  UseCaseFactoryOptions
} from "../shared/use-case-factory.js";
import { createRepositoryUseCase } from "../shared/use-case-factory.js";

export type CloseDayInput = Record<string, unknown> & {
  readonly businessDayId: string;
};

export type CloseDayOutput = {
  readonly businessDayId: string;
};

export type CloseDayOperation = RepositoryApplicationOperation<CloseDayInput, CloseDayOutput>;

export const createCloseDayUseCase = (
  options: UseCaseFactoryOptions<CloseDayInput, CloseDayOutput>
): ApplicationService<CloseDayInput, CloseDayOutput> =>
  createRepositoryUseCase(
    {
      name: "business-day.close-day",
      permission: "business-day.close",
      requiredFields: ["businessDayId"]
    },
    options
  );
