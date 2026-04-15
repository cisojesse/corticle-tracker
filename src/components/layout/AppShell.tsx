import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { CATEGORY_LABELS, type Category } from '@/types';
import type { useStorage } from '@/hooks/useStorage';
import {
  LayoutDashboard,
  ListTodo,
  FolderOpen,
  LogOut,
  Menu,
  X,
  HardDrive,
  FolderPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Cloud,
  Users,
  Building2,
  UserSquare,
} from 'lucide-react';

interface Props {
  storage: ReturnType<typeof useStorage>;
  children: React.ReactNode;
}

const SYNC_STATUS_MAP = {
  idle: { icon: Cloud, label: 'Idle', className: 'text-gray-400' },
  saving: { icon: Loader2, label: 'Saving...', className: 'text-yellow-500 animate-spin' },
  saved: { icon: CheckCircle2, label: 'Saved', className: 'text-green-500' },
  error: { icon: AlertCircle, label: 'Error', className: 'text-red-500' },
  no_file: { icon: HardDrive, label: 'No file', className: 'text-gray-400' },
};

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [Category, string][];

export function AppShell({ storage, children }: Props) {
  const { session, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const syncInfo = SYNC_STATUS_MAP[storage.syncStatus];
  const SyncIcon = syncInfo.icon;

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/items', label: 'All Items', icon: ListTodo },
    { to: '/companies', label: 'Companies', icon: Building2 },
    { to: '/contacts', label: 'Contacts', icon: UserSquare },
    ...(session?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: Users }] : []),
  ];

  function isActive(path: string) {
    return location.pathname === path;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-corticle-navy transform transition-transform lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } flex flex-col`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-corticle-cyan flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Corticle Ops</p>
            <p className="text-corticle-light text-xs opacity-70">Action Tracker</p>
          </div>
          <button
            className="ml-auto lg:hidden text-white/60 hover:text-white"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.to)
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}

          {/* Category links */}
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
              Categories
            </p>
          </div>
          {CATEGORIES.map(([key, label]) => (
            <Link
              key={key}
              to={`/category/${key}`}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                location.pathname === `/category/${key}`
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <FolderOpen size={16} />
              {label}
            </Link>
          ))}
        </nav>

        {/* User / logout */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{session?.displayName}</p>
              <p className="text-white/40 text-xs">{session?.role}</p>
            </div>
            <button
              onClick={logout}
              className="text-white/40 hover:text-white transition-colors p-1.5"
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center gap-4 sticky top-0 z-20">
          <button
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={22} />
          </button>

          <div className="flex-1" />

          {/* Sync status */}
          <div className="flex items-center gap-2 text-sm">
            <SyncIcon size={16} className={syncInfo.className} />
            <span className="text-gray-500 hidden sm:inline">{syncInfo.label}</span>
          </div>

          {/* File actions */}
          {storage.syncStatus === 'no_file' ? (
            <div className="flex gap-2">
              <button
                onClick={storage.openFile}
                className="flex items-center gap-1.5 text-sm text-corticle-accent hover:text-corticle-cyan transition-colors"
                aria-label="Open existing data file"
              >
                <FolderOpen size={16} />
                <span className="hidden sm:inline">Open</span>
              </button>
              <button
                onClick={storage.createFile}
                className="flex items-center gap-1.5 text-sm text-corticle-accent hover:text-corticle-cyan transition-colors"
                aria-label="Create new data file"
              >
                <FolderPlus size={16} />
                <span className="hidden sm:inline">New</span>
              </button>
            </div>
          ) : null}

          {storage.error && (
            <span className="text-xs text-red-500 hidden sm:inline">{storage.error}</span>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
