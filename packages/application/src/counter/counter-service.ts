import { err, ok, type CoreResult } from "@orix/core";
import type { CounterActor, CounterExpense, CounterSession } from "@orix/repositories";
import type { ApplicationServiceContext } from "../shared/service-context.js";
export type CounterSummary = {
  readonly session: CounterSession | null;
  readonly expectedCashMinor: number;
  readonly expenses: readonly CounterExpense[];
};
const failure = (message: string) =>
  err({ code: "COUNTER_OPERATION_FAILED", message, severity: "error" as const });
export class CounterService {
  public constructor(private readonly context: ApplicationServiceContext) {}
  public summary(actor: CounterActor): CoreResult<CounterSummary> {
    const cash = this.context.repositories.sales.cashRegisterSummary(actor.businessDayId);
    if (!cash.ok) return cash;
    return ok({
      session: this.context.repositories.counter.session(actor.businessDayId) ?? null,
      expectedCashMinor: cash.value.expectedCashMinor,
      expenses: this.context.repositories.counter.expenses(actor.businessDayId)
    });
  }
  public open(actor: CounterActor, openingCashMinor: number): Promise<CoreResult<CounterSummary>> {
    return this.context.transactionRunner.run({ name: "counter.open" }, () => {
      if (!Number.isSafeInteger(openingCashMinor) || openingCashMinor < 0)
        return Promise.resolve(failure("Opening cash must be a non-negative money amount."));
      if (this.context.repositories.counter.session(actor.businessDayId))
        return Promise.resolve(failure("This business day already has a counter session."));
      this.context.repositories.counter.open(actor, openingCashMinor);
      return Promise.resolve(this.summary(actor));
    });
  }
  public close(
    actor: CounterActor,
    countedCashMinor: number,
    reason: string
  ): Promise<CoreResult<CounterSummary>> {
    return this.context.transactionRunner.run({ name: "counter.close" }, () => {
      const summary = this.summary(actor);
      if (!summary.ok) return Promise.resolve(summary);
      if (summary.value.session?.status !== "open")
        return Promise.resolve(failure("Open the counter first."));
      if (!Number.isSafeInteger(countedCashMinor) || countedCashMinor < 0)
        return Promise.resolve(failure("Counted cash must be a non-negative money amount."));
      if (countedCashMinor !== summary.value.expectedCashMinor && reason.trim().length < 3)
        return Promise.resolve(failure("Explain the cash difference before closing."));
      this.context.repositories.counter.close(
        actor,
        summary.value.session.id,
        summary.value.expectedCashMinor,
        countedCashMinor,
        reason.trim()
      );
      return Promise.resolve(this.summary(actor));
    });
  }
  public expense(
    actor: CounterActor,
    amountMinor: number,
    description: string,
    operationId: string
  ): Promise<CoreResult<CounterSummary>> {
    return this.context.transactionRunner.run({ name: "counter.expense" }, () => {
      if (
        !Number.isSafeInteger(amountMinor) ||
        amountMinor <= 0 ||
        description.trim().length < 3 ||
        !/^[-a-zA-Z0-9]{16,80}$/.test(operationId)
      )
        return Promise.resolve(failure("Enter a positive expense and a description."));
      const number = `EX-${operationId}`;
      const previous = this.context.repositories.counter.expenseByNumber(actor.storeId, number);
      if (previous)
        return Promise.resolve(
          previous.amountMinor === amountMinor && previous.description === description.trim()
            ? this.summary(actor)
            : failure("This expense was already recorded with different details.")
        );
      const summary = this.summary(actor);
      if (!summary.ok) return Promise.resolve(summary);
      if (summary.value.session?.status !== "open")
        return Promise.resolve(failure("Open the counter before recording expenses."));
      if (amountMinor > summary.value.expectedCashMinor)
        return Promise.resolve(failure("Expense exceeds the expected cash in the drawer."));
      this.context.repositories.counter.postExpense(actor, number, description.trim(), amountMinor);
      return Promise.resolve(this.summary(actor));
    });
  }
}
