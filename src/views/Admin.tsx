import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { hashSync } from 'bcryptjs';
import type { AppUser } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { APP_USERS } from '@/auth/users.config';
import type { useStorage } from '@/hooks/useStorage';
import { UserModal } from '@/components/admin/UserModal';
import {
  Plus, Pencil, Trash2, Shield, ShieldCheck, KeyRound, AlertTriangle, Check, Copy, X,
} from 'lucide-react';

interface Props {
  storage: ReturnType<typeof useStorage>;
}

type UserRow = { user: AppUser; source: 'bootstrap' | 'data' | 'override' };

/**
 * Generates a random 12-char password using A-Z, a-z, 0-9, and a few symbols.
 * Uses crypto.getRandomValues for good randomness.
 */
function generateTempPassword(): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  const buf = new Uint32Array(12);
  crypto.getRandomValues(buf);
  let out = '';
  for (const n of buf) out += charset[n % charset.length];
  return out;
}

export default function Admin({ storage }: Props) {
  const { session } = useAuth();
  const [modalUser, setModalUser] = useState<AppUser | null | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ user: AppUser; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (session?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const dataUsers = storage.data.users;

  // Merge bootstrap + data-file users by username (data-file wins).
  // A "override" source means a data-file entry shadows a bootstrap user.
  const byUsername = new Map<string, UserRow>();
  for (const u of APP_USERS) {
    byUsername.set(u.username.toLowerCase(), { user: u as AppUser, source: 'bootstrap' });
  }
  for (const u of dataUsers) {
    const key = u.username.toLowerCase();
    const prior = byUsername.get(key);
    byUsername.set(key, {
      user: u,
      source: prior?.source === 'bootstrap' ? 'override' : 'data',
    });
  }
  const allUsers = Array.from(byUsername.values());
  const adminCount = allUsers.filter(({ user }) => user.role === 'admin').length;

  /**
   * Save handler that transparently handles bootstrap overrides.
   * Matches existing data-file user by username (not ID) since bootstrap
   * users don't have a data-file ID yet.
   */
  function handleSave(user: AppUser) {
    const existingByUsername = dataUsers.find(
      u => u.username.toLowerCase() === user.username.toLowerCase()
    );
    if (existingByUsername) {
      storage.updateUser({ ...user, id: existingByUsername.id });
    } else {
      storage.addUser(user);
    }
  }

  function handleDelete(id: string, username: string) {
    // Only allow deleting data-file users. Bootstrap users can't be deleted;
    // if you deleted an override, the bootstrap user returns.
    const user = dataUsers.find(u => u.id === id);
    if (!user) return;
    // Guard against removing the last admin across merged view.
    if (user.role === 'admin' && adminCount <= 1) {
      alert('Cannot delete the last admin user.');
      setDeleteConfirm(null);
      return;
    }
    // Guard against deleting yourself
    if (username.toLowerCase() === session?.username.toLowerCase()) {
      alert('You cannot delete your own account.');
      setDeleteConfirm(null);
      return;
    }
    storage.deleteUser(id);
    setDeleteConfirm(null);
  }

  function handleResetPassword(user: AppUser) {
    if (!confirm(`Reset password for ${user.displayName}? A temporary password will be generated and displayed once. Deliver it to the user securely.`)) {
      return;
    }
    const temp = generateTempPassword();
    const hash = hashSync(temp, 10);
    const updated: AppUser = { ...user, passwordHash: hash };
    handleSave(updated);
    setResetResult({ user: updated, tempPassword: temp });
    setCopied(false);
  }

  async function copyTempPassword() {
    if (!resetResult) return;
    try {
      await navigator.clipboard.writeText(resetResult.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no-op; they can select manually
    }
  }

  const existingUsernamesExcluding = (excludeId?: string) =>
    allUsers
      .filter(({ user }) => user.id !== excludeId)
      .map(({ user }) => user.username.toLowerCase());

  const fileRequired = storage.syncStatus === 'no_file';
  const missingEmails = allUsers.filter(({ user }) => !user.email).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {allUsers.length} user{allUsers.length !== 1 ? 's' : ''} · {adminCount} admin{adminCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModalUser(null)}
          disabled={fileRequired}
          className="inline-flex items-center gap-2 bg-corticle-cyan text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Create new user"
          title={fileRequired ? 'Open a data file first' : 'Create new user'}
        >
          <Plus size={18} />
          New User
        </button>
      </div>

      {fileRequired && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          Open or create a data file (header toolbar) before managing users. Changes are persisted to the data file.
        </div>
      )}

      {!fileRequired && missingEmails > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            {missingEmails} user{missingEmails !== 1 ? 's have' : ' has'} no email set. Calendar invites and password reset delivery require an email — click Edit to add one.
          </span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Display Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Username</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
              <th className="px-4 py-3 font-medium text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.map(({ user, source }) => {
              const isDataBacked = source === 'data' || source === 'override';
              return (
                <tr key={user.username} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.displayName}</td>
                  <td className="px-4 py-3 text-gray-700 font-mono text-xs">{user.username}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs">
                    {user.email || <span className="text-amber-600 italic">Not set</span>}
                  </td>
                  <td className="px-4 py-3">
                    {user.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <ShieldCheck size={12} /> Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        <Shield size={12} /> Member
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {source === 'bootstrap' && <span className="text-xs text-gray-500">Bootstrap (code)</span>}
                    {source === 'override' && <span className="text-xs text-blue-700">Bootstrap (overridden)</span>}
                    {source === 'data' && <span className="text-xs text-green-700">Data file</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setModalUser(user)}
                        disabled={fileRequired}
                        className="p-1.5 text-gray-400 hover:text-corticle-cyan hover:bg-cyan-50 rounded-lg transition-colors disabled:opacity-40"
                        aria-label={`Edit ${user.displayName}`}
                        title={source === 'bootstrap' ? 'Edit (creates data-file override)' : 'Edit user'}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleResetPassword(user)}
                        disabled={fileRequired}
                        className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-40"
                        aria-label={`Reset password for ${user.displayName}`}
                        title="Reset password (generates temp password)"
                      >
                        <KeyRound size={16} />
                      </button>
                      {isDataBacked ? (
                        deleteConfirm === user.id ? (
                          <button
                            onClick={() => handleDelete(user.id, user.username)}
                            className="px-2 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs font-medium"
                            aria-label="Confirm delete"
                          >
                            Confirm
                          </button>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(user.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            aria-label={`Delete ${user.displayName}`}
                            title={source === 'override' ? 'Remove override (reverts to bootstrap)' : 'Delete user'}
                          >
                            <Trash2 size={16} />
                          </button>
                        )
                      ) : (
                        <span className="p-1.5 text-gray-300" title="Bootstrap users can't be deleted from the UI">
                          <Trash2 size={16} />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-1">
        <p className="font-semibold">About user sources</p>
        <p><span className="font-medium">Bootstrap users</span> are hard-coded in <code className="bg-white/60 px-1 rounded">src/auth/users.config.ts</code> and guarantee login access even without a data file. Editing one transparently creates a data-file override.</p>
        <p><span className="font-medium">Overridden</span> means a bootstrap user has a data-file entry that shadows the code defaults (e.g. email or password change). Deleting the override reverts to the bootstrap copy.</p>
        <p><span className="font-medium">Data file users</span> are purely persisted to your JSON data file.</p>
      </div>

      {modalUser !== undefined && (
        <UserModal
          user={modalUser}
          existingUsernames={existingUsernamesExcluding(modalUser?.id)}
          onSave={handleSave}
          onClose={() => setModalUser(undefined)}
        />
      )}

      {resetResult && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-result-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 id="reset-result-title" className="text-lg font-semibold text-gray-900">
                Temporary password
              </h2>
              <button
                onClick={() => setResetResult(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              A new password has been set for <span className="font-medium">{resetResult.user.displayName}</span>.
              Copy it and deliver securely — it won't be shown again.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 flex items-center justify-between gap-3">
              <code className="font-mono text-sm text-gray-900 break-all select-all">
                {resetResult.tempPassword}
              </code>
              <button
                onClick={copyTempPassword}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 bg-corticle-cyan text-white text-xs font-medium rounded-lg hover:bg-corticle-accent transition-colors"
                aria-label="Copy temporary password to clipboard"
              >
                {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
              </button>
            </div>
            <p className="text-xs text-amber-700 mb-4">
              Remind {resetResult.user.displayName} to change this password after first login
              (once self-serve password change ships — Phase 2b).
            </p>
            <button
              onClick={() => setResetResult(null)}
              className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
