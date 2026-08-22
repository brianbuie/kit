import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Fetcher } from './fetcher.ts';

describe('Fetcher', () => {
  const statusApi = new Fetcher({ base: 'https://mock.httpstatus.io' });

  const response = (status: number): Response => new Response(null, { status });

  it('Makes URL', () => {
    const route = '/example/route';
    const [url] = statusApi.buildUrl(route);
    assert(url.href.includes(route));
  });

  it('Throws when URL is invalid', () => {
    try {
      const empty = new Fetcher();
      empty.buildUrl('/');
    } catch (e) {
      return;
    }
    throw new Error('Ignored invalid URL');
  });

  it('Identifies the correct domain', () => {
    const test = new Fetcher({ base: 'https://subdomain.example.org' });
    const [_, domain] = test.buildUrl('');
    assert(domain === 'example.org');
  });

  it('Handles query parameters', () => {
    const [url] = statusApi.buildUrl('/', { query: { key: 'value' } });
    assert(url.href.includes('?key=value'));
  });

  it('Handles undefined query params', () => {
    const [url] = statusApi.buildUrl('/', { query: { key: undefined } });
    assert(!url.href.includes('key'));
  });

  it('Merges query parameters', () => {
    const [url] = statusApi.buildUrl('/?existing=1', { query: { added: 2 } });
    assert(url.href.includes('existing=1&added=2'));
  });

  it('Overrides route query parameters when provided as options', () => {
    const [url] = statusApi.buildUrl('/param=1', { query: { param: 2 } });
    assert(url.search === '?param=2');
  });

  it('Allows overriding the base with new options', () => {
    const [url] = statusApi.buildUrl('/test', { base: 'https://www.google.com' });
    assert(url.href.includes('google.com'));
  });

  it('Keeps falsey query params', () => {
    const [url] = statusApi.buildUrl('/', { query: { zero: 0, false: false, null: null } });
    assert(url.href.includes('zero=0'));
    assert(url.href.includes('false=false'));
    assert(url.href.includes('null=null'));
  });

  it('Handles no query params', () => {
    const route = '/';
    const [url] = statusApi.buildUrl(route);
    assert(url.href === statusApi.defaultOptions.base + route);
  });

  it('Handles array query param', () => {
    const [url] = statusApi.buildUrl('/', { query: { multiple: [1, 2] } });
    assert(url.href.includes('multiple=1'));
    assert(url.href.includes('multiple=2'));
  });

  it('Throws on bad request', async () => {
    const requests: Request[] = [];
    const api = new Fetcher({
      base: 'https://example.org',
      retries: 1,
      retryDelay: 25,
      transport: async request => {
        requests.push(request);
        return response(404);
      },
      delay: async milliseconds => {
        assert(milliseconds === 25);
      },
    });
    try {
      await api.fetch('/404');
    } catch (e) {
      assert(requests.length === 2);
      return;
    }
    throw new Error('Ignored bad request');
  });
});
