import type { ApplicationService } from "../shared/application-service.js";
import { requirePositiveNumber } from "../shared/validation.js";
import type {
  RepositoryApplicationOperation,
  UseCaseFactoryOptions
} from "../shared/use-case-factory.js";
import { createRepositoryUseCase } from "../shared/use-case-factory.js";

export type RecordSupplierPaymentInput = Record<string, unknown> & {
  readonly supplierId: string;
  readonly branchId: string;
  readonly cashAccountId: string;
  readonly paymentMethodId: string;
  readonly amountMinor: number;
};

export type RecordSupplierPaymentOutput = {
  readonly paymentId: string;
};

export type RecordSupplierPaymentOperation = RepositoryApplicationOperation<
  RecordSupplierPaymentInput,
  RecordSupplierPaymentOutput
>;

export const createRecordSupplierPaymentUseCase = (
  options: UseCaseFactoryOptions<RecordSupplierPaymentInput, RecordSupplierPaymentOutput>
): ApplicationService<RecordSupplierPaymentInput, RecordSupplierPaymentOutput> =>
  createRepositoryUseCase(
    {
      name: "payments.record-supplier-payment",
      permission: "payments.supplier.record",
      requiredFields: ["supplierId", "branchId", "cashAccountId", "paymentMethodId"],
      validators: [requirePositiveNumber<RecordSupplierPaymentInput>("amountMinor")]
    },
    options
  );
