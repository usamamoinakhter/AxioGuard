import { AxiosError } from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

interface AxioguardErrorOptions<T = unknown, D = unknown> {
  code?: string;
  request?: unknown;
  response?: AxiosResponse<T, D>;
  cause?: unknown;
}

export class AxioguardError<T = unknown, D = unknown> extends AxiosError<T, D> {
  public readonly originalError?: unknown;

  constructor(
    message: string,
    config?: AxiosRequestConfig<D>,
    options: AxioguardErrorOptions<T, D> = {}
  ) {
    super(message, options.code, config, options.request, options.response);
    this.name = 'AxioguardError';
    this.originalError = options.cause;
    if (options.cause && typeof options.cause === 'object') {
      (this as Error).cause = options.cause as Error;
    }
  }
}
