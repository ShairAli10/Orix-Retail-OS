import type { ApplicationService } from "../shared/application-service.js";
import type {
  RepositoryApplicationOperation,
  UseCaseFactoryOptions
} from "../shared/use-case-factory.js";
import { createRepositoryUseCase } from "../shared/use-case-factory.js";

export type HoldSaleInput = Record<string, unknown> & {
  readonly saleId: string;
};

export type HoldSaleOutput = {
  readonly saleId: string;
};

export type HoldSaleOperation = RepositoryApplicationOperation<HoldSaleInput, HoldSaleOutput>;

export const createHoldSaleUseCase = (
  options: UseCaseFactoryOptions<HoldSaleInput, HoldSaleOutput>
): ApplicationService<HoldSaleInput, HoldSaleOutput> =>
  createRepositoryUseCase(
    {
      name: "sales.hold-sale",
      permission: "sales.hold",
      requiredFields: ["saleId"]
    },
    options
  );
