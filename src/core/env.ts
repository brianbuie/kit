export class Env {
  static get processEnv() {
    if (typeof process !== 'undefined') {
      return process.env;
    }
  }

  static var(key: string) {
    return (this.processEnv || {})[key];
  }

  // TODO: vite
  static get isProd() {
    return this.var('NODE_ENV') === 'production';
  }

  /**
   * Returns true if called in Google Cloud Run (Job or Service)
   * @see https://cloud.google.com/run/docs/container-contract#env-vars
   */
  static get isGcloud() {
    return this.processEnv?.K_SERVICE !== undefined || this.processEnv?.CLOUD_RUN_JOB !== undefined;
  }

  static get isBrowser() {
    return typeof window !== 'undefined';
  }

  static get window() {
    if (this.isBrowser) {
      return window;
    }
  }
}
