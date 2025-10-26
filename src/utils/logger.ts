export type LogLevel = 'debug' | 'warn' | 'error';

export class Logger {
  constructor(private enabled = false) {}

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this.enabled) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log('[Axioguard]', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    if (!this.enabled) {
      return;
    }

    // eslint-disable-next-line no-console
    console.warn('[Axioguard]', message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    if (!this.enabled) {
      return;
    }

    // eslint-disable-next-line no-console
    console.error('[Axioguard]', message, ...args);
  }
}
