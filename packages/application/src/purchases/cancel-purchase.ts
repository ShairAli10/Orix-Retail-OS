import type { ApplicationService } from "../shared/application-service.js";
import type {
  RepositoryApplicationOperation,
  UseCaseFactoryOptions
} from "../shared/use-case-factory.js";
import { createRepositoryUseCase } from "../shared/use-case-factory.js";

export type CancelPurchaseInput = Record<string, unknown> & {
  readonly purchaseId: string;
  readonly reason: string;
};

export type CancelPurchaseOutput = {
  readonly purchaseId: string;
};

export type CancelPurchaseOperation = RepositoryApplicationOperation<
  CancelPurchaseInput,
  CancelPurchaseOutput
>;

export const createCancelPurchaseUseCase = (
  options: UseCaseFactoryOptions<CancelPurchaseInput, CancelPurchaseOutput>
): ApplicationService<CancelPurchaseInput, CancelPurchaseOutput> =>
  createRepositoryUseCase(
    {
      name: "purchases.cancel-purchase",
      permission: "purchases.cancel",
      requiredFields: ["purchaseId", "reason"]
    },
    options
  );
