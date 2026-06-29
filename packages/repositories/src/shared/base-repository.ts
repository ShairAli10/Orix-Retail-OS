import { and, eq, sql, type SQL } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { AnySQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import type { CoreResult, Page, PageRequest } from "@orix/core";
import { err, ok } from "@orix/core";
import { createPage, normalizePageRequest, offsetForPage } from "./pagination.js";
import { repositoryError } from "./repository-error.js";
import {
  archiveCondition,
  combineConditions,
  dateRangeCondition,
  documentSearchCondition,
  equalsIfPresent,
  orderByFor,
  textSearchCondition,
  type SortableColumns
} from "./query-helpers.js";
import type { AuditMetadata, OptimisticConcurrency, RepositoryFilter } from "./filters.js";

export type RepositoryTable = SQLiteTable & {
  readonly id: AnySQLiteColumn;
  readonly storeId?: AnySQLiteColumn;
  readonly branchId?: AnySQLiteColumn;
  readonly businessDayId?: AnySQLiteColumn;
  readonly status?: AnySQLiteColumn;
  readonly createdAt?: AnySQLiteColumn;
  readonly updatedAt?: AnySQLiteColumn;
  readonly archivedAt?: AnySQLiteColumn;
  readonly updatedByUserId?: AnySQLiteColumn;
  readonly syncVersion?: AnySQLiteColumn;
};

export type RepositoryTableRow<TTable extends SQLiteTable> = TTable["$inferSelect"];

export type RepositoryTableInsert<TTable extends SQLiteTable> = TTable["$inferInsert"];

export type BaseRepositoryOptions<TTable extends RepositoryTable> = {
  readonly db: BetterSQLite3Database;
  readonly table: TTable;
  readonly tableName: string;
  readonly searchableColumns?: readonly AnySQLiteColumn[];
  readonly documentNumberColumn?: AnySQLiteColumn;
  readonly dateColumn?: AnySQLiteColumn;
  readonly sortableColumns?: SortableColumns<RepositoryTableRow<TTable>>;
};

export class BaseRepository<TTable extends RepositoryTable> {
  protected readonly db: BetterSQLite3Database;
  protected readonly table: TTable;
  protected readonly tableName: string;
  private readonly searchableColumns: readonly AnySQLiteColumn[];
  private readonly documentNumberColumn: AnySQLiteColumn | undefined;
  private readonly dateColumn: AnySQLiteColumn | undefined;
  private readonly sortableColumns: SortableColumns<RepositoryTableRow<TTable>>;

  public constructor(options: BaseRepositoryOptions<TTable>) {
    this.db = options.db;
    this.table = options.table;
    this.tableName = options.tableName;
    this.searchableColumns = options.searchableColumns ?? [];
    this.documentNumberColumn = options.documentNumberColumn;
    this.dateColumn = options.dateColumn;
    this.sortableColumns = options.sortableColumns ?? {};
  }

  public create(
    entity: RepositoryTableInsert<TTable>
  ): Promise<CoreResult<RepositoryTableRow<TTable>>> {
    try {
      const row = this.db.insert(this.table).values(entity).returning().get();
      return Promise.resolve(ok(row as RepositoryTableRow<TTable>));
    } catch (cause) {
      return Promise.resolve(
        err(repositoryError("REPOSITORY_WRITE_FAILED", `Failed to create ${this.tableName}`, cause))
      );
    }
  }

  public bulkCreate(
    entities: readonly RepositoryTableInsert<TTable>[]
  ): Promise<CoreResult<readonly RepositoryTableRow<TTable>[]>> {
    try {
      if (entities.length === 0) {
        return Promise.resolve(ok([]));
      }

      const rows = this.db
        .insert(this.table)
        .values([...entities])
        .returning()
        .all();
      return Promise.resolve(ok(rows as readonly RepositoryTableRow<TTable>[]));
    } catch (cause) {
      return Promise.resolve(
        err(
          repositoryError(
            "REPOSITORY_WRITE_FAILED",
            `Failed to bulk create ${this.tableName}`,
            cause
          )
        )
      );
    }
  }

  public findById(id: string): Promise<CoreResult<RepositoryTableRow<TTable> | undefined>> {
    try {
      const row = this.db.select().from(this.table).where(eq(this.table.id, id)).get();
      return Promise.resolve(ok(row as RepositoryTableRow<TTable> | undefined));
    } catch (cause) {
      return Promise.resolve(
        err(
          repositoryError("REPOSITORY_READ_FAILED", `Failed to find ${this.tableName} by id`, cause)
        )
      );
    }
  }

  public findByDocumentNumber(
    documentNumber: string,
    filter: RepositoryFilter = {}
  ): Promise<CoreResult<RepositoryTableRow<TTable> | undefined>> {
    try {
      const condition = combineConditions([
        this.buildFilterCondition(filter),
        documentSearchCondition(this.documentNumberColumn, documentNumber)
      ]);
      const row = this.db.select().from(this.table).where(condition).get();
      return Promise.resolve(ok(row as RepositoryTableRow<TTable> | undefined));
    } catch (cause) {
      return Promise.resolve(
        err(
          repositoryError(
            "REPOSITORY_READ_FAILED",
            `Failed to find ${this.tableName} by document number`,
            cause
          )
        )
      );
    }
  }

  public findMany(
    filter: RepositoryFilter = {}
  ): Promise<CoreResult<readonly RepositoryTableRow<TTable>[]>> {
    try {
      const rows = this.db.select().from(this.table).where(this.buildFilterCondition(filter)).all();
      return Promise.resolve(ok(rows as readonly RepositoryTableRow<TTable>[]));
    } catch (cause) {
      return Promise.resolve(
        err(repositoryError("REPOSITORY_READ_FAILED", `Failed to query ${this.tableName}`, cause))
      );
    }
  }

  public findPage(
    request: Partial<PageRequest<RepositoryTableRow<TTable>>> = {},
    filter: RepositoryFilter = {}
  ): Promise<CoreResult<Page<RepositoryTableRow<TTable>>>> {
    try {
      const pageRequest = normalizePageRequest(request);
      const condition = this.buildFilterCondition(filter);
      const countRow = this.db
        .select({ count: sql<number>`count(*)` })
        .from(this.table)
        .where(condition)
        .get();
      const totalItems = countRow?.count ?? 0;
      const orderBy = orderByFor(pageRequest, this.sortableColumns);
      const query = this.db
        .select()
        .from(this.table)
        .where(condition)
        .limit(pageRequest.pageSize)
        .offset(offsetForPage(pageRequest));
      const rows = orderBy.length > 0 ? query.orderBy(...orderBy).all() : query.all();

      return Promise.resolve(
        ok(createPage(rows as readonly RepositoryTableRow<TTable>[], pageRequest, totalItems))
      );
    } catch (cause) {
      return Promise.resolve(
        err(repositoryError("REPOSITORY_READ_FAILED", `Failed to page ${this.tableName}`, cause))
      );
    }
  }

  public async update(
    id: string,
    patch: Partial<RepositoryTableInsert<TTable>>,
    concurrency: OptimisticConcurrency = {}
  ): Promise<CoreResult<RepositoryTableRow<TTable>>> {
    try {
      const condition = this.buildIdentityAndConcurrencyCondition(id, concurrency);
      const result = this.db.update(this.table).set(patch).where(condition).run();
      if (result.changes === 0) {
        return err(
          repositoryError(
            "REPOSITORY_CONFLICT",
            `Failed to update ${this.tableName}; record was not found or version changed`
          )
        );
      }

      const row = await this.findById(id);
      return row.ok && row.value !== undefined
        ? ok(row.value)
        : err(
            repositoryError("REPOSITORY_NOT_FOUND", `Failed to reload updated ${this.tableName}`)
          );
    } catch (cause) {
      return err(
        repositoryError("REPOSITORY_WRITE_FAILED", `Failed to update ${this.tableName}`, cause)
      );
    }
  }

  public async bulkUpdate(
    patches: readonly {
      readonly id: string;
      readonly patch: Partial<RepositoryTableInsert<TTable>>;
      readonly concurrency?: OptimisticConcurrency;
    }[]
  ): Promise<CoreResult<readonly RepositoryTableRow<TTable>[]>> {
    try {
      const rows: RepositoryTableRow<TTable>[] = [];
      for (const item of patches) {
        const result = await this.update(item.id, item.patch, item.concurrency);
        if (!result.ok) {
          return result;
        }
        rows.push(result.value);
      }

      return ok(rows);
    } catch (cause) {
      return err(
        repositoryError("REPOSITORY_WRITE_FAILED", `Failed to bulk update ${this.tableName}`, cause)
      );
    }
  }

  public async softDelete(
    id: string,
    metadata: AuditMetadata,
    concurrency: OptimisticConcurrency = {}
  ): Promise<CoreResult<RepositoryTableRow<TTable>>> {
    if (this.table.archivedAt === undefined) {
      return err(
        repositoryError("REPOSITORY_WRITE_FAILED", `${this.tableName} does not support soft delete`)
      );
    }

    return this.update(
      id,
      this.auditPatch({ archivedAt: metadata.timestamp }, metadata),
      concurrency
    );
  }

  public async restore(
    id: string,
    metadata: AuditMetadata,
    concurrency: OptimisticConcurrency = {}
  ): Promise<CoreResult<RepositoryTableRow<TTable>>> {
    if (this.table.archivedAt === undefined) {
      return err(
        repositoryError("REPOSITORY_WRITE_FAILED", `${this.tableName} does not support restore`)
      );
    }

    return this.update(id, this.auditPatch({ archivedAt: null }, metadata), concurrency);
  }

  public delete(id: string): Promise<CoreResult<void>> {
    try {
      this.db.delete(this.table).where(eq(this.table.id, id)).run();
      return Promise.resolve(ok(undefined));
    } catch (cause) {
      return Promise.resolve(
        err(
          repositoryError("REPOSITORY_DELETE_FAILED", `Failed to delete ${this.tableName}`, cause)
        )
      );
    }
  }

  public async search(
    search: string,
    request: Partial<PageRequest<RepositoryTableRow<TTable>>> = {},
    filter: RepositoryFilter = {}
  ): Promise<CoreResult<Page<RepositoryTableRow<TTable>>>> {
    return this.findPage(request, { ...filter, search });
  }

  public async findByStore(
    storeId: string,
    request: Partial<PageRequest<RepositoryTableRow<TTable>>> = {},
    filter: RepositoryFilter = {}
  ): Promise<CoreResult<Page<RepositoryTableRow<TTable>>>> {
    return this.findPage(request, { ...filter, storeId });
  }

  public async findByBranch(
    branchId: string,
    request: Partial<PageRequest<RepositoryTableRow<TTable>>> = {},
    filter: RepositoryFilter = {}
  ): Promise<CoreResult<Page<RepositoryTableRow<TTable>>>> {
    return this.findPage(request, { ...filter, branchId });
  }

  protected buildFilterCondition(filter: RepositoryFilter): SQL | undefined {
    return combineConditions([
      equalsIfPresent(this.table.storeId, filter.storeId),
      equalsIfPresent(this.table.branchId, filter.branchId),
      equalsIfPresent(this.table.businessDayId, filter.businessDayId),
      equalsIfPresent(this.table.status, filter.status),
      documentSearchCondition(this.documentNumberColumn, filter.documentNumber),
      dateRangeCondition(this.dateColumn, filter.dateRange),
      archiveCondition(this.table.archivedAt, filter.archived ?? "active"),
      textSearchCondition(this.searchableColumns, filter.search)
    ]);
  }

  private buildIdentityAndConcurrencyCondition(
    id: string,
    concurrency: OptimisticConcurrency
  ): SQL {
    const condition = and(
      eq(this.table.id, id),
      concurrency.expectedUpdatedAt !== undefined && this.table.updatedAt !== undefined
        ? eq(this.table.updatedAt, concurrency.expectedUpdatedAt)
        : undefined,
      concurrency.expectedSyncVersion !== undefined && this.table.syncVersion !== undefined
        ? eq(this.table.syncVersion, concurrency.expectedSyncVersion)
        : undefined
    );

    return condition ?? eq(this.table.id, id);
  }

  private auditPatch(
    patch: Record<string, string | null>,
    metadata: AuditMetadata
  ): Partial<RepositoryTableInsert<TTable>> {
    const next: Record<string, string | null> = { ...patch };
    if (this.table.updatedAt !== undefined) {
      next.updatedAt = metadata.timestamp;
    }
    if (metadata.userId !== undefined && this.table.updatedByUserId !== undefined) {
      next.updatedByUserId = metadata.userId;
    }

    return next;
  }
}
