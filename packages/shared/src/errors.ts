export type DomainErrorCode = string;

export type DomainErrorContext = Readonly<Record<string, unknown>>;

export type DomainErrorOptions = {
  readonly code: DomainErrorCode;
  readonly message: string;
  readonly context?: DomainErrorContext;
  readonly cause?: unknown;
};

export class DomainError extends Error {
  public readonly code: DomainErrorCode;
  public readonly context: DomainErrorContext;
  public override readonly cause?: unknown;

  public constructor(options: DomainErrorOptions) {
    super(options.message);
    this.name = "DomainError";
    this.code = options.code;
    this.context = options.context ?? {};

    if ("cause" in options) {
      this.cause = options.cause;
    }
  }
}
