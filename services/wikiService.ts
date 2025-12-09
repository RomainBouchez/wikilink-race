import { WikiPageSummary } from '../types';

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