import type { ApplicationService } from "../shared/application-service.js";
import { requirePositiveNumber } from "../shared/validation.js";
import type {
  RepositoryApplicationOperation,
  UseCaseFactoryOptions
} from "../shared/use-case-factory.js";
import { createRepositoryUseCase } from "../shared/use-case-factory.js";

export type AdjustStockInput = Record<string, unknown> & {
  readonly productId: string;
  readonly branchId: string;
  readonly quantity: number;
  readonly reason: string;
};

export type AdjustStockOutput = {
  readonly inventoryTransactionId: string;
};

export type AdjustStockOperation = RepositoryApplicationOperation<
  AdjustStockInput,
  AdjustStockOutput
>;

export const createAdjustStockUseCase = (
  options: UseCaseFactoryOptions<AdjustStockInput, AdjustStockOutput>
): ApplicationService<AdjustStockInput, AdjustStockOutput> =>
  createRepositoryUseCase(
    {
      name: "inventory.adjust-stock",
      permission: "inventory.adjust",
      requiredFields: ["productId", "branchId", "reason"],
      validators: [requirePositiveNumber<AdjustStockInput>("quantity")]
    },
    options
  );
