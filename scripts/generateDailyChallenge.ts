#!/usr/bin/env node
/**
 * Script de génération automatique des challenges quotidiens
 * À exécuter via cron à minuit pour générer le challenge du jour
 *
 * Usage: npm run generate-daily
 * Ou directement: tsx scripts/generateDailyChallenge.ts
 */

import * as dotenv from 'dotenv';
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fetchHybridPage, fetchGuaranteedPopularPage, type WikiPageSummary } from './wikiServiceNode.js';

// Charger les variables d'environnement
dotenv.config();

interface DailyChallenge {
  id: string;
  date: string;
  startPage: string;
  targetPage: string;
  startPageData: WikiPageSummary;
  targetPageData: WikiPageSummary;
  active: boolean;
}

/**
 * Initialise Firebase Admin avec les credentials depuis .env
 */
function initializeFirebase() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    throw new Error(
      'Missing Firebase credentials in .env file. Required: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL'
    );
  }

  // Gérer les échappements dans la clé privée
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  const serviceAccount: ServiceAccount = {
    projectId,
    privateKey: formattedPrivateKey,
    clientEmail,
  };

  initializeApp({
    credential: cert(serviceAccount),
  });

  console.log('✓ Firebase Admin initialized');
}

/**
 * Génère l'ID du challenge pour une date donnée (format YYYY-MM-DD)
 */
function generateChallengeId(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Génère un nouveau challenge quotidien
 */
async function generateChallenge(dateId: string): Promise<DailyChallenge> {
  console.log(`Generating challenge for ${dateId}...`);

  // Générer les pages start et target
  const [start, target] = await Promise.all([
    fetchHybridPage(),
    fetchGuaranteedPopularPage(),
  ]);

  console.log(`  Start page: ${start.title}`);
  console.log(`  Target page: ${target.title}`);

  // S'assurer que start et target sont différents
  let finalTarget = target;
  let retries = 0;
  const maxRetries = 5;

  while (start.title === finalTarget.title && retries < maxRetries) {
    console.warn(`  Start and target are the same, retrying... (${retries + 1}/${maxRetries})`);
    finalTarget = await fetchGuaranteedPopularPage();
    retries++;
  }

  if (start.title === finalTarget.title) {
    console.error('  Warning: Unable to generate different pages after retries');
  }

  const challenge: DailyChallenge = {
    id: dateId,
    date: dateId,
    startPage: start.title,
    targetPage: finalTarget.title,
    startPageData: start,
    targetPageData: finalTarget,
    active: true,
  };

  console.log(`✓ Challenge generated successfully`);
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
 * Main function
 */
async function main() {
  console.log('=== Daily Challenge Generator ===');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  try {
    // Initialiser Firebase
    initializeFirebase();

    // Générer l'ID pour aujourd'hui
    const today = new Date();
    const todayId = generateChallengeId(today);

    console.log(`Target date: ${todayId}\n`);

    // Vérifier si le challenge existe déjà
    const exists = await challengeExists(todayId);
    if (exists) {
      console.log(`⚠ Challenge for ${todayId} already exists, skipping generation`);
      console.log('Exiting gracefully.');
      process.exit(0);
    }

    // Générer et sauvegarder le challenge
    const challenge = await generateChallenge(todayId);
    await saveChallenge(challenge);

    console.log('\n=== Success! ===');
    console.log(`Challenge for ${todayId} has been created`);
    console.log(`Start: ${challenge.startPage} → Target: ${challenge.targetPage}`);

    process.exit(0);
  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error('Failed to generate daily challenge:');
    console.error(error);
    process.exit(1);
  }
}

// Exécuter le script
main();
