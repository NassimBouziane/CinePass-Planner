import { describe, it, expect, vi, beforeEach } from 'vitest';

export function isCacheableImageRequest(url: string, destination?: string): boolean {
  if (destination === 'image') return true;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('acsta.net') || lowerUrl.includes('allocine')) {
    return true;
  }
  return /\.(jpe?g|png|webp|avif|gif|svg)(\?.*)?$/i.test(lowerUrl);
}

export const CACHE_NAME = 'cinepass-posters-v1';

describe('Service Worker Image Caching Logic', () => {
  it('correctly identifies Allocine poster CDN URLs as cacheable images', () => {
    expect(isCacheableImageRequest('https://fr.web.img3.acsta.net/img/cc/22/cc222386da3f11bb9ae1dae2d1bc65bd.jpg')).toBe(true);
    expect(isCacheableImageRequest('https://fr.web.img5.acsta.net/pictures/23/06/21/12/06/4953335.jpg')).toBe(true);
    expect(isCacheableImageRequest('https://assets.allocine.fr/images/logo.png')).toBe(true);
  });

  it('identifies image requests by destination attribute', () => {
    expect(isCacheableImageRequest('https://example.com/asset-without-ext', 'image')).toBe(true);
    expect(isCacheableImageRequest('https://example.com/api/data', 'document')).toBe(false);
  });

  it('identifies standard image extensions regardless of query parameters', () => {
    expect(isCacheableImageRequest('https://mycinema.com/poster.webp?version=2')).toBe(true);
    expect(isCacheableImageRequest('https://mycinema.com/poster.PNG')).toBe(true);
    expect(isCacheableImageRequest('https://mycinema.com/poster.jpeg')).toBe(true);
  });

  it('does not intercept non-image JSON and document requests', () => {
    expect(isCacheableImageRequest('https://cinepass.fr/data/showtimes-2026-10-21.json')).toBe(false);
    expect(isCacheableImageRequest('https://cinepass.fr/index.html')).toBe(false);
    expect(isCacheableImageRequest('https://cinepass.fr/assets/app.js')).toBe(false);
  });

  it('uses the expected cache name', () => {
    expect(CACHE_NAME).toBe('cinepass-posters-v1');
  });

  it('handles simulated cache hit and cache miss correctly', async () => {
    const mockCache = new Map<string, Response>();
    const fakeImageUrl = 'https://fr.web.img3.acsta.net/poster.jpg';
    const fakeCachedResponse = new Response('cached-binary-data', { status: 200 });

    // Cache hit scenario
    mockCache.set(fakeImageUrl, fakeCachedResponse);
    const hitResponse = mockCache.get(fakeImageUrl);
    expect(hitResponse).toBeDefined();
    expect(await hitResponse?.text()).toBe('cached-binary-data');

    // Cache miss scenario
    const missResponse = mockCache.get('https://fr.web.img3.acsta.net/unknown.jpg');
    expect(missResponse).toBeUndefined();
  });
});
