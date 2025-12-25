import { WikiPageSummary } from '../types';
import { getRandomPopularPage } from './popularPages';

const API_BASE = 'https://fr.wikipedia.org/api/rest_v1';

/**
 * Checks if a page is a disambiguation page (homonymie)
 * NOTE: Kept for potential future use, but no longer blocks game wins
 */
export const isDisambiguationPage = (page: WikiPageSummary): boolean => {
  // Check if title contains (homonymie) in French
  if (page.title.includes('(homonymie)')) {
    return true;
  }

  // Check if description mentions disambiguation
  if (page.description) {
    const lowerDesc = page.description.toLowerCase();
    if (lowerDesc.includes('page d\'homonymie') ||
        lowerDesc.includes('disambiguation page') ||
        lowerDesc.includes('wikimedia disambiguation')) {
      return true;
    }
  }

  return false;
};

/**
 * Extracts the base name of a page by removing disambiguation suffix
 * Examples:
 *   "USB (homonymie)" -> "USB"
 *   "Universal Serial Bus" -> "Universal Serial Bus"
 */
export const getBasePageName = (title: string): string => {
  return title.replace(/\s*\(homonymie\)\s*$/i, '').trim();
};

/**
 * Compares two page titles, accounting for redirects and disambiguation variants
 * Returns true if:
 * 1. Titles match exactly (after normalization)
 * 2. Both resolve to the same base name (e.g., "USB" vs "USB (homonymie)")
 *
 * Note: fetchPageSummary() already follows redirects, so canonical titles
 * are returned automatically by Wikipedia API
 */
export const arePageTitlesEqual = (title1: string, title2: string): boolean => {
  // Normalize: replace spaces with underscores and lowercase for comparison
  const normalized1 = title1.replace(/ /g, '_').toLowerCase();
  const normalized2 = title2.replace(/ /g, '_').toLowerCase();

  // Direct match after normalization
  if (normalized1 === normalized2) {
    return true;
  }

  // Check if both resolve to same base name (handles homonymies)
  const base1 = getBasePageName(title1).replace(/ /g, '_').toLowerCase();
  const base2 = getBasePageName(title2).replace(/ /g, '_').toLowerCase();

  return base1 === base2;
};

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
      // Retry on next iteration
    }
  }

  // Ultimate fallback: Use random page if all popular attempts fail
  console.error('All popular page attempts failed, falling back to random');
  return fetchRandomPage();
};