import type { CoreResult } from "./result.js";

export type SortDirection = "asc" | "desc";

export type SortOrder<T> = {
  readonly field: keyof T;
  readonly direction: SortDirection;
};

export type PageRequest<T> = {
  readonly page: number;
  readonly pageSize: number;
  readonly sort?: readonly SortOrder<T>[];
};

export type Page<T> = {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
};

export interface Specification<T> {
  readonly name: string;
  isSatisfiedBy(candidate: T): boolean;
}

export interface ReadRepository<T, TId = string> {
  findById(id: TId): Promise<CoreResult<T | undefined>>;

  findOne(specification: Specification<T>): Promise<CoreResult<T | undefined>>;

  findMany(specification?: Specification<T>): Promise<CoreResult<readonly T[]>>;

  exists(specification: Specification<T>): Promise<CoreResult<boolean>>;
}

export interface WriteRepository<T, TId = string> {
  add(entity: T): Promise<CoreResult<T>>;

  update(entity: T): Promise<CoreResult<T>>;

  remove(id: TId): Promise<CoreResult<void>>;
}

export interface PagedRepository<T> {
  findPage(request: PageRequest<T>, specification?: Specification<T>): Promise<CoreResult<Page<T>>>;
}

export interface Repository<T, TId = string>
  extends ReadRepository<T, TId>, WriteRepository<T, TId>, PagedRepository<T> {}
