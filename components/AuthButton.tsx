import { useState, useEffect } from 'react';
import type { User } from '../types';
import { signOut } from '../services/authService';
import { friendsService } from '../services/friendsService';
import { Users, User as UserIcon } from 'lucide-react';

interface AuthButtonProps {
  user: User | null;
  onSignInClick: () => void;
  onFriendsClick?: () => void;
  onProfileClick?: () => void;
}

export function AuthButton({ user, onSignInClick, onFriendsClick, onProfileClick }: AuthButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Subscribe to friend requests for notification badge
  useEffect(() => {
    if (!user) return;

    const unsubscribe = friendsService.subscribeToFriendRequests(
      user.uid,
      (requests) => setPendingCount(requests.length)
    );

    return () => unsubscribe();
  }, [user?.uid]);

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
            {onFriendsClick && (
              <button
                onClick={() => {
                  onFriendsClick();
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center justify-between"
              >
                <span className="flex items-center">
                  <Users className="w-4 h-4 mr-2" /> Friends
                </span>
                {pendingCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}
            {onProfileClick && (
              <button
                onClick={() => {
                  onProfileClick();
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center"
              >
                <UserIcon className="w-4 h-4 mr-2" /> Profile
              </button>
            )}
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
