import * as dotenv from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { randomInt } from 'crypto';

// Charger les variables d'environnement
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

const API_BASE = 'https://fr.wikipedia.org/api/rest_v1';
const WIKI_API = 'https://fr.wikipedia.org/w/api.php';
const HEADERS = {
    'User-Agent': 'WikilinkRace/1.0 (romain@example.com)',
    'Accept': 'application/json'
};

// Configuration de difficulté
const MIN_PATH_LENGTH = 3;      // Minimum de clics requis (3 = on rejette les chemins de 1-2 clics)
const MAX_GENERATION_ATTEMPTS = 5;  // Tentatives max pour trouver un bon challenge

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

interface DailyChallenge {
    id: string;
    date: string;
    startPage: string;
    targetPage: string;
    startPageData: WikiPageSummary;
    targetPageData: WikiPageSummary;
    active: boolean;
}

// ============================================================================
// CATEGORIZED PAGES - Pour garantir des chemins plus longs entre catégories
// ============================================================================

interface CategoryPages {
    name: string;
    pages: string[];
}

const PAGE_CATEGORIES: CategoryPages[] = [
    {
        name: 'Sciences',
        pages: [
            'Photosynthèse', 'Mitochondrie', 'Tectonique_des_plaques', 'Trou_noir',
            'Théorie_de_la_relativité', 'Mécanique_quantique', 'ADN', 'Évolution_(biologie)',
            'Tableau_périodique_des_éléments', 'Nombre_premier'
        ]
    },
    {
        name: 'Histoire_Ancienne',
        pages: [
            'Guerre_du_Péloponnèse', 'Chute_de_Constantinople', 'Empire_mongol',
            'Civilisation_maya', 'Dynastie_Han', 'Empire_perse', 'Carthage',
            'Alexandre_le_Grand', 'Attila', 'Gengis_Khan'
        ]
    },
    {
        name: 'Géographie_Exotique',
        pages: [
            'Lac_Baïkal', 'Désert_d\'Atacama', 'Île_de_Pâques', 'Mongolie',
            'Bhoutan', 'Suriname', 'Kirghizistan', 'Patagonie',
            'Archipel_des_Kerguelen', 'Svalbard'
        ]
    },
    {
        name: 'Arts_Classiques',
        pages: [
            'Impressionnisme', 'Art_baroque', 'Architecture_gothique', 'Fresque',
            'Symphonie', 'Ballet', 'Tragédie_grecque', 'Haïku',
            'Calligraphie', 'Origami'
        ]
    },
    {
        name: 'Sports_Niche',
        pages: [
            'Curling', 'Biathlon', 'Escrime', 'Aviron_(sport)',
            'Water-polo', 'Handball', 'Badminton', 'Cricket',
            'Sumo', 'Pelote_basque'
        ]
    },
    {
        name: 'Philosophie_Religion',
        pages: [
            'Stoïcisme', 'Bouddhisme_zen', 'Taoïsme', 'Zoroastrisme',
            'Épicurisme', 'Confucianisme', 'Shintoïsme', 'Soufisme',
            'Existentialisme', 'Nihilisme'
        ]
    },
    {
        name: 'Technologie_Niche',
        pages: [
            'Machine_de_Turing', 'Cryptographie', 'Fibre_optique', 'Supraconductivité',
            'Nanotechnologie', 'Fusion_nucléaire', 'Calculateur_quantique',
            'Blockchain', 'CRISPR-Cas9', 'Télescope_spatial_James-Webb'
        ]
    },
    {
        name: 'Nature_Obscure',
        pages: [
            'Tardigrade', 'Axolotl', 'Ornithorynque', 'Nautile',
            'Blob_(physarum_polycephalum)', 'Champignon', 'Lichen', 'Plancton',
            'Corail', 'Séquoia_géant'
        ]
    }
];

// Pages de niche très peu connectées (pour le start - augmente la difficulté)
const NICHE_START_PAGES: string[] = [
    'Théorème_de_Gödel', 'Paradoxe_de_Fermi', 'Effet_Mpemba', 'Nombre_de_Graham',
    'Hypothèse_de_Riemann', 'Constante_de_Planck', 'Entropie_(thermodynamique)',
    'Principe_d\'incertitude', 'Chat_de_Schrödinger', 'Paradoxe_EPR',
    'Algorithme_de_Dijkstra', 'Problème_du_voyageur_de_commerce',
    'Bataille_de_Zama', 'Siège_de_Masada', 'Bataille_de_Teutobourg',
    'Lac_Vostok', 'Fosse_des_Mariannes', 'Mont_Erebus', 'Île_Bouvet',
    'Grotte_de_Lascaux', 'Stonehenge', 'Lignes_de_Nazca', 'Moaï'
];

// ============================================================================
// DATA FETCHING (Self-contained to ensure headers are used)
// ============================================================================

/**
 * Fetches a truly random page from French Wikipedia
 */
async function fetchRandomPage(): Promise<WikiPageSummary> {
    const response = await fetch(`${API_BASE}/page/random/summary`, { headers: HEADERS });
    if (!response.ok) {
        console.error(`Error fetching random page: ${response.status} ${response.statusText}`);
        throw new Error('Failed to fetch random page');
    }
    return response.json() as Promise<WikiPageSummary>;
}

/**
 * Fetches the summary of a specific page
 */
async function fetchPageSummary(title: string): Promise<WikiPageSummary> {
    const encodedTitle = encodeURIComponent(title);
    const response = await fetch(`${API_BASE}/page/summary/${encodedTitle}`, { headers: HEADERS });
    if (!response.ok) {
        console.error(`Error fetching page "${title}": ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch page summary for "${title}"`);
    }
    return response.json() as Promise<WikiPageSummary>;
}

/**
 * Sélectionne une catégorie aléatoire
 */
function getRandomCategory(): CategoryPages {
    const index = randomInt(0, PAGE_CATEGORIES.length);
    return PAGE_CATEGORIES[index];
}

/**
 * Sélectionne une catégorie différente de celle fournie
 */
function getDifferentCategory(excludeCategory: string): CategoryPages {
    const filtered = PAGE_CATEGORIES.filter(c => c.name !== excludeCategory);
    const index = randomInt(0, filtered.length);
    return filtered[index];
}

/**
 * Fetches a page from a specific category
 */
async function fetchPageFromCategory(category: CategoryPages): Promise<WikiPageSummary> {
    const index = randomInt(0, category.pages.length);
    const title = category.pages[index];

    try {
        return await fetchPageSummary(title);
    } catch (error) {
        console.warn(`Failed to fetch page "${title}" from category ${category.name}`);
        throw error;
    }
}

/**
 * Fetches a niche start page (very low connectivity = harder)
 */
async function fetchNicheStartPage(): Promise<WikiPageSummary> {
    const index = randomInt(0, NICHE_START_PAGES.length);
    const title = NICHE_START_PAGES[index];

    try {
        return await fetchPageSummary(title);
    } catch (error) {
        console.warn(`Failed to fetch niche page "${title}", falling back to category`);
        const category = getRandomCategory();
        return fetchPageFromCategory(category);
    }
}

/**
 * Start page selection: 40% niche (très difficile), 30% catégorie, 30% random
 * (Avant: 80% populaire, 20% random - trop facile)
 */
async function fetchStartPage(): Promise<{ page: WikiPageSummary; category: string | null }> {
    const random = Math.random();

    if (random < 0.4) {
        // 40% niche pages - très peu connectées
        console.log('  [Start] Using niche page (40%)');
        try {
            const page = await fetchNicheStartPage();
            return { page, category: null };
        } catch (error) {
            console.warn('Niche page fetch failed, falling back to random');
            const page = await fetchRandomPage();
            return { page, category: null };
        }
    } else if (random < 0.7) {
        // 30% category page
        console.log('  [Start] Using category page (30%)');
        const category = getRandomCategory();
        try {
            const page = await fetchPageFromCategory(category);
            return { page, category: category.name };
        } catch (error) {
            console.warn('Category page fetch failed, falling back to random');
            const page = await fetchRandomPage();
            return { page, category: null };
        }
    } else {
        // 30% truly random
        console.log('  [Start] Using random page (30%)');
        const page = await fetchRandomPage();
        return { page, category: null };
    }
}

/**
 * Target page selection: garantit une catégorie DIFFÉRENTE du start
 */
async function fetchTargetPage(excludeCategory: string | null): Promise<WikiPageSummary> {
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
        try {
            let category: CategoryPages;

            if (excludeCategory) {
                // Choisir une catégorie différente
                category = getDifferentCategory(excludeCategory);
                console.log(`  [Target] Using different category: ${category.name} (excluding ${excludeCategory})`);
            } else {
                // Pas de catégorie à exclure, en choisir une au hasard
                category = getRandomCategory();
                console.log(`  [Target] Using category: ${category.name}`);
            }

            return await fetchPageFromCategory(category);
        } catch (error) {
            console.warn(`Target fetch attempt ${i + 1} failed, retrying...`);
        }
    }

    console.error('All target page attempts failed, falling back to random');
    return fetchRandomPage();
}

// ============================================================================
// FAST DIFFICULTY VALIDATION (Bidirectional check - only 2-3 API calls)
// ============================================================================

/**
 * Récupère les liens sortants d'une page (links FROM this page)
 */
async function fetchOutgoingLinks(title: string): Promise<Set<string>> {
    const links = new Set<string>();
    let continueToken: string | undefined;

    do {
        const params = new URLSearchParams({
            action: 'query',
            titles: title,
            prop: 'links',
            pllimit: '500',
            plnamespace: '0',
            format: 'json',
            origin: '*'
        });

        if (continueToken) {
            params.append('plcontinue', continueToken);
        }

        const response = await fetch(`${WIKI_API}?${params}`, { headers: HEADERS });
        if (!response.ok) return links;

        const data = await response.json();
        const pages = data.query?.pages;

        if (pages) {
            const pageId = Object.keys(pages)[0];
            const pageLinks = pages[pageId]?.links || [];
            for (const link of pageLinks) {
                if (link.title) {
                    links.add(link.title.replace(/ /g, '_'));
                }
            }
        }

        continueToken = data.continue?.plcontinue;
    } while (continueToken);

    return links;
}

/**
 * Récupère les backlinks d'une page (links TO this page)
 */
async function fetchBacklinks(title: string): Promise<Set<string>> {
    const links = new Set<string>();
    let continueToken: string | undefined;

    do {
        const params = new URLSearchParams({
            action: 'query',
            list: 'backlinks',
            bltitle: title,
            bllimit: '500',
            blnamespace: '0',
            format: 'json',
            origin: '*'
        });

        if (continueToken) {
            params.append('blcontinue', continueToken);
        }

        const response = await fetch(`${WIKI_API}?${params}`, { headers: HEADERS });
        if (!response.ok) return links;

        const data = await response.json();
        const backlinks = data.query?.backlinks || [];

        for (const bl of backlinks) {
            if (bl.title) {
                links.add(bl.title.replace(/ /g, '_'));
            }
        }

        continueToken = data.continue?.blcontinue;
    } while (continueToken);

    return links;
}

/**
 * Vérifie rapidement si un chemin de 1 ou 2 clics existe
 * Utilise une approche bidirectionnelle : liens sortants de start + backlinks de target
 *
 * Retourne:
 * - 1 si target est directement accessible depuis start
 * - 2 si start et target partagent un lien commun (chemin de 2 clics)
 * - -1 si aucun chemin court trouvé (= difficile)
 */
async function checkShortPath(
    startTitle: string,
    targetTitle: string
): Promise<{ pathLength: number; method: string }> {
    console.log(`  [Check] Verifying path: "${startTitle}" → "${targetTitle}"`);

    const normalizedStart = startTitle.replace(/ /g, '_');
    const normalizedTarget = targetTitle.replace(/ /g, '_');

    if (normalizedStart === normalizedTarget) {
        return { pathLength: 0, method: 'same page' };
    }

    // Étape 1: Récupérer les liens sortants de start
    console.log(`  [Check] Fetching outgoing links from "${startTitle}"...`);
    const startLinks = await fetchOutgoingLinks(startTitle);
    console.log(`  [Check] Found ${startLinks.size} outgoing links`);

    // Vérifier si target est directement accessible (1 clic)
    if (startLinks.has(normalizedTarget)) {
        console.log(`  [Check] ✗ Direct link found! (1 click) → TOO EASY`);
        return { pathLength: 1, method: 'direct link' };
    }

    // Étape 2: Récupérer les backlinks de target
    console.log(`  [Check] Fetching backlinks to "${targetTitle}"...`);
    const targetBacklinks = await fetchBacklinks(targetTitle);
    console.log(`  [Check] Found ${targetBacklinks.size} backlinks`);

    // Vérifier s'il y a une intersection (2 clics)
    // start → X → target existe si X est dans startLinks ET dans targetBacklinks
    let commonLinks = 0;
    for (const link of startLinks) {
        if (targetBacklinks.has(link)) {
            commonLinks++;
            if (commonLinks === 1) {
                console.log(`  [Check] ✗ Common link found: "${link}" (2 clicks) → TOO EASY`);
            }
        }
    }

    if (commonLinks > 0) {
        console.log(`  [Check] Total common links: ${commonLinks}`);
        return { pathLength: 2, method: `${commonLinks} common link(s)` };
    }

    console.log(`  [Check] ✓ No short path found → VALID (3+ clicks)`);
    return { pathLength: -1, method: 'no short path' };
}

/**
 * Vérifie si un challenge a une difficulté suffisante
 * Un challenge est valide si le chemin le plus court est >= MIN_PATH_LENGTH
 */
async function validateChallengeDifficulty(
    startTitle: string,
    targetTitle: string
): Promise<{ isValid: boolean; pathLength: number }> {
    const result = await checkShortPath(startTitle, targetTitle);

    if (result.pathLength === -1) {
        // Pas de chemin court trouvé = au moins 3 clics
        console.log(`  [Validation] Path >= 3 clicks → VALID`);
        return { isValid: true, pathLength: 3 }; // On sait que c'est au moins 3
    }

    if (result.pathLength >= MIN_PATH_LENGTH) {
        console.log(`  [Validation] Path ${result.pathLength} >= ${MIN_PATH_LENGTH} → VALID`);
        return { isValid: true, pathLength: result.pathLength };
    }

    console.log(`  [Validation] Path ${result.pathLength} < ${MIN_PATH_LENGTH} → TOO EASY`);
    return { isValid: false, pathLength: result.pathLength };
}

// ============================================================================
// MAIN LOGIC
// ============================================================================

/**
 * Génère l'ID du challenge pour une date donnée (format YYYY-MM-DD)
 */
function generateChallengeId(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Initialise Firebase Admin
 */
function initializeFirebase() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    // Fallback to service account file if env vars are missing (legacy/server support)
    if (!projectId || !privateKey || !clientEmail) {
        const serviceAccountPath = '/var/www/wikilink-race/wikilink-race-firebase-adminsdk-fbsvc-2930913e92.json';
        try {
            const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
            initializeApp({ credential: cert(serviceAccount) });
            console.log('✓ Firebase Admin initialized via JSON file (Legacy Path)');
            return;
        } catch (e) {
            // Fall through
        }

        console.warn('⚠ Missing Firebase credentials in environment variables.');
        throw new Error(
            'Missing Firebase credentials. Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL in .env or provide valid json key file.'
        );
    }

    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
    initializeApp({
        credential: cert({
            projectId,
            privateKey: formattedPrivateKey,
            clientEmail,
        }),
    });
    console.log('✓ Firebase Admin initialized via Env Vars');
}

/**
 * Génère une paire start/target candidate
 */
async function generateCandidatePair(): Promise<{
    start: WikiPageSummary;
    target: WikiPageSummary;
    startCategory: string | null;
}> {
    const startResult = await fetchStartPage();
    const start = startResult.page;
    const startCategory = startResult.category;

    let target = await fetchTargetPage(startCategory);

    // S'assurer que start et target sont différents
    let retries = 0;
    while (start.title === target.title && retries < 3) {
        target = await fetchTargetPage(startCategory);
        retries++;
    }

    return { start, target, startCategory };
}

/**
 * Génère un nouveau challenge quotidien avec difficulté validée par BFS
 *
 * Stratégie de difficulté:
 * 1. Génère une paire start/target avec séparation de catégories
 * 2. Calcule le shortest path via BFS
 * 3. Si path < MIN_PATH_LENGTH, régénère jusqu'à MAX_GENERATION_ATTEMPTS
 * 4. Garde le meilleur challenge trouvé
 */
async function generateChallenge(dateId: string): Promise<DailyChallenge> {
    console.log(`Generating challenge for ${dateId}...`);
    console.log(`  Difficulty: HARD (BFS validated, min ${MIN_PATH_LENGTH} clicks)`);
    console.log(`  Max attempts: ${MAX_GENERATION_ATTEMPTS}\n`);

    let bestCandidate: { start: WikiPageSummary; target: WikiPageSummary; pathLength: number } | null = null;

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
        console.log(`  === Attempt ${attempt}/${MAX_GENERATION_ATTEMPTS} ===`);

        // Générer une paire candidate
        const { start, target, startCategory } = await generateCandidatePair();
        console.log(`  Start: "${start.title}" (category: ${startCategory || 'none/random'})`);
        console.log(`  Target: "${target.title}"`);

        // Valider la difficulté via BFS
        const validation = await validateChallengeDifficulty(start.title, target.title);

        if (validation.isValid) {
            console.log(`\n✓ Valid challenge found on attempt ${attempt}!`);

            const challenge: DailyChallenge = {
                id: dateId,
                date: dateId,
                startPage: start.title,
                targetPage: target.title,
                startPageData: start,
                targetPageData: target,
                active: true,
            };

            return challenge;
        }

        // Garder le meilleur candidat au cas où on n'en trouve pas de valide
        if (!bestCandidate || validation.pathLength > bestCandidate.pathLength) {
            bestCandidate = { start, target, pathLength: validation.pathLength };
        }

        console.log('');
    }

    // Si aucun candidat valide trouvé, utiliser le meilleur
    console.warn(`\n⚠ No valid challenge found after ${MAX_GENERATION_ATTEMPTS} attempts.`);
    console.warn(`  Using best candidate with path length: ${bestCandidate?.pathLength || 'unknown'}`);

    const fallback = bestCandidate || await generateCandidatePair();

    const challenge: DailyChallenge = {
        id: dateId,
        date: dateId,
        startPage: fallback.start.title,
        targetPage: fallback.target.title,
        startPageData: fallback.start,
        targetPageData: fallback.target,
        active: true,
    };

    console.log(`✓ Challenge generated (fallback mode)`);
    return challenge;
}

/**
 * Sauvegarde le challenge dans Firestore
 */
async function saveChallenge(challenge: DailyChallenge): Promise<void> {
    const db = getFirestore();
    const challengeRef = db.collection('daily_challenges').doc(challenge.id);

    await challengeRef.set(challenge);
    console.log(`✓ Challenge saved to Firestore: daily_challenges/${challenge.id}`);
}

/**
 * Vérifie si un challenge existe déjà pour une date donnée
 */
async function challengeExists(dateId: string): Promise<boolean> {
    const db = getFirestore();
    const challengeRef = db.collection('daily_challenges').doc(dateId);
    const doc = await challengeRef.get();
    return doc.exists;
}

/**
 * Mode test : teste le BFS sans Firebase
 * Usage: npx ts-node scripts/createTodayChallenge_fixed.ts --test
 * Ou avec pages spécifiques: npx ts-node scripts/createTodayChallenge_fixed.ts --test "Sumo" "France"
 */
async function testMode(startPage?: string, targetPage?: string) {
    console.log('=== MODE TEST (sans Firebase) ===\n');

    if (startPage && targetPage) {
        // Test avec des pages spécifiques
        console.log(`Testing specific path: "${startPage}" → "${targetPage}"\n`);
        const result = await checkShortPath(startPage, targetPage);
        console.log(`\n=== RESULT ===`);
        console.log(`Path length: ${result.pathLength === -1 ? '3+ clicks (no short path)' : result.pathLength + ' click(s)'}`);
        console.log(`Method: ${result.method}`);
    } else {
        // Test de génération complète
        console.log('Testing full challenge generation...\n');
        const testId = 'TEST-' + new Date().toISOString().split('T')[0];
        const challenge = await generateChallenge(testId);

        console.log(`\n=== GENERATED CHALLENGE ===`);
        console.log(`Start: ${challenge.startPage}`);
        console.log(`Target: ${challenge.targetPage}`);
        console.log(`\n(Challenge NOT saved - test mode)`);
    }
}

async function main() {
    const args = process.argv.slice(2);
    const isTestMode = args.includes('--test');

    if (isTestMode) {
        // Mode test sans Firebase
        const testArgs = args.filter(a => a !== '--test');
        const startPage = testArgs[0];
        const targetPage = testArgs[1];
        await testMode(startPage, targetPage);
        return;
    }

    console.log('=== Wikilink Race - Daily Challenge Generator (Self-Contained) ===');
    console.log(`Started at: ${new Date().toISOString()}\n`);

    try {
        initializeFirebase();

        // Générer l'ID pour aujourd'hui
        const today = new Date();
        const todayId = generateChallengeId(today);
        console.log(`Target date: ${todayId}\n`);

        const exists = await challengeExists(todayId);
        if (exists) {
            // Log but don't stop, to match user expectation of "generating daily"
            // Or if it already exists, checking if it's identical? No.
            console.log(`Challenge for ${todayId} already exists. Skipping.`);
        } else {
            const challenge = await generateChallenge(todayId);
            await saveChallenge(challenge);
        }

    } catch (error) {
        console.error('Error during generation:', error);
        process.exit(1);
    }
}

main();
