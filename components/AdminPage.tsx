import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Search } from 'lucide-react';
import { getDiscordAllowedUids, setDiscordAllowedUids, getAllUsers } from '../services/adminService';
import type { UserProfile } from '../types';

interface AdminPageProps {
  onClose: () => void;
}

interface UserRow {
  uid: string;
  profile: UserProfile;
  allowed: boolean;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onClose }) => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null); // uid en cours de save
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [allUsers, allowedUids] = await Promise.all([getAllUsers(), getDiscordAllowedUids()]);
      const allowedSet = new Set(allowedUids);
      setUsers(
        allUsers
          .map(({ uid, profile }) => ({ uid, profile, allowed: allowedSet.has(uid) }))
          .sort((a, b) => (a.profile.pseudo || '').localeCompare(b.profile.pseudo || ''))
      );
    } catch (err) {
      console.error('AdminPage load error:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (uid: string, checked: boolean) => {
    setSaving(uid);
    const updated = users.map(u => u.uid === uid ? { ...u, allowed: checked } : u);
    setUsers(updated);
    const allowedUids = updated.filter(u => u.allowed).map(u => u.uid);
    await setDiscordAllowedUids(allowedUids).catch(console.error);
    setSaving(null);
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (u.profile.pseudo || '').toLowerCase().includes(q)
      || (u.profile.email || '').toLowerCase().includes(q)
      || u.uid.toLowerCase().includes(q);
  });

  const allowedCount = users.filter(u => u.allowed).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-indigo-600 p-6 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Admin — Bouton Discord</h2>
            <p className="text-indigo-200 text-sm mt-1">
              {allowedCount === 0
                ? 'Visible par tous les utilisateurs'
                : `${allowedCount} utilisateur(s) autorisé(s)`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="text-indigo-200 hover:text-white transition-colors" title="Rafraîchir">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="text-indigo-200 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un utilisateur..."
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Si aucun utilisateur n'est coché, le bouton est visible par tous.
          </p>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2 mt-2">
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Chargement des utilisateurs...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500 text-sm">
              <p className="font-semibold mb-1">Erreur de chargement</p>
              <p className="font-mono text-xs break-all">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Aucun résultat</div>
          ) : (
            filtered.map(u => (
              <label
                key={u.uid}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  u.allowed ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={u.allowed}
                  disabled={saving === u.uid}
                  onChange={e => handleToggle(u.uid, e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 shrink-0"
                />
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {u.profile.pseudo || u.profile.displayName || 'Sans pseudo'}
                  </p>
                  {u.profile.email && (
                    <p className="text-xs text-gray-500 truncate">{u.profile.email}</p>
                  )}
                  <p className="text-xs text-gray-400 font-mono truncate">{u.uid}</p>
                </div>
                {saving === u.uid && (
                  <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
                )}
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
