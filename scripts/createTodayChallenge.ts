/**
 * Script autonome pour créer le challenge quotidien via Admin SDK
 * Version optimisée pour Raspberry Pi avec génération aléatoire
 * Ignore les règles de sécurité Firestore
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';
import { randomInt } from 'crypto';

// ============================================================================
// CONFIGURATION
// ============================================================================

const serviceAccountPath = join('/var/www/wikilink-race', 'wikilink-race-firebase-adminsdk-fbsvc-2930913e92.json');
const API_BASE = 'https://fr.wikipedia.org/api/rest_v1';

// ============================================================================
// TYPES
// ============================================================================

interface WikiPageSummary {
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

// ============================================================================
// PAGES POPULAIRES (liste complète intégrée)
// ============================================================================

const POPULAR_PAGES: string[] = [
  // Personnages historiques
  'Albert_Einstein', 'Léonard_de_Vinci', 'Napoléon_Ier', 'Cléopâtre', 'Jules_César',
  'Abraham_Lincoln', 'George_Washington', 'Winston_Churchill', 'Mohandas_Karamchand_Gandhi', 'Nelson_Mandela',
  'Martin_Luther_King', 'Marie_Curie', 'Isaac_Newton', 'Charles_Darwin', 'William_Shakespeare',
  'Jeanne_d\'Arc', 'Benjamin_Franklin', 'Thomas_Jefferson', 'Karl_Marx', 'Sigmund_Freud',
  'Socrate', 'Platon', 'Aristote', 'Confucius', 'Bouddha', 'Christophe_Colomb', 'Neil_Armstrong',

  // Géographie et lieux
  'Paris', 'Londres', 'New_York', 'Tokyo', 'Rome', 'Athènes', 'Le_Caire', 'Moscou',
  'Pékin', 'Sydney', 'Mumbai', 'Istanbul', 'Barcelone', 'Amsterdam', 'Vienne_(Autriche)',
  'Los_Angeles', 'Chicago', 'San_Francisco', 'Las_Vegas', 'Miami',
  'Mont_Everest', 'Amazone_(fleuve)', 'Nil', 'Sahara', 'Océan_Pacifique', 'Océan_Atlantique',
  'Tour_Eiffel', 'Statue_de_la_Liberté', 'Taj_Mahal', 'Colisée', 'Pyramides_d\'Égypte',
  'Machu_Picchu', 'Grande_Muraille', 'Grand_Canyon', 'Chutes_du_Niagara',

  // Sciences et technologie
  'Internet', 'Intelligence_artificielle', 'Ordinateur', 'Smartphone', 'Acide_désoxyribonucléique',
  'Système_solaire', 'Mars_(planète)', 'Lune', 'Soleil', 'Trou_noir', 'Big_Bang',
  'Mécanique_quantique', 'Relativité_générale', 'Photosynthèse', 'Atome',
  'Réchauffement_climatique', 'Énergie_renouvelable', 'Énergie_nucléaire',
  'Vaccin', 'Covid-19', 'Virus', 'Bitcoin', 'Blockchain', 'SpaceX',

  // Animaux et nature
  'Lion', 'Éléphant', 'Dauphin', 'Manchot', 'Tigre', 'Aigle', 'Requin', 'Baleine',
  'Chien', 'Chat', 'Cheval', 'Dinosaure', 'Panda_géant', 'Girafe', 'Gorille', 'Koala',
  'Ours', 'Loup', 'Serpent', 'Crocodile', 'Tortue', 'Abeille', 'Papillon',

  // Histoire et culture
  'Égypte_antique', 'Rome_antique', 'Grèce_antique', 'Renaissance',
  'Seconde_Guerre_mondiale', 'Première_Guerre_mondiale', 'Révolution_française',
  'Moyen_Âge', 'Empire_romain', 'Vikings', 'Samouraï', 'Pharaon',

  // Arts et divertissement
  'The_Beatles', 'Michael_Jackson', 'Elvis_Presley', 'Mozart', 'Ludwig_van_Beethoven',
  'La_Joconde', 'Vincent_van_Gogh', 'Pablo_Picasso', 'Hollywood', 'Cinéma',
  'Harry_Potter', 'Star_Wars', 'Le_Seigneur_des_anneaux', 'Batman', 'Superman',
  'Netflix', 'YouTube', 'Disney', 'Pixar',

  // Sports
  'Football', 'Basket-ball', 'Tennis', 'Jeux_olympiques', 'Coupe_du_monde_de_football',
  'Cristiano_Ronaldo', 'Lionel_Messi', 'Michael_Jordan', 'Usain_Bolt',
  'Baseball', 'Rugby', 'Golf', 'Natation', 'Boxe',

  // Pays et politique
  'États-Unis', 'France', 'Allemagne', 'Royaume-Uni', 'Chine', 'Japon', 'Inde',
  'Brésil', 'Australie', 'Canada', 'Italie', 'Espagne', 'Russie', 'Égypte', 'Mexique',
  'Organisation_des_Nations_unies', 'Union_européenne',

  // Philosophie et religion
  'Amour', 'Démocratie', 'Religion', 'Philosophie', 'Christianisme', 'Islam', 'Judaïsme',
  'Hindouisme', 'Bouddhisme', 'Dieu', 'Bible', 'Coran',

  // Concepts scientifiques
  'Mathématiques', 'Physique', 'Chimie', 'Biologie', 'Psychologie', 'Économie',
  'Temps', 'Espace_(cosmologie)', 'Matière', 'Énergie', 'Lumière',

  // Alimentation
  'Pizza', 'Chocolat', 'Café', 'Thé', 'Vin', 'Bière', 'Pain', 'Sushi',
  'Hamburger', 'Fromage', 'Pomme', 'Banane',

  // Technologie et inventions
  'Avion', 'Automobile', 'Téléphone', 'Télévision', 'Internet',
  'Machine_à_vapeur', 'Ampoule_électrique', 'Roue', 'Papier',
  'iPhone', 'Android', 'Google', 'Microsoft', 'Apple',

  // Musique
  'Musique', 'Jazz', 'Rock', 'Opéra', 'Guitare', 'Piano', 'Violon',

  // Littérature
  'Livre', 'Roman', 'Poésie', 'Homère', 'Shakespeare',
  'Don_Quichotte', 'Guerre_et_Paix',

  // Santé
  'Santé', 'Médecine', 'Cœur', 'Cerveau', 'Yoga', 'Nutrition',
];

// ============================================================================
// FONCTIONS WIKIPEDIA API
// ============================================================================

/**
 * Récupère une page aléatoire de Wikipedia
 */
async function fetchRandomPage(): Promise<WikiPageSummary> {
  const response = await fetch(`${API_BASE}/page/random/summary`);
  if (!response.ok) {
    throw new Error('Failed to fetch random page');
  }
  return response.json() as Promise<WikiPageSummary>;
}

/**
 * Récupère le résumé d'une page spécifique
 */
async function fetchPageSummary(title: string): Promise<WikiPageSummary> {
  const encodedTitle = encodeURIComponent(title);
  const response = await fetch(`${API_BASE}/page/summary/${encodedTitle}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch page summary for "${title}"`);
  }
  return response.json() as Promise<WikiPageSummary>;
}

/**
 * Récupère une page populaire aléatoire
 */
async function fetchPopularPage(): Promise<WikiPageSummary> {
  const index = randomInt(0, POPULAR_PAGES.length);
  const title = POPULAR_PAGES[index];

  try {
    return await fetchPageSummary(title);
  } catch (error) {
    console.warn(`Failed to fetch popular page "${title}", falling back to random`);
    return fetchRandomPage();
  }
}

/**
 * Sélection hybride: 80% populaire, 20% vraiment aléatoire
 */
async function fetchHybridPage(): Promise<WikiPageSummary> {
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
}

/**
 * Page populaire garantie (100% populaire)
 * Réessaie plusieurs fois avant de fallback sur aléatoire
 */
async function fetchGuaranteedPopularPage(): Promise<WikiPageSummary> {
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
}

// ============================================================================
// MAIN
// ============================================================================

async function createTodayChallenge() {
  console.log('=== Wikilink Race - Daily Challenge Generator ===');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  // Format YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  console.log(`Target date: ${today}\n`);

  try {
    // Initialisation Firebase Admin
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount)
    });
    const db = getFirestore();
    console.log('✓ Firebase Admin initi