import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { AppUser } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { APP_USERS } from '@/auth/users.config';
import type { useStorage } from '@/hooks/useStorage';
import { UserModal } from '@/components/admin/UserModal';
import { Plus, Pencil, Trash2, Shield, ShieldCheck, Lock } from 'lucide-react';

interface Props {
  storage: ReturnType<typeof useStorage>;
}

export default function Admin({ storage }: Props) {
  const { session } = useAuth();
  const [modalUser, setModalUser] = useState<AppUser | null | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (session?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const dataUsers = storage.data.users;
  const bootstrapUsernames = new Set(APP_USERS.map(u => u.username.toLowerCase()));

  // Combined view: bootstrap users (read-only) + data file users (editable)
  const allUsers = [
    ...APP_USERS.map(u => ({ user: u as AppUser, source: 'bootstrap' as const })),
    ...dataUsers
      .filter(u => !bootstrapUsernames.has(u.username.toLowerCase()))
      .map(u => ({ user: u, source: 'data' as const })),
  ];

  const adminCount = allUsers.filter(({ user }) => user.role === 'admin').length;

  function handleSave(user: AppUser) {
    const existing = dataUsers.find(u => u.id === user.id);
    if (existing) {
      storage.updateUser(user);
    } else {
      storage.addUser(user);
    }
  }

  function handleDelete(id: string) {
    const user = dataUsers.find(u => u.id === id);
    if (!user) return;
    // Prevent deleting the last admin (across both bootstrap + data users)
    if (user.role === 'admin' && adminCount <= 1) {
      alert('Cannot delete the last admin user.');
      setDeleteConfirm(null);
      return;
    }
    storage.deleteUser(id);
    setDeleteConfirm(null);
  }

  const existingUsernamesExcluding = (excludeId?: string) =>
    allUsers
      .filter(({ user }) => user.id !== excludeId)
      .map(({ user }) => user.username.toLowerCase());

  const fileRequired = storage.syncStatus === 'no_file';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {allUsers.length} user{allUsers.length !== 1 ? 's' : ''} ·  {adminCount} admin{adminCount !== 1 ? 's' : ''}
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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Display Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Username</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
              <th className="px-4 py-3 font-medium text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.map(({ user, source }) => {
              const isBootstrap = source === 'bootstrap';
              return (
                <tr key={user.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.displayName}</td>
                  <td className="px-4 py-3 text-gray-700 font-mono text-xs">{user.username}</td>
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
                    {isBootstrap ? (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Lock size={12} /> Bootstrap (code)
                      </span>
                    ) : (
                      <span className="text-xs text-green-700">Data file</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {isBootstrap ? (
                        <span className="text-xs text-gray-400 italic pr-2">Read-only</span>
                      ) : (
                        <>
                          <button
                            onClick={() => setModalUser(user)}
                            className="p-1.5 text-gray-400 hover:text-corticle-cyan hover:bg-cyan-50 rounded-lg transition-colors"
                            aria-label={`Edit ${user.displayName}`}
                          >
                            <Pencil size={16} />
                          </button>
                          {deleteConfirm === user.id ? (
                            <button
                              onClick={() => handleDelete(user.id)}
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
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </>
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
        <p><span className="font-medium">Bootstrap users</span> are hard-coded in <code className="bg-white/60 px-1 rounded">src/auth/users.config.ts</code> and guarantee login access even without a data file. They can only be changed in code.</p>
        <p><span className="font-medium">Data file users</span> are persisted to your JSON data file and can be managed here. They override bootstrap users with the same username.</p>
      </div>

      {modalUser !== undefined && (
        <UserModal
          user={modalUser}
          existingUsernames={existingUsernamesExcluding(modalUser?.id)}
          onSave={handleSave}
          onClose={() => setModalUser(undefined)}
        />
      )}
    </div>
  );
}
