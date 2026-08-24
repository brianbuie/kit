export class Env {
  static get processEnv(): NodeJS.ProcessEnv | undefined {
    if (typeof process !== 'undefined') {
      return process.env;
    }
  }

  /**
   * get a variable from process.env, if it exists
   * @param key
   * The key to retrieve
   */
  static get(key: keyof NodeJS.ProcessEnv) {
    return (this.processEnv || {})[key];
  }

  /**
   * get a variable from process.env, throws if undefined
   * @param key
   * The key to retrieve
   */
  static need(key: keyof NodeJS.ProcessEnv) {
    const value = this.get(key);
    if (value === undefined) throw new Error(`key "${key}" not found in environment`);
    return value;
  }

  // TODO: vite & browser alternatives
  static get isProd(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  /**
   * Returns true if called in Google Cloud Run (Job or Service)
   * @see https://cloud.google.com/run/docs/container-contract#env-vars
   */
  static get isGcloud(): boolean {
    return this.get('K_SERVICE') !== undefined || this.get('CLOUD_RUN_JOB') !== undefined;
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
