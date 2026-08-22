import { merge } from 'lodash-es';
import extractDomain from 'extract-domain';

export type Route = string | URL;

type QueryVal = string | number | boolean | null | undefined;
export type Query = Record<string, QueryVal | QueryVal[]>;

export type FetchTransport = (request: Request) => Promise<Response>;
export type FetchDelay = (milliseconds: number) => Promise<void>;

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

/**
 * Fetcher provides a quick way to set up a basic API connection
 * with options applied to every request.
 * Includes basic methods for requesting and parsing responses
 */
export class Fetcher {
  defaultOptions: FetchOptions;

  constructor(opts: FetchOptions = {}) {
    this.defaultOptions = {
      timeout: 60000,
      retries: 0,
      retryDelay: 3000,
      transport: fetch,
      delay: milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
      ...opts,
    };
  }

  /**
   * Build URL with URLSearchParams if query is provided.
   * Also returns domain, to help with cookies.
   * Query params are merged in this order, last instance of key wins:
   * 1. defaultOptions.query
   * 2. route URLSearchParams
   * 3. options.query
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
   * Merges options to get headers. Useful when extending the Fetcher class to add custom auth.
   */
  buildHeaders = (route: Route, opts: FetchOptions = {}): HeadersInit & Record<string, string> => {
    const { headers } = merge({}, this.defaultOptions, opts);
    return headers || {};
  };

  /**
   * Builds request, merging defaultOptions and provided options.
   * Includes Abort signal for timeout
   */
  buildRequest = (route: Route, opts: FetchOptions = {}): [Request, FetchOptions, string] => {
    const mergedOptions = merge({}, this.defaultOptions, opts);
    const { query, data, timeout, retries, retryDelay, transport, delay, ...init } = mergedOptions;
    init.headers = this.buildHeaders(route, mergedOptions);
    if (data) {
      init.headers['content-type'] = init.headers['content-type'] || 'application/json';
      init.method = init.method || 'POST';
      init.body = JSON.stringify(data);
    }
    if (timeout) {
      init.signal = AbortSignal.timeout(timeout);
    }
    const [url, domain] = this.buildUrl(route, mergedOptions);
    const req = new Request(url, init);
    return [req, mergedOptions, domain];
  };

  /**
   * Builds and performs the request, merging provided options with defaultOptions.
   * If `opts.data` is provided, method is updated to POST, content-type json, data is stringified in the body.
   * Retries on local or network error, with increasing backoff.
   */
  fetch = async (route: Route, opts: FetchOptions = {}): Promise<[Response, Request]> => {
    const [_req, options] = this.buildRequest(route, opts);
    const maxAttempts = (options.retries || 0) + 1;
    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt++;
      const [req] = this.buildRequest(route, opts);
      const res = await options.transport!(req)
        .then(r => {
          if (!r.ok) throw new Error(r.statusText);
          return r;
        })
        .catch(async error => {
          if (attempt < maxAttempts) {
            const wait = attempt * (options.retryDelay || 0);
            console.warn(`${req.method} ${req.url} (attempt ${attempt} of ${maxAttempts})`, error);
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
