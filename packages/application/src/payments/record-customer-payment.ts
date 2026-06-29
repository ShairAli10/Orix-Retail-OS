import type { ApplicationService } from "../shared/application-service.js";
import { requirePositiveNumber } from "../shared/validation.js";
import type {
  RepositoryApplicationOperation,
  UseCaseFactoryOptions
} from "../shared/use-case-factory.js";
import { createRepositoryUseCase } from "../shared/use-case-factory.js";

export type RecordCustomerPaymentInput = Record<string, unknown> & {
  readonly customerId: string;
  readonly branchId: string;
  readonly cashAccountId: string;
  readonly paymentMethodId: string;
  readonly amountMinor: number;
};

export type RecordCustomerPaymentOutput = {
  readonly paymentId: string;
};

export type RecordCustomerPaymentOperation = RepositoryApplicationOperation<
  RecordCustomerPaymentInput,
  RecordCustomerPaymentOutput
>;

export const createRecordCustomerPaymentUseCase = (
  options: UseCaseFactoryOptions<RecordCustomerPaymentInput, RecordCustomerPaymentOutput>
): ApplicationService<RecordCustomerPaymentInput, RecordCustomerPaymentOutput> =>
  createRepositoryUseCase(
    {
      name: "payments.record-customer-payment",
      permission: "payments.customer.record",
      requiredFields: ["customerId", "branchId", "cashAccountId", "paymentMethodId"],
      validators: [requirePositiveNumber<RecordCustomerPaymentInput>("amountMinor")]
    },
    options
  );
