# WikiLink Race

> Navigue de page en page sur Wikipedia le plus rapidement possible !

---

## Table des matières

- [Comment jouer](#comment-jouer)
- [Modes de jeu](#modes-de-jeu)
  - [Entrainement](#entrainement)
  - [Défi du jour](#défi-du-jour)
  - [Multijoueur](#multijoueur)
- [Système de score](#système-de-score)
- [Compte et profil](#compte-et-profil)
- [Partage Discord](#partage-discord)
- [Documentation technique](#documentation-technique)
  - [Stack technologique](#stack-technologique)
  - [Architecture du projet](#architecture-du-projet)
  - [Fonctionnement du jeu](#fonctionnement-du-jeu)
  - [Multijoueur temps réel](#multijoueur-temps-réel)
  - [Défi du jour (technique)](#défi-du-jour-technique)
  - [Authentification](#authentification)
  - [Base de données Firestore](#base-de-données-firestore)
  - [Installation et lancement](#installation-et-lancement)

---

## Comment jouer

WikiLink Race est basé sur le concept des [Six degrés de séparation](https://fr.wikipedia.org/wiki/Six_degr%C3%A9s_de_s%C3%A9paration) appliqué à Wikipedia.

**Le principe :**

1. Le jeu te donne une **page de départ** et une **page cible** sur Wikipedia
2. Tu dois atteindre la page cible **en cliquant uniquement sur les liens bleus** des articles Wikipedia
3. Le but est d'y arriver en un **minimum de clics** et le plus **rapidement possible**

**Exemple :**
`Départ : Chat → Cible : NASA`
Tu peux cliquer sur "Mammifère" → "Sciences naturelles" → "Astronomie" → "NASA"... ou trouver un chemin plus court !

**Règles :**
- Seuls les liens internes Wikipedia (liens bleus vers d'autres articles) sont cliquables
- Les liens vers des fichiers, des catégories ou des pages spéciales sont désactivés
- Revenir en arrière est possible mais chaque clic compte

---

## Modes de jeu

### Entrainement

Le mode solo classique pour jouer à tout moment.

- Les pages de départ et d'arrivée sont sélectionnées **aléatoirement** parmi des articles populaires de Wikipedia
- Les résultats sont enregistrés dans le **classement global**
- Idéal pour s'améliorer et battre ses propres records

### Défi du jour

Un défi commun à tous les joueurs, renouvelé chaque jour à minuit (UTC).

- **Tout le monde joue le même défi** le même jour
- Le défi est généré automatiquement chaque nuit
- Ta progression est **sauvegardée automatiquement** à chaque clic : tu peux quitter et reprendre plus tard
- Complète le défi du jour pour maintenir ta **streak journalière**
- Un compte à rebours indique le temps restant avant le prochain défi

### Multijoueur

Affronte d'autres joueurs en temps réel dans un salon privé.

**Rejoindre ou créer un salon :**
- Crée un salon et partage le **code à 6 caractères** (ex : `AB12CD`) à tes amis
- Ou entre le code d'un salon existant pour le rejoindre

**Configuration du salon (pour le créateur) :**

| Option | Description |
|--------|-------------|
| **Nombre de manches** | Joue en best-of-1, 2, 3, etc. |
| **Mode de fin de manche** | `Premier arrivé` : la manche s'arrête dès que quelqu'un atteint la cible · `Temps limité` : chaque joueur a 30s, 45s ou 1min par tour |
| **Sélection des articles** | `Aléatoire` : choix automatique · `Semi-aléatoire` : 3 options proposées au créateur · `Manuel` : le créateur choisit lui-même les pages |
| **Thème** | Filtre les articles par thématique |
| **Nombre de joueurs max** | Limite la taille du salon |

**Déroulement d'une partie :**
1. Tous les joueurs voient la progression de chacun en temps réel
2. Les scores sont calculés à la fin de chaque manche
3. Un **récapitulatif final** affiche le classement après toutes les manches

---

## Système de score

Le score est calculé ainsi :

```
Score = (nombre de clics × 10) + (temps en secondes)
```

**Le score le plus bas gagne.**

Les clics sont pondérés 10x par rapport au temps pour récompenser les chemins courts plutôt que la rapidité pure. Le temps sert de départage à nombre de clics égal.

---

## Compte et profil

**Sans compte :** tu peux jouer librement, tes scores sont sauvegardés localement dans ton navigateur.

**Avec un compte (Google ou anonyme avec pseudo) :**
- Scores synchronisés et accessibles depuis n'importe quel appareil
- Accès au classement global et à ton historique de parties
- Système de **streaks journalières** (nombre de jours consécutifs avec le défi du jour complété)
- **Code ami** unique (6 caractères) pour retrouver et ajouter des amis
- Page profil avec statistiques détaillées : parties jouées, score moyen, meilleur score, mode favori...

---

## Partage Discord

Après avoir complété le **défi du jour**, un bouton **"Partager sur Discord"** permet d'envoyer automatiquement le résultat dans un channel Discord privé via un webhook.

**Ce qui est envoyé :**
- Nom du joueur, pages de départ et cible
- Nombre de clics et temps formaté
- Lien vers le leaderboard

**Configuration :**

1. Crée un webhook dans les paramètres de ton channel Discord (*Paramètres du salon → Intégrations → Webhooks*)
2. Ajoute l'URL dans `.env.local` :
   ```env
   VITE_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/XXXX/YYYY
   ```
3. *(Optionnel)* Restreins l'accès au bouton à certains comptes Firebase :
   ```env
   VITE_DISCORD_ALLOWED_UIDS=uid1,uid2
   ```
   Si cette variable est absente ou vide, tous les joueurs connectés voient le bouton.
   Pour trouver ton UID : connecte-toi sur l'app et consulte Firebase Console → Authentication.

> Si `VITE_DISCORD_WEBHOOK_URL` est absent, le bouton n'apparaît pas du tout.

---

## Documentation technique

### Stack technologique

| Couche | Technologie |
|--------|-------------|
| Framework frontend | React 19 + TypeScript 5.8 |
| Bundler | Vite 6 |
| Styles | Tailwind CSS (CDN) |
| Backend & BDD | Firebase (Firestore + Auth) |
| Temps réel | Firestore `onSnapshot` (WebSocket-like) |
| API Wikipedia | Wikipedia REST API v1 (FR) |
| Visualisation | React Force Graph 2D |
| Icônes | Lucide React |

### Architecture du projet

```
wikilink-race/
├── components/          # Composants React
│   ├── WikiViewer.tsx          # Affichage de l'article Wikipedia
│   ├── GameSidebar.tsx         # Barre latérale (stats, historique)
│   ├── Leaderboard.tsx         # Classement global / personnel
│   ├── ModeSelection.tsx       # Sélection du mode de jeu
│   ├── AuthModal.tsx           # Modale de connexion
│   ├── ProfilePage.tsx         # Page profil utilisateur
│   ├── FriendsModal.tsx        # Gestion des amis
│   ├── MultiplayerLobbyModal.tsx   # Création / rejoindre un salon
│   ├── LobbyWaitingRoom.tsx        # Salle d'attente multijoueur
│   ├── MultiplayerRoundEnd.tsx     # Fin de manche
│   ├── MultiplayerFinalRecap.tsx   # Récapitulatif final
│   ├── PathGraphVisualization.tsx  # Graphe du chemin parcouru
│   └── ShareDiscordButton.tsx      # Bouton de partage Discord (défi du jour)
│
├── services/            # Logique métier et appels API
│   ├── wikiService.ts          # Intégration Wikipedia API
│   ├── authService.ts          # Firebase Auth
│   ├── firestoreService.ts     # Opérations Firestore
│   ├── multiplayerService.ts   # Logique multijoueur
│   ├── leaderboardService.ts   # Classement (Firestore + localStorage)
│   ├── dailyChallengeService.ts# Défi du jour
│   ├── dailyProgressService.ts # Sauvegarde de progression
│   ├── dailyStreaksService.ts   # Streaks journalières
│   ├── statsService.ts         # Calcul des statistiques
│   ├── friendsService.ts       # Système d'amis
│   ├── discordWebhook.ts       # Envoi de résultats via webhook Discord
│   └── popularPages.ts         # Liste d'articles Wikipedia populaires
│
├── scripts/             # Scripts serveur
│   └── generateDailyChallenge.ts  # Générateur du défi du jour
│
├── App.tsx              # Composant racine
├── types.ts             # Types TypeScript
├── firebase.config.ts   # Initialisation Firebase
└── vite.config.ts       # Configuration Vite
```

### Fonctionnement du jeu

#### 1. Sélection des articles

Pour éviter des parties impossibles, les articles sont sélectionnés avec un algorithme hybride :

- **80% articles populaires** (liste curatée d'articles connus et bien fournis en liens)
- **20% articles vraiment aléatoires** (via l'endpoint `/page/random/summary` de Wikipedia)

Pour le défi du jour, la page cible est toujours un article populaire pour garantir qu'elle soit atteignable.

#### 2. Affichage et navigation

Le composant `WikiViewer` :
1. Récupère le HTML complet de l'article via l'API Wikipedia (`/page/html/{title}`)
2. L'injecte dans la page en filtrant les styles Wikipedia non désirés
3. Intercepte tous les clics sur des liens (`handleContainerClick`)
4. Extrait le titre de la page cible depuis le `href` (`./Titre` ou `/wiki/Titre`)
5. Ignore les liens non-articles (fichiers, catégories, ancres, pages spéciales)
6. Appelle `handleNavigate(title)` pour charger le nouvel article

#### 3. Détection de la victoire

À chaque navigation :
1. `fetchPageSummary()` récupère les métadonnées de la page et résout les redirections Wikipedia
2. `arePageTitlesEqual()` compare le titre résolu avec la page cible :
   - Normalisation : espaces → underscores, passage en minuscules
   - Gestion des pages d'homonymie (ex : `USB` et `USB (homonymie)` sont équivalentes)
3. Si correspondance → le statut du jeu passe à `WON`

#### 4. Calcul et enregistrement du score

```
score = clicks * 10 + timeSeconds
```

Les parties terminées sont sauvegardées dans Firestore (`games/{gameId}`) avec :
`startPage`, `targetPage`, `path`, `clicks`, `timeSeconds`, `score`, `mode`, `userId`, `completedAt`

### Multijoueur temps réel

Le multijoueur fonctionne sans WebSocket dédié grâce aux **listeners temps réel de Firestore** (`onSnapshot`).

**Structure d'un salon (collection `lobbies/{roomCode}`) :**
```typescript
{
  roomCode: string,        // Code à 6 caractères
  status: "WAITING" | "PLAYING" | "FINISHED",
  config: {
    rounds: number,
    endMode: "FIRST_FINISH" | "TURN_BASED_30S" | "TURN_BASED_45S" | "TURN_BASED_1M",
    challengeMode: "RANDOM" | "SEMI_RANDOM" | "MANUAL",
    maxPlayers: number
  },
  players: {
    [userId]: {
      displayName: string,
      status: "READY" | "PLAYING" | "FINISHED" | "ABANDONED",
      clicks: number,
      timeSeconds: number,
      currentPage: string,
      path: string[]
    }
  },
  currentRound: number,
  startPage: string,
  targetPage: string
}
```

**Flux d'une partie multijoueur :**
1. Le créateur configure et crée le salon
2. Les autres joueurs rejoignent via le code et passent en `READY`
3. Le créateur démarre → statut `PLAYING`, tous les joueurs chargent la même page de départ
4. Chaque clic appelle `multiplayerService.updatePlayerProgress()` → mise à jour Firestore (~100ms de latence)
5. Tous les abonnés (`onSnapshot`) reçoivent les mises à jour en temps réel
6. Quand un joueur atteint la cible → `finishPlayer()` → son statut passe à `FINISHED`
7. Fin de manche selon le mode configuré → affichage des scores de manche
8. Après toutes les manches → récapitulatif final avec classement global

### Défi du jour (technique)

Le défi du jour est pré-généré côté serveur et stocké dans Firestore.

**Génération automatique :**
```bash
npm run generate-daily
```
Ce script (`scripts/generateDailyChallenge.ts`) utilise le **Firebase Admin SDK** pour écrire le défi dans `daily_challenges/{YYYY-MM-DD}`.

**Pour une automatisation quotidienne :**
```bash
# Linux/macOS - crontab (minuit UTC)
0 0 * * * cd /chemin/vers/projet && npm run generate-daily

# Windows - Planificateur de tâches
# Créer une tâche déclenchée à 00:00 UTC
```

**Sauvegarde de progression :**
À chaque clic en mode défi du jour, la progression est sauvegardée dans `daily_progress/{userId}/{YYYY-MM-DD}`. Si le joueur quitte et revient, sa partie reprend exactement là où il l'avait laissée.

### Authentification

Trois modes d'authentification sont disponibles :

| Mode | Description | Stockage des scores |
|------|-------------|---------------------|
| **Google OAuth** | Connexion via compte Google | Firestore |
| **Anonyme** | Compte anonyme avec pseudo choisi | Firestore |
| **Invité** | Aucune connexion requise | localStorage uniquement |

**Migration automatique :** quand un joueur invité se connecte pour la première fois, `migrationService` transfère automatiquement tous ses scores localStorage vers Firestore.

**Profil utilisateur** créé automatiquement à la première connexion dans `users/{uid}` :
- `displayName`, `email`, `photoURL`
- `friendCode` : code unique à 6 caractères pour être retrouvé par d'autres joueurs
- `stats` : `totalGames`, `avgTime`, `bestTime`, `totalClicks`, `bestScore`

### Base de données Firestore

| Collection | Description |
|------------|-------------|
| `users/{uid}` | Profils et statistiques utilisateurs |
| `games/{gameId}` | Toutes les parties (terminées et abandonnées) |
| `daily_challenges/{YYYY-MM-DD}` | Défis du jour |
| `daily_progress/{userId}/{date}` | Progression en cours sur le défi du jour |
| `daily_streaks/{userId}` | Suivi des streaks journalières |
| `lobbies/{roomCode}` | État des salons multijoueur |
| `friend_requests/{userId}/...` | Demandes d'amis en attente |
| `friends/{userId}/...` | Liste des amis acceptés |

### Installation et lancement

#### Prérequis

- **Node.js** v16+
- Un projet **Firebase** avec :
  - Firestore activé
  - Authentication activé (providers : Google + Anonyme)

#### Installation

```bash
# Cloner le dépôt
git clone <repo-url>
cd wikilink-race

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Remplir .env.local avec les credentials Firebase de ton projet
```

**Variables d'environnement (`.env.local`) :**
```env
# Firebase client (requis)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Firebase Admin (optionnel — pour la génération du défi du jour)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Discord (optionnel — partage des résultats du défi du jour)
VITE_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/XXXX/YYYY
VITE_DISCORD_ALLOWED_UIDS=uid1,uid2   # optionnel : restreindre à certains comptes Firebase
```

#### Commandes disponibles

```bash
npm run dev             # Serveur de développement → http://localhost:3000
npm run build           # Build de production (output : dist/)
npm run preview         # Prévisualisation du build de production
npm run generate-daily  # Génère le défi du jour manuellement
```

#### Déploiement

Le projet est une application frontend statique (Vite), déployable sur n'importe quel hébergeur statique :
- **Vercel** : `vercel deploy`
- **Netlify** : drag & drop du dossier `dist/`
- **GitHub Pages** : via GitHub Actions

> Les credentials Firebase côté client sont sécurisés par les règles de sécurité Firestore (Firebase Security Rules), pas par l'obscurcissement.
