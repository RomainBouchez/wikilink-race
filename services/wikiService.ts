import { WikiPageSummary } from '../types';
import { getRandomPopularPage } from './popularPages';

const API_BASE = 'https://fr.wikipedia.org/api/rest_v1';

/**
 * Fetches a truly random page from French Wikipedia
 * Uses Wikipedia's random page feature
 */
export const fetchRandomPage = async (): Promise<WikiPageSummary> => {
  // Use Wikipedia's random page endpoint
  const response = await fetch(`${API_BASE}/page/random/summary`);
  if (!response.ok) {
    throw new Error('Failed to fetch random page');
  }
  return response.json();
};

/**
 * Get the category of a page title
 * Note: No longer used with truly random pages
 */
export const getPageCategory = (_pageTitle: string): string | null => {
  return null; // Categories not needed with truly random pages
};

/**
 * Fetches the HTML content of a page.
 */
export const fetchPageHtml = async (title: string): Promise<string> => {
  const encodedTitle = encodeURIComponent(title);
  const response = await fetch(`${API_BASE}/page/html/${encodedTitle}`);
  if (!response.ok) {
    throw new Error('Failed to fetch page HTML');
  }
  return response.text();
};

/**
 * Fetches the summary of a specific page (useful for metadata updates).
 */
export const fetchPageSummary = async (title: string): Promise<WikiPageSummary> => {
  const encodedTitle = encodeURIComponent(title);
  const response = await fetch(`${API_BASE}/page/summary/${encodedTitle}`);
  if (!response.ok) {
    throw new Error('Failed to fetch page summary');
  }
  return response.json();
};

/**
 * Fetches a popular page by title from French Wikipedia
 * Converts a popular page title to a WikiPageSummary
 */
export const fetchPopularPage = async (): Promise<WikiPageSummary> => {
  const title = getRandomPopularPage();

  try {
    return await fetchPageSummary(title);
  } catch (error) {
    // Fallback: If the popular page doesn't exist or fetch fails,
    // try with a truly random page
    console.warn(`Failed to fetch popular page "${title}", falling back to random`);
    return fetchRandomPage();
  }
};

/**
 * Hybrid page selection: 80% popular, 20% truly random
 * This provides variety while keeping most pages discoverable
 */
export const fetchHybridPage = async (): Promise<WikiPageSummary> => {
  const random = Math.random();

  if (random < 0.8) {
    // 80% chance: Use popular page
    try {
      return await fetchPopularPage();
    } catch (error) {
      // Fallback to random if popular page fetch fails
      console.warn('Popular page fetch failed, falling back to random');
      return fetchRandomPage();
    }
  } else {
    // 20% chance: Use truly random page
    return fetchRandomPage();
  }
};

/**
 * Guaranteed popular page (100% popular)
 * Used for target pages in daily challenges to ensure discoverability
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

  // Ultimate fallback: Use random page if all popular attempts fail
  console.error('All popular page attempts failed, falling back to random');
  return fetchRandomPage();
};