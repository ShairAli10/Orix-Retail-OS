import type { ApplicationService } from "../shared/application-service.js";
import type {
  RepositoryApplicationOperation,
  UseCaseFactoryOptions
} from "../shared/use-case-factory.js";
import { createRepositoryUseCase } from "../shared/use-case-factory.js";

export type ResumeSaleInput = Record<string, unknown> & {
  readonly saleId: string;
};

export type ResumeSaleOutput = {
  readonly saleId: string;
};

export type ResumeSaleOperation = RepositoryApplicationOperation<ResumeSaleInput, ResumeSaleOutput>;

export const createResumeSaleUseCase = (
  options: UseCaseFactoryOptions<ResumeSaleInput, ResumeSaleOutput>
): ApplicationService<ResumeSaleInput, ResumeSaleOutput> =>
  createRepositoryUseCase(
    {
      name: "sales.resume-sale",
      permission: "sales.resume",
      requiredFields: ["saleId"]
    },
    options
  );
