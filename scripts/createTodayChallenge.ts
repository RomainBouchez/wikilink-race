/**
 * Script temporaire pour créer manuellement un challenge quotidien
 * À exécuter une seule fois pour déboguer
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDSjqcn61UXdMEKQ0ZAqZ2n1souDIzo1pk",
  authDomain: "wikilink-race.firebaseapp.com",
  projectId: "wikilink-race",
  storageBucket: "wikilink-race.firebasestorage.app",
  messagingSenderId: "126356447928",
  appId: "1:126356447928:web:5cffcd7b846b1396cdca4d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTodayChallenge() {
  const today = new Date().toISOString().split('T')[0];

  const challenge = {
    startPage: "France",
    targetPage: "Paris",
    active: true,
    startPageData: {
      title: "France",
      displaytitle: "France",
      description: "Pays d'Europe occidentale",
      extract: "La France, en forme longue depuis 1875 la République française, est un État souverain transcontinental..."
    },
    targetPageData: {
      title: "Paris",
      displaytitle: "Paris",
      description: "Capitale de la France",
      extract: "Paris est la capitale de la France..."
    }
  };

  const challengeRef = doc(db, 'daily_challenges', today);
  await setDoc(challengeRef, challenge);

  console.log(`Challenge créé pour ${today}:`, challenge);
  process.exit(0);
}

createTodayChallenge().catch(console.error);
