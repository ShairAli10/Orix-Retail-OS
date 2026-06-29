import type { ApplicationService } from "../shared/application-service.js";
import type {
  RepositoryApplicationOperation,
  UseCaseFactoryOptions
} from "../shared/use-case-factory.js";
import { createRepositoryUseCase } from "../shared/use-case-factory.js";

export type ReceivePurchaseInput = Record<string, unknown> & {
  readonly purchaseId: string;
};

export type ReceivePurchaseOutput = {
  readonly purchaseId: string;
};

export type ReceivePurchaseOperation = RepositoryApplicationOperation<
  ReceivePurchaseInput,
  ReceivePurchaseOutput
>;

export const createReceivePurchaseUseCase = (
  options: UseCaseFactoryOptions<ReceivePurchaseInput, ReceivePurchaseOutput>
): ApplicationService<ReceivePurchaseInput, ReceivePurchaseOutput> =>
  createRepositoryUseCase(
    {
      name: "purchases.receive-purchase",
      permission: "purchases.receive",
      requiredFields: ["purchaseId"]
    },
    options
  );
