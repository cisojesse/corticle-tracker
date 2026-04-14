import type { AppUser } from '@/types';

/**
 * USER CONFIGURATION
 *
 * To add users:
 * 1. Generate a bcrypt hash: https://bcrypt-generator.com (rounds: 10)
 *    OR run in Node: require('bcryptjs').hashSync('password', 10)
 * 2. Add user object below
 *
 * IMPORTANT: Never commit plaintext passwords.
 * This file is gitignored in production. For team use,
 * replace with Entra ID SSO (see .env.local).
 */
export const APP_USERS: (Omit<AppUser, 'passwordHash'> & { passwordHash: string })[] = [
  {
    id: '1',
    username: 'jesse',
    displayName: 'Jesse Whaley',
    role: 'admin',
    // Default password: ChangeMe123! — CHANGE THIS BEFORE USE
    passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  },
  {
    id: '2',
    username: 'alex',
    displayName: 'Alexander Zaft',
    role: 'admin',
    passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  },
  {
    id: '3',
    username: 'mac',
    displayName: 'Matt McKechnie',
    role: 'admin',
    passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  },
];

export const TEAM_DISPLAY_NAMES = APP_USERS.map(u => u.displayName);
