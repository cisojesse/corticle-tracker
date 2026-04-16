import type { CompanyType, AgencyTier } from '@/types';

// ---------------------------------------------------------------------------
// Known federal agencies & partners — used to auto-detect org from free-text
// ---------------------------------------------------------------------------

interface OrgEntry {
  pattern: RegExp;
  name: string;
  type: CompanyType;
  agencyTier: AgencyTier | null;
  agencyCode: string | null;
}

const KNOWN_ORGS: OrgEntry[] = [
  { pattern: /\bARCYBER\b/, name: 'ARCYBER', type: 'federal_agency', agencyTier: 'dod', agencyCode: 'ARCYBER' },
  { pattern: /\bNETCOM\b/, name: 'NETCOM', type: 'federal_agency', agencyTier: 'dod', agencyCode: 'NETCOM' },
  { pattern: /\bDISA\b/, name: 'DISA', type: 'federal_agency', agencyTier: 'dod', agencyCode: 'DISA' },
  { pattern: /\bCISA\b/, name: 'CISA', type: 'federal_agency', agencyTier: 'civilian', agencyCode: 'CISA' },
  { pattern: /\bAir Force\b/i, name: 'Air Force', type: 'federal_agency', agencyTier: 'dod', agencyCode: 'USAF' },
  { pattern: /\bCarahsoft\b/i, name: 'Carahsoft', type: 'distributor', agencyTier: null, agencyCode: null },
  // VA — \bVA\b won't match inside "VAR"
  { pattern: /\bVA\b/, name: 'VA', type: 'federal_agency', agencyTier: 'civilian', agencyCode: 'VA' },
];

// Strings matching these are probably groups/teams, not individual contacts.
const SKIP_PATTERNS: RegExp[] = [
  /\bteam\b/i,
  /\bnetwork\b/i,
  /\btop \d+/i,
  /\s\+\s/,
  /\bCRO\b.*\bCEO\b/i,
  /\$\d/,
];

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ParseResult {
  title: string;
  company: string;
  companyType: CompanyType;
  agencyCode: string | null;
  agencyTier: AgencyTier | null;
  suggestSkip: boolean;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export function parseContactString(raw: string): ParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { title: '', company: '', companyType: 'commercial', agencyCode: null, agencyTier: null, suggestSkip: true };
  }

  const suggestSkip = SKIP_PATTERNS.some(p => p.test(trimmed));

  // Try known org lookup
  for (const org of KNOWN_ORGS) {
    if (org.pattern.test(trimmed)) {
      let title = trimmed
        .replace(org.pattern, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
        // Strip leading/trailing commas and whitespace
        .replace(/^[\s,]+|[\s,]+$/g, '')
        // Remove empty or near-empty parens like "()" or "(via )"
        .replace(/\(\s*(via\s*)?\)/g, '')
        .trim();

      if (!title) {
        return { title: '', company: org.name, companyType: org.type, agencyCode: org.agencyCode, agencyTier: org.agencyTier, suggestSkip: true };
      }

      return { title, company: org.name, companyType: org.type, agencyCode: org.agencyCode, agencyTier: org.agencyTier, suggestSkip };
    }
  }

  // No known org — try comma split (last segment = company)
  const lastComma = trimmed.lastIndexOf(',');
  if (lastComma > 0) {
    const title = trimmed.slice(0, lastComma).trim();
    const company = trimmed.slice(lastComma + 1).trim();
    if (title && company) {
      return { title, company, companyType: 'commercial', agencyCode: null, agencyTier: null, suggestSkip };
    }
  }

  // No comma, no known org
  return { title: trimmed, company: '', companyType: 'commercial', agencyCode: null, agencyTier: null, suggestSkip: true };
}
