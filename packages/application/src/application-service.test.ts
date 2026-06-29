import type {
  ApplicationEvent,
  CoreError,
  CoreResult,
  EventPublisher,
  TransactionContext
} from "@orix/core";
import { err, ok } from "@orix/core";
import type { RepositoryFactory } from "@orix/repositories";
import { describe, expect, it } from "vitest";
import type { ApplicationTransactionRunner } from "./shared/transaction-runner.js";
import { createCompleteSaleUseCase } from "./sales/complete-sale.js";

type FakeRepositories = RepositoryFactory & {
  readonly sales: RepositoryFactory["sales"] & {
    findById(id: string): Promise<CoreResult<{ readonly id: string } | undefined>>;
  };
};

const applicationTestError = (message: string): CoreError => ({
  code: "APPLICATION_OPERATION_FAILED",
  message,
  severity: "error"
});

const createEvent = (name: string): ApplicationEvent => ({
  id: `${name}-id`,
  name,
  version: 1,
  occurredAt: "2026-06-28T00:00:00.000Z",
  kind: "domain",
  payload: {},
  metadata: {}
});

const createTransactionContext = (): TransactionContext => ({
  id: "tx-1",
  depth: 0,
  isolationLevel: "immediate",
  metadata: {}
});

class FakeTransactionRunner implements ApplicationTransactionRunner {
  public readonly calls: string[] = [];

  public async run<T>(
    _options: Parameters<ApplicationTransactionRunner["run"]>[0],
    scope: (transaction: TransactionContext) => Promise<CoreResult<T>>
  ): Promise<CoreResult<T>> {
    this.calls.push("begin");
    const result = await scope(createTransactionContext());
    this.calls.push(result.ok ? "commit" : "rollback");
    return result;
  }
}

class FakePublisher implements EventPublisher {
  public readonly calls: string[] = [];

  public publish(event: ApplicationEvent): Promise<CoreResult<void>> {
    this.calls.push(event.name);
    return Promise.resolve(ok(undefined));
  }
}

const createRepositories = (calls: string[]): FakeRepositories =>
  ({
    sales: {
      findById: (id: string) => {
        calls.push(`sales.findById:${id}`);
        return Promise.resolve(ok({ id }));
      }
    }
  }) as unknown as FakeRepositories;

describe("application service orchestration", () => {
  it("commits successful work and publishes collected events after commit", async () => {
    const calls: string[] = [];
    const transactionRunner = new FakeTransactionRunner();
    const publisher = new FakePublisher();
    const service = createCompleteSaleUseCase({
      actorId: "user-1",
      context: {
        repositories: createRepositories(calls),
        transactionRunner,
        eventPublisher: publisher
      },
      operation: async ({ input, repositories, events }) => {
        const sale = await repositories.sales.findById(input.saleId);
        if (!sale.ok || sale.value === undefined) {
          return err(applicationTestError("sale missing"));
        }

        calls.push("operation");
        events.collect(createEvent("SaleCompleted"));
        return ok({ saleId: sale.value.id });
      }
    });

    const result = await service.execute({ saleId: "sale-1" });

    expect(result).toEqual(ok({ saleId: "sale-1" }));
    expect(transactionRunner.calls).toEqual(["begin", "commit"]);
    expect(calls).toEqual(["sales.findById:sale-1", "operation"]);
    expect(publisher.calls).toEqual(["SaleCompleted"]);
  });

  it("rolls back failed operations and does not publish collected events", async () => {
    const transactionRunner = new FakeTransactionRunner();
    const publisher = new FakePublisher();
    const service = createCompleteSaleUseCase({
      actorId: "user-1",
      context: {
        repositories: createRepositories([]),
        transactionRunner,
        eventPublisher: publisher
      },
      operation: ({ events }) => {
        events.collect(createEvent("SaleCompleted"));
        return Promise.resolve(err(applicationTestError("operation failed")));
      }
    });

    const result = await service.execute({ saleId: "sale-1" });

    expect(result.ok).toBe(false);
    expect(transactionRunner.calls).toEqual(["begin", "rollback"]);
    expect(publisher.calls).toEqual([]);
  });

  it("stops before the transaction boundary on validation failure", async () => {
    const transactionRunner = new FakeTransactionRunner();
    const publisher = new FakePublisher();
    const service = createCompleteSaleUseCase({
      actorId: "user-1",
      context: {
        repositories: createRepositories([]),
        transactionRunner,
        eventPublisher: publisher
      },
      operation: () => Promise.resolve(ok({ saleId: "sale-1" }))
    });

    const result = await service.execute({ saleId: "" });

    expect(result.ok).toBe(false);
    expect(transactionRunner.calls).toEqual([]);
    expect(publisher.calls).toEqual([]);
  });

  it("stops before the transaction boundary on authorization failure", async () => {
    const transactionRunner = new FakeTransactionRunner();
    const publisher = new FakePublisher();
    const service = createCompleteSaleUseCase({
      actorId: "user-1",
      context: {
        repositories: createRepositories([]),
        transactionRunner,
        eventPublisher: publisher
      },
      authorizationPolicy: {
        authorize: () => Promise.resolve(err(applicationTestError("denied")))
      },
      operation: () => Promise.resolve(ok({ saleId: "sale-1" }))
    });

    const result = await service.execute({ saleId: "sale-1" });

    expect(result.ok).toBe(false);
    expect(transactionRunner.calls).toEqual([]);
    expect(publisher.calls).toEqual([]);
  });
});
