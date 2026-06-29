import type { Page, PageRequest } from "@orix/core";

export const normalizePageRequest = <T>(request?: Partial<PageRequest<T>>): PageRequest<T> => {
  const pageRequest = {
    page: Math.max(1, request?.page ?? 1),
    pageSize: Math.min(500, Math.max(1, request?.pageSize ?? 50))
  };

  return request?.sort === undefined ? pageRequest : { ...pageRequest, sort: request.sort };
};

export const offsetForPage = <T>(request: PageRequest<T>): number =>
  (request.page - 1) * request.pageSize;

export const createPage = <T>(
  items: readonly T[],
  request: PageRequest<T>,
  totalItems: number
): Page<T> => ({
  items,
  page: request.page,
  pageSize: request.pageSize,
  totalItems,
  totalPages: Math.ceil(totalItems / request.pageSize)
});
