export class Env {
  static get processEnv(): NodeJS.ProcessEnv | undefined {
    if (typeof process !== 'undefined') {
      return process.env;
    }
  }

  /**
   * get a variable from process.env (if it exists)
   * @param key
   * The key to retrieve
   * @param required
   * If true, throws an error when not found
   */
  static var(key: string, required: true): string;
  static var(key: string, required?: boolean): string | undefined;
  static var(key: string, required = false): string | undefined {
    const value = (this.processEnv || {})[key];
    if (required && !value) throw new Error(`key ${key} not found in environment`);
    return value;
  }

  // TODO: vite
  static get isProd(): boolean {
    return this.var('NODE_ENV') === 'production';
  }

  /**
   * Returns true if called in Google Cloud Run (Job or Service)
   * @see https://cloud.google.com/run/docs/container-contract#env-vars
   */
  static get isGcloud(): boolean {
    return this.processEnv?.K_SERVICE !== undefined || this.processEnv?.CLOUD_RUN_JOB !== undefined;
  }

  static get isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  static get window(): (Window & typeof globalThis) | undefined {
    if (this.isBrowser) {
      return window;
    }
  }
}
