import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase.config';
import type { UserProfile } from '../types';

const DISCORD_CONFIG_REF = doc(db, 'config', 'discord');

export async function getDiscordAllowedUids(): Promise<string[]> {
  const snap = await getDoc(DISCORD_CONFIG_REF);
  if (!snap.exists()) return [];
  return snap.data()?.allowedUids ?? [];
}

export async function setDiscordAllowedUids(uids: string[]): Promise<void> {
  await setDoc(DISCORD_CONFIG_REF, { allowedUids: uids }, { merge: true });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function getAllUsers(): Promise<Array<{ uid: string; profile: UserProfile }>> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ uid: d.id, profile: d.data() as UserProfile }));
}
