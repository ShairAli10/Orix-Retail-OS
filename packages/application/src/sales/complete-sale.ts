import type { ApplicationService } from "../shared/application-service.js";
import type {
  RepositoryApplicationOperation,
  UseCaseFactoryOptions
} from "../shared/use-case-factory.js";
import { createRepositoryUseCase } from "../shared/use-case-factory.js";

export type CompleteSaleInput = Record<string, unknown> & {
  readonly saleId: string;
};

export type CompleteSaleOutput = {
  readonly saleId: string;
};

export type CompleteSaleOperation = RepositoryApplicationOperation<
  CompleteSaleInput,
  CompleteSaleOutput
>;

export const createCompleteSaleUseCase = (
  options: UseCaseFactoryOptions<CompleteSaleInput, CompleteSaleOutput>
): ApplicationService<CompleteSaleInput, CompleteSaleOutput> =>
  createRepositoryUseCase(
    {
      name: "sales.complete-sale",
      permission: "sales.complete",
      requiredFields: ["saleId"]
    },
    options
  );
