import type { CoreResult } from "./result.js";

export type ConfigurationKey = string;

export interface ConfigurationProvider<TConfig extends object> {
  get<TKey extends keyof TConfig>(key: TKey): CoreResult<TConfig[TKey]>;

  getOptional<TKey extends keyof TConfig>(key: TKey): CoreResult<TConfig[TKey] | undefined>;

  getAll(): CoreResult<Readonly<TConfig>>;
}

export interface MutableConfigurationProvider<
  TConfig extends object
> extends ConfigurationProvider<TConfig> {
  set<TKey extends keyof TConfig>(key: TKey, value: TConfig[TKey]): Promise<CoreResult<void>>;
}
