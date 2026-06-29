import type { IpcChannel, IpcRequest, IpcResponse } from "./contracts.js";

export type IpcHandler<TRequestPayload extends object, TSuccess, TError extends object> = (
  request: IpcRequest<TRequestPayload>
) => Promise<IpcResponse<TSuccess, TError>>;

export type IpcRegistration<TRequestPayload extends object, TSuccess, TError extends object> = {
  readonly channel: IpcChannel;
  readonly handler: IpcHandler<TRequestPayload, TSuccess, TError>;
};

export type IpcRegistrar = <TRequestPayload extends object, TSuccess, TError extends object>(
  registration: IpcRegistration<TRequestPayload, TSuccess, TError>
) => void;

export type RegisteredIpcChannel = {
  readonly channel: IpcChannel;
};

export const createIpcRegistry = () => {
  const registrations: RegisteredIpcChannel[] = [];

  const register: IpcRegistrar = (registration) => {
    registrations.push({
      channel: registration.channel
    });
  };

  return {
    register,
    list: (): readonly RegisteredIpcChannel[] => registrations
  };
};
