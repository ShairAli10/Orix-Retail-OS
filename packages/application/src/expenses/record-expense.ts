import type { ApplicationService } from "../shared/application-service.js";
import { requirePositiveNumber } from "../shared/validation.js";
import type {
  RepositoryApplicationOperation,
  UseCaseFactoryOptions
} from "../shared/use-case-factory.js";
import { createRepositoryUseCase } from "../shared/use-case-factory.js";

export type RecordExpenseInput = Record<string, unknown> & {
  readonly branchId: string;
  readonly expenseCategoryId: string;
  readonly cashAccountId: string;
  readonly amountMinor: number;
  readonly description: string;
};

export type RecordExpenseOutput = {
  readonly expenseId: string;
};

export type RecordExpenseOperation = RepositoryApplicationOperation<
  RecordExpenseInput,
  RecordExpenseOutput
>;

export const createRecordExpenseUseCase = (
  options: UseCaseFactoryOptions<RecordExpenseInput, RecordExpenseOutput>
): ApplicationService<RecordExpenseInput, RecordExpenseOutput> =>
  createRepositoryUseCase(
    {
      name: "expenses.record-expense",
      permission: "expenses.record",
      requiredFields: ["branchId", "expenseCategoryId", "cashAccountId", "description"],
      validators: [requirePositiveNumber<RecordExpenseInput>("amountMinor")]
    },
    options
  );
