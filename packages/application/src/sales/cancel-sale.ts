import type { ApplicationService } from "../shared/application-service.js";
import type {
  RepositoryApplicationOperation,
  UseCaseFactoryOptions
} from "../shared/use-case-factory.js";
import { createRepositoryUseCase } from "../shared/use-case-factory.js";

export type CancelSaleInput = Record<string, unknown> & {
  readonly saleId: string;
  readonly reason: string;
};

export type CancelSaleOutput = {
  readonly saleId: string;
};

export type CancelSaleOperation = RepositoryApplicationOperation<CancelSaleInput, CancelSaleOutput>;

export const createCancelSaleUseCase = (
  options: UseCaseFactoryOptions<CancelSaleInput, CancelSaleOutput>
): ApplicationService<CancelSaleInput, CancelSaleOutput> =>
  createRepositoryUseCase(
    {
      name: "sales.cancel-sale",
      permission: "sales.cancel",
      requiredFields: ["saleId", "reason"]
    },
    options
  );
