import { merge, pick } from 'lodash-es';
import extractDomain from 'extract-domain';
import { Log } from './log.ts';
import { timeout } from './timeout.ts';

export type Route = string | URL;

type QueryVal = string | number | boolean | null | undefined;
export type Query = Record<string, QueryVal | QueryVal[]>;

export type FetchHeaders = Record<string, string | undefined>;

export type FetchTransport = (request: Request) => Promise<Response>;
export type FetchDelay = (ms: number) => Promise<void>;

export type FetchOptions = RequestInit & {
  base?: string;
  query?: Query;
  headers?: Record<string, string>;
  data?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  transport?: FetchTransport;
  delay?: FetchDelay;
};

function pickRequestInit(opts: FetchOptions) {
  return pick(opts, [
    'body',
    'cache',
    'credentials',
    'dispatcher',
    'duplex',
    'headers',
    'integrity',
    'keepalive',
    'method',
    'mode',
    'redirect',
    'referrer',
    'referrerPolicy',
    'signal',
    'window',
  ]);
}

/**
 * Fetcher provides a quick way to set up a basic API connection
 * with options applied to every request.
 * Includes basic methods for requesting and parsing responses
 */
export class Fetcher {
  defaultOptions: FetchOptions;

  constructor(baseOrOpts: string | FetchOptions = {}, opts: FetchOptions = {}) {
    this.defaultOptions = {
      timeout: 60000,
      retries: 0,
      retryDelay: 3000,
      transport: fetch,
      delay: timeout,
      ...(typeof baseOrOpts === 'string' ? { base: baseOrOpts } : baseOrOpts),
      ...opts,
    };
  }

  /**
   * Build URL with URLSearchParams if query is provided.
   * Query params are merged in this order, last instance of key wins:
   * 1. defaultOptions.query
   * 2. route URLSearchParams
   * 3. options.query
   * @returns [url, domain]
   */
  buildUrl = (route: Route, opts: FetchOptions = {}): [URL, string] => {
    const routeUrl = route instanceof URL ? route : new URL(route, opts.base || this.defaultOptions.base);
    const routeQuery = Object.fromEntries(routeUrl.searchParams);
    const mergedOptions = merge({}, this.defaultOptions, { query: routeQuery }, opts);
    const params: [string, string][] = [];
    Object.entries(mergedOptions.query || {}).forEach(([key, val]) => {
      if (val === undefined) return;
      if (Array.isArray(val)) {
        val.forEach(v => {
          params.push([key, `${v}`]);
        });
      } else {
        params.push([key, `${val}`]);
      }
    });
    const search = params.length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const url = new URL(route + search, mergedOptions.base);
    const domain = extractDomain(url.href) as string;
    return [url, domain];
  };

  /**
   * Merge options to build the headers for the request.
   * This method exists primarily for overriding after extending the class.
   * You can create this method on the child class and it'll be used in the normal fetch method.
   */
  buildHeaders = async (route: Route, opts: FetchOptions = {}): Promise<FetchHeaders> => {
    const merged = merge({}, this.defaultOptions, opts);
    return merged.headers || {};
  };

  /**
   * Builds request, merging defaultOptions and provided options.
   * Includes Abort signal for timeout
   */
  buildRequest = async (route: Route, opts: FetchOptions = {}): Promise<[Request, FetchOptions, string]> => {
    const merged = merge({}, this.defaultOptions, opts);
    const init = pickRequestInit(merged);
    init.headers = (await this.buildHeaders(route, merged)) as Record<string, string>;
    if (merged.data) {
      init.headers['content-type'] = init.headers['content-type'] || 'application/json';
      init.method = init.method || 'POST';
      init.body = JSON.stringify(merged.data);
    }
    if (merged.timeout) {
      init.signal = AbortSignal.timeout(merged.timeout);
    }
    const [url, domain] = this.buildUrl(route, merged);
    const req = new Request(url, init);
    return [req, merged, domain];
  };

  /**
   * Builds and performs the request, merging provided options with defaultOptions.
   * If `opts.data` is provided, method is updated to POST, content-type json, data is stringified in the body.
   * Retries on local or network error, with increasing backoff.
   */
  fetch = async (route: Route, opts: FetchOptions = {}): Promise<[Response, Request]> => {
    const [_req, options] = await this.buildRequest(route, opts);
    const maxAttempts = (options.retries || 0) + 1;
    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt++;
      const [req] = await this.buildRequest(route, opts);
      const res = await options.transport!(req)
        .then(r => {
          if (!r.ok) throw new Error(r.statusText);
          return r;
        })
        .catch(async error => {
          if (attempt < maxAttempts) {
            const wait = attempt * (options.retryDelay || 0);
            Log.warn(`${req.method} ${req.url} (attempt ${attempt} of ${maxAttempts})`, error);
            await options.delay!(wait);
          } else {
            throw new Error(error);
          }
        });
      if (res) return [res, req];
    }
    throw new Error(`Failed to fetch ${_req.url}`);
  };

  fetchText = async (route: Route, opts: FetchOptions = {}): Promise<[string, Response, Request]> => {
    return this.fetch(route, opts).then(async ([res, req]) => {
      const text = await res.text();
      return [text, res, req];
    });
  };

  fetchJson = async <T>(route: Route, opts: FetchOptions = {}): Promise<[T, Response, Request]> => {
    return this.fetchText(route, opts).then(([txt, res, req]) => [JSON.parse(txt) as T, res, req]);
  };
}
