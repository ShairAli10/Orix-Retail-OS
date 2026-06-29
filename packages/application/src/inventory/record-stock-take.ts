import type { ApplicationService } from "../shared/application-service.js";
import type {
  RepositoryApplicationOperation,
  UseCaseFactoryOptions
} from "../shared/use-case-factory.js";
import { createRepositoryUseCase } from "../shared/use-case-factory.js";

export type RecordStockTakeInput = Record<string, unknown> & {
  readonly branchId: string;
  readonly countedAt: string;
};

export type RecordStockTakeOutput = {
  readonly stockTakeId: string;
};

export type RecordStockTakeOperation = RepositoryApplicationOperation<
  RecordStockTakeInput,
  RecordStockTakeOutput
>;

export const createRecordStockTakeUseCase = (
  options: UseCaseFactoryOptions<RecordStockTakeInput, RecordStockTakeOutput>
): ApplicationService<RecordStockTakeInput, RecordStockTakeOutput> =>
  createRepositoryUseCase(
    {
      name: "inventory.record-stock-take",
      permission: "inventory.stock-take.record",
      requiredFields: ["branchId", "countedAt"]
    },
    options
  );
