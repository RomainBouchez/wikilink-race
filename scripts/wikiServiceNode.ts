/**
 * Version Node.js du wikiService
 * Adapté pour être utilisé dans des scripts backend sans dépendances browser
 */

import { getRandomPopularPage } from '../services/popularPages.js';

const API_BASE = 'https://fr.wikipedia.org/api/rest_v1';

export interface WikiPageSummary {
  title: string;
  displaytitle?: string;
  description?: string;
  extract?: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  content_urls?: {
    desktop: {
      page: string;
    };
  };
}

/**
 * Fetches a truly random page from French Wikipedia
 */
export const fetchRandomPage = async (): Promise<WikiPageSummary> => {
  const response = await fetch(`${API_BASE}/page/random/summary`);
  if (!response.ok) {
    throw new Error('Failed to fetch random page');
  }
  return response.json() as Promise<WikiPageSummary>;
};

/**
 * Fetches the summary of a specific page
 */
export const fetchPageSummary = async (title: string): Promise<WikiPageSummary> => {
  const encodedTitle = encodeURIComponent(title);
  const response = await fetch(`${API_BASE}/page/summary/${encodedTitle}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch page summary for "${title}"`);
  }
  return response.json() as Promise<WikiPageSummary>;
};

/**
 * Fetches a popular page by title from French Wikipedia
 */
export const fetchPopularPage = async (): Promise<WikiPageSummary> => {
  const title = getRandomPopularPage();

  try {
    return await fetchPageSummary(title);
  } catch (error) {
    console.warn(`Failed to fetch popular page "${title}", falling back to random`);
    return fetchRandomPage();
  }
};

/**
 * Hybrid page selection: 80% popular, 20% truly random
 */
export const fetchHybridPage = async (): Promise<WikiPageSummary> => {
  const random = Math.random();

  if (random < 0.8) {
    try {
      return await fetchPopularPage();
    } catch (error) {
      console.warn('Popular page fetch failed, falling back to random');
      return fetchRandomPage();
    }
  } else {
    return fetchRandomPage();
  }
};

/**
 * Guaranteed popular page (100% popular)
 * Retries multiple times before falling back to random
 */
export const fetchGuaranteedPopularPage = async (): Promise<WikiPageSummary> => {
  const maxRetries = 3;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchPopularPage();
    } catch (error) {
      console.warn(`Attempt ${i + 1} to fetch popular page failed`);
    }
  }

  console.error('All popular page attempts failed, falling back to random');
  return fetchRandomPage();
};
