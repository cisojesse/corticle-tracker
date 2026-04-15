import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { hashSync } from 'bcryptjs';
import type { AppUser } from '@/types';
import { sanitizeShortText } from '@/utils/sanitize';
import { X } from 'lucide-react';

interface Props {
  user?: AppUser | null;
  existingUsernames: string[]; // lowercased, excluding the current user being edited
  onSave: (user: AppUser) => void;
  onClose: () => void;
}

export function UserModal({ user, existingUsernames, onSave, onClose }: Props) {
  const isEdit = !!user;

  const [username, setUsername] = useState(user?.username ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<'admin' | 'member'>(user?.role ?? 'member');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};

    const cleanUsername = sanitizeShortText(username).toLowerCase();
    if (!cleanUsername) {
      errs.username = 'Username is required';
    } else if (!/^[a-z0-9_.-]{2,30}$/.test(cleanUsername)) {
      errs.username = 'Username must be 2-30 chars: letters, numbers, underscore, dot, dash';
    } else if (existingUsernames.includes(cleanUsername)) {
      errs.username = 'Username is already taken';
    }

    if (!sanitizeShortText(displayName)) {
      errs.displayName = 'Display name is required';
    }

    const cleanEmail = sanitizeShortText(email);
    if (!cleanEmail) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errs.email = 'Enter a valid email address';
    }

    // Password required on create, optional on edit
    if (!isEdit) {
      if (!password) {
        errs.password = 'Password is required';
      } else if (password.length < 8) {
        errs.password = 'Password must be at least 8 characters';
      } else if (password !== confirm) {
        errs.confirm = 'Passwords do not match';
      }
    } else if (password || confirm) {
      if (password.length < 8) {
        errs.password = 'Password must be at least 8 characters';
      } else if (password !== confirm) {
        errs.confirm = 'Passwords do not match';
      }
    }

    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const cleanUsername = sanitizeShortText(username).toLowerCase();
    const cleanDisplayName = sanitizeShortText(displayName);

    const passwordHash = password
      ? hashSync(password, 10)
      : user!.passwordHash;

    const saved: AppUser = {
      id: user?.id ?? uuidv4(),
      username: cleanUsername,
      displayName: cleanDisplayName,
      email: sanitizeShortText(email).toLowerCase(),
      role,
      passwordHash,
    };

    onSave(saved);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 id="user-modal-title" className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit User' : 'New User'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="user-username" className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <input
              id="user-username"
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent"
              autoFocus={!isEdit}
            />
            {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username}</p>}
          </div>

          <div>
            <label htmlFor="user-displayname" className="block text-sm font-medium text-gray-700 mb-1">
              Display Name *
            </label>
            <input
              id="user-displayname"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent"
            />
            {errors.displayName && <p className="text-xs text-red-500 mt-1">{errors.displayName}</p>}
          </div>

          <div>
            <label htmlFor="user-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              id="user-email"
              type="email"
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent"
              placeholder="user@corticle.io"
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            <p className="text-xs text-gray-400 mt-1">Used for calendar invites and password reset delivery.</p>
          </div>

          <div>
            <label htmlFor="user-role" className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              id="user-role"
              value={role}
              onChange={e => setRole(e.target.value as 'admin' | 'member')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label htmlFor="user-password" className="block text-sm font-medium text-gray-700 mb-1">
              {isEdit ? 'New password (leave blank to keep current)' : 'Password *'}
            </label>
            <input
              id="user-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent"
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="user-confirm" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm password{isEdit ? '' : ' *'}
            </label>
            <input
              id="user-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent"
            />
            {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-corticle-cyan text-white rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors"
            >
              {isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
