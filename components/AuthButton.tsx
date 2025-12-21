import { useState } from 'react';
import type { User } from '../types';
import { signOut } from '../services/authService';

interface AuthButtonProps {
  user: User | null;
  onSignInClick: () => void;
}

export function AuthButton({ user, onSignInClick }: AuthButtonProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowMenu(false);
    } catch (error) {
      console.error('Failed to sign out:', error);
      alert('Erreur lors de la déconnexion');
    }
  };

  if (!user) {
    return (
      <button
        onClick={onSignInClick}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Se connecter
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'User'}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
            {(user.displayName || user.pseudo || 'U')[0].toUpperCase()}
          </div>
        )}
        <span className="font-medium">
          {user.displayName || user.pseudo || 'Utilisateur'}
        </span>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-20">
            <div className="px-4 py-2 border-b">
              <p className="text-sm text-gray-600">
                {user.isAnonymous ? 'Compte anonyme' : user.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-red-600"
            >
              Se déconnecter
            </button>
          </div>
        </>
      )}
    </div>
  );
}
