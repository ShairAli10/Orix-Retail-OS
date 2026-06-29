export interface Clock {
  now(): Date;

  nowUtcIso(): string;

  businessDate(timeZone: string): string;
}
