import { runWithEvents } from "../shared/transactional-events.js";
import { randomUUID } from "node:crypto";
import type { ApplicationEvent, CoreError, CoreResult } from "@orix/core";
import { err, ok } from "@orix/core";
import type {
  CatalogItem,
  CatalogItemKind,
  CatalogWrite,
  ProductArchiveRequest,
  ProductCatalog,
  ProductDetail,
  ProductListQuery,
  ProductPage,
  ProductWrite
} from "@orix/repositories";
import { applicationError } from "../shared/errors.js";
import type { ApplicationServiceContext } from "../shared/service-context.js";

export type ProductFormInput = {
  readonly id?: string;
  readonly storeId: string;
  readonly branchId: string;
  readonly businessDayId: string;
  readonly userId: string;
  readonly name: string;
  readonly barcode?: string | null;
  readonly categoryId: string;
  readonly brandId?: string | null;
  readonly unitId: string;
  readonly purchasePriceMinor: number;
  readonly salePriceMinor: number;
  readonly openingStock: number;
  readonly minimumStock: number;
  readonly description?: string | null;
  readonly active: boolean;
  readonly confirmSaleBelowPurchase?: boolean;
  readonly expectedUpdatedAt?: string | null;
};

export type ProductMutationOutput = {
  readonly product: ProductDetail;
};

export type ProductArchiveInput = ProductArchiveRequest & {
  readonly storeId: string;
};

export type CatalogMutationInput = CatalogWrite & {
  readonly id?: string;
  readonly kind: CatalogItemKind;
};

export type CatalogMutationOutput = {
  readonly item: CatalogItem;
};

const validationError = (message: string, fields?: readonly string[]): CoreError =>
  applicationError(
    "APPLICATION_VALIDATION_FAILED",
    message,
    fields === undefined ? undefined : { fields }
  );

const operationError = (message: string): CoreError =>
  applicationError("APPLICATION_OPERATION_FAILED", message);

export class ProductManagementApplicationService {
  public constructor(private readonly context: ApplicationServiceContext) {}

  public listProducts(query: ProductListQuery): CoreResult<ProductPage> {
    return this.context.repositories.productManagement.listProducts(query);
  }

  public getProduct(id: string): CoreResult<ProductDetail | undefined> {
    return this.context.repositories.productManagement.getProduct(id);
  }

  public getCatalog(storeId: string, includeArchived = false): CoreResult<ProductCatalog> {
    return this.context.repositories.productManagement.getCatalog(storeId, includeArchived);
  }

  public async createProduct(input: ProductFormInput): Promise<CoreResult<ProductMutationOutput>> {
    const validation = this.validateProduct(input);
    if (!validation.ok) {
      return validation;
    }

    const uniqueness = this.validateProductUniqueness(input);
    if (!uniqueness.ok) {
      return uniqueness;
    }

    const productId = randomUUID();
    const events: ApplicationEvent[] = [];
    const timestamp = new Date().toISOString();
    const write = this.toProductWrite(input, timestamp, productId);
    const result = await runWithEvents(
      this.context,
      events,
      { name: "products.create", metadata: { actorId: input.userId } },
      () => {
        const created = this.context.repositories.productManagement.createProduct(write);
        if (!created.ok) {
          return Promise.resolve(created);
        }
        const openingStock = this.context.repositories.productManagement.createOpeningStock(
          productId,
          write,
          input.openingStock,
          input.branchId,
          input.businessDayId
        );
        if (!openingStock.ok) {
          return Promise.resolve(openingStock);
        }
        events.push(
          this.event("ProductCreated", productId, input.storeId, input.userId, timestamp)
        );
        return Promise.resolve(ok({ product: created.value }));
      }
    );

    return result;
  }

  public async updateProduct(
    input: ProductFormInput & { readonly id: string }
  ): Promise<CoreResult<ProductMutationOutput>> {
    const validation = this.validateProduct(input);
    if (!validation.ok) {
      return validation;
    }

    const uniqueness = this.validateProductUniqueness(input);
    if (!uniqueness.ok) {
      return uniqueness;
    }

    const events: ApplicationEvent[] = [];
    const timestamp = new Date().toISOString();
    const result = await runWithEvents(
      this.context,
      events,
      { name: "products.update", metadata: { actorId: input.userId } },
      () => {
        const baseUpdate = {
          ...this.toProductWrite(input, timestamp, input.id),
          id: input.id
        };
        const updated = this.context.repositories.productManagement.updateProduct(
          input.expectedUpdatedAt === undefined
            ? baseUpdate
            : { ...baseUpdate, expectedUpdatedAt: input.expectedUpdatedAt }
        );
        if (!updated.ok) {
          return Promise.resolve(updated);
        }
        events.push(this.event("ProductUpdated", input.id, input.storeId, input.userId, timestamp));
        return Promise.resolve(ok({ product: updated.value }));
      }
    );

    return result;
  }

  public async archiveProduct(input: ProductArchiveInput): Promise<CoreResult<void>> {
    const referenced = this.context.repositories.productManagement.productHasCompletedReferences(
      input.id
    );
    if (!referenced.ok) {
      return referenced;
    }
    if (referenced.value) {
      return err(operationError("This product is used by completed sales or received purchases."));
    }

    const timestamp = input.timestamp;
    const events = [
      this.event("ProductArchived", input.id, input.storeId, input.userId, timestamp)
    ];
    const result = await runWithEvents(
      this.context,
      events,
      { name: "products.archive", metadata: { actorId: input.userId } },
      () => Promise.resolve(this.context.repositories.productManagement.archiveProduct(input))
    );
    return result;
  }

  public async restoreProduct(input: ProductArchiveInput): Promise<CoreResult<void>> {
    const timestamp = input.timestamp;
    const events = [
      this.event("ProductRestored", input.id, input.storeId, input.userId, timestamp)
    ];
    const result = await runWithEvents(
      this.context,
      events,
      { name: "products.restore", metadata: { actorId: input.userId } },
      () => Promise.resolve(this.context.repositories.productManagement.restoreProduct(input))
    );
    return result;
  }

  public async createCatalogItem(
    input: CatalogMutationInput
  ): Promise<CoreResult<CatalogMutationOutput>> {
    const validation = this.validateCatalog(input);
    if (!validation.ok) {
      return validation;
    }

    const events: ApplicationEvent[] = [];
    const result = await runWithEvents(
      this.context,
      events,
      { name: `products.${input.kind}.create`, metadata: { actorId: input.userId } },
      () => {
        const item = this.context.repositories.productManagement.createCatalogItem(
          input.kind,
          input
        );
        if (!item.ok) {
          return Promise.resolve(item);
        }
        events.push(
          this.event(
            "ProductCatalogItemCreated",
            item.value.id,
            input.storeId,
            input.userId,
            input.timestamp
          )
        );
        return Promise.resolve(ok({ item: item.value }));
      }
    );
    return result;
  }

  public async updateCatalogItem(
    input: CatalogMutationInput & { readonly id: string }
  ): Promise<CoreResult<CatalogMutationOutput>> {
    const validation = this.validateCatalog(input);
    if (!validation.ok) {
      return validation;
    }

    const events: ApplicationEvent[] = [];
    const result = await runWithEvents(
      this.context,
      events,
      { name: `products.${input.kind}.update`, metadata: { actorId: input.userId } },
      () => {
        const item = this.context.repositories.productManagement.updateCatalogItem(
          input.kind,
          input.id,
          input
        );
        if (!item.ok) {
          return Promise.resolve(item);
        }
        events.push(
          this.event(
            "ProductCatalogItemUpdated",
            input.id,
            input.storeId,
            input.userId,
            input.timestamp
          )
        );
        return Promise.resolve(ok({ item: item.value }));
      }
    );
    return result;
  }

  public async archiveCatalogItem(
    input: CatalogMutationInput & { readonly id: string }
  ): Promise<CoreResult<void>> {
    const events = [
      this.event(
        "ProductCatalogItemArchived",
        input.id,
        input.storeId,
        input.userId,
        input.timestamp
      )
    ];
    const result = await runWithEvents(
      this.context,
      events,
      { name: `products.${input.kind}.archive`, metadata: { actorId: input.userId } },
      () =>
        Promise.resolve(
          this.context.repositories.productManagement.archiveCatalogItem(
            input.kind,
            input.id,
            input.timestamp,
            input.userId
          )
        )
    );
    return result;
  }

  public async restoreCatalogItem(
    input: CatalogMutationInput & { readonly id: string }
  ): Promise<CoreResult<void>> {
    const events = [
      this.event(
        "ProductCatalogItemRestored",
        input.id,
        input.storeId,
        input.userId,
        input.timestamp
      )
    ];
    const result = await runWithEvents(
      this.context,
      events,
      { name: `products.${input.kind}.restore`, metadata: { actorId: input.userId } },
      () =>
        Promise.resolve(
          this.context.repositories.productManagement.restoreCatalogItem(
            input.kind,
            input.id,
            input.timestamp,
            input.userId
          )
        )
    );
    return result;
  }

  private validateProduct(input: ProductFormInput): CoreResult<void> {
    const fields = [
      { field: "name", value: input.name },
      { field: "storeId", value: input.storeId },
      { field: "branchId", value: input.branchId },
      { field: "businessDayId", value: input.businessDayId },
      { field: "categoryId", value: input.categoryId },
      { field: "unitId", value: input.unitId },
      { field: "userId", value: input.userId }
    ];
    const missing = fields.filter((entry) => entry.value.trim() === "").map((entry) => entry.field);
    if (missing.length > 0) {
      return err(validationError("Required product fields are missing.", missing));
    }
    if (
      input.purchasePriceMinor < 0 ||
      input.salePriceMinor < 0 ||
      input.minimumStock < 0 ||
      input.openingStock < 0
    ) {
      return err(validationError("Prices and quantities must be zero or greater."));
    }
    if (
      input.salePriceMinor < input.purchasePriceMinor &&
      input.confirmSaleBelowPurchase !== true
    ) {
      return err(
        validationError("Sale price is below purchase price. Confirm to continue.", [
          "salePriceMinor"
        ])
      );
    }
    return ok(undefined);
  }

  private validateProductUniqueness(input: ProductFormInput): CoreResult<void> {
    const name = this.context.repositories.productManagement.productNameExists(
      input.storeId,
      input.name,
      input.id
    );
    if (!name.ok) {
      return name;
    }
    if (name.value) {
      return err(
        validationError("A product with this name already exists in this store.", ["name"])
      );
    }
    if (input.barcode !== undefined && input.barcode !== null && input.barcode.trim() !== "") {
      const barcode = this.context.repositories.productManagement.barcodeExists(
        input.storeId,
        input.barcode,
        input.id
      );
      if (!barcode.ok) {
        return barcode;
      }
      if (barcode.value) {
        return err(
          validationError("This barcode is already assigned to another product.", ["barcode"])
        );
      }
    }
    return ok(undefined);
  }

  private validateCatalog(input: CatalogMutationInput): CoreResult<void> {
    if (input.name.trim() === "") {
      return err(validationError("Catalog name is required.", ["name"]));
    }
    if (
      input.kind === "unit" &&
      (input.abbreviation === undefined || input.abbreviation.trim() === "")
    ) {
      return err(validationError("Unit abbreviation is required.", ["abbreviation"]));
    }
    return ok(undefined);
  }

  private toProductWrite(input: ProductFormInput, timestamp: string, id: string): ProductWrite {
    return {
      id,
      storeId: input.storeId,
      categoryId: input.categoryId,
      brandId: input.brandId ?? null,
      unitId: input.unitId,
      name: input.name.trim(),
      barcode:
        input.barcode === undefined || input.barcode === null || input.barcode.trim() === ""
          ? null
          : input.barcode.trim(),
      description:
        input.description === undefined ||
        input.description === null ||
        input.description.trim() === ""
          ? null
          : input.description.trim(),
      purchasePriceMinor: input.purchasePriceMinor,
      salePriceMinor: input.salePriceMinor,
      minimumStock: input.minimumStock,
      active: input.active,
      userId: input.userId,
      timestamp
    };
  }

  private event(
    name: string,
    entityId: string,
    storeId: string,
    actorId: string,
    occurredAt: string
  ): ApplicationEvent {
    return {
      id: randomUUID(),
      name,
      version: 1,
      occurredAt,
      kind: "domain",
      payload: { entityId },
      metadata: { storeId, actorId }
    };
  }
}
