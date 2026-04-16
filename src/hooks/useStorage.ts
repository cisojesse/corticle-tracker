import { useState, useCallback, useRef } from 'react';
import type {
  AppData, ActionItem, AppUser,
  Company, Contact, Deal, Activity, Cadence, Round, InvestorEngagement,
} from '@/types';
import { cacheDataUsers } from '@/auth/AuthContext';

const DATA_VERSION = '2.0.0';
const AUTO_SAVE_DELAY_MS = 1500;

function createEmptyAppData(): AppData {
  return {
    version: DATA_VERSION,
    items: [],
    users: [],
    companies: [],
    contacts: [],
    deals: [],
    activities: [],
    cadences: [],
    rounds: [],
    investorEngagements: [],
    lastSaved: new Date().toISOString(),
  };
}

/**
 * Normalizes loaded data — ensures newer fields exist even when loading
 * an older data file. Additive only: never mutates existing values.
 *
 * v1.0.0 → v2.0.0 migration:
 *   - Add empty arrays for companies, contacts, deals, activities, cadences, rounds, investorEngagements
 *   - Add contactId/dealId (null) to ActionItems
 *   - Add email ('') to users if missing
 */
function normalizeAppData(parsed: AppData): AppData {
  return {
    version: DATA_VERSION,
    items: (parsed.items ?? []).map(i => ({
      ...i,
      contactId: i.contactId ?? null,
      dealId: i.dealId ?? null,
    })),
    users: (parsed.users ?? []).map(u => ({ ...u, email: u.email ?? '' })),
    companies: parsed.companies ?? [],
    contacts: parsed.contacts ?? [],
    deals: parsed.deals ?? [],
    activities: parsed.activities ?? [],
    cadences: parsed.cadences ?? [],
    rounds: parsed.rounds ?? [],
    investorEngagements: parsed.investorEngagements ?? [],
    lastSaved: parsed.lastSaved ?? new Date().toISOString(),
  };
}

// Keys of AppData that are arrays of identified entities (have an `id` field).
type CollectionKey =
  | 'items'
  | 'users'
  | 'companies'
  | 'contacts'
  | 'deals'
  | 'activities'
  | 'cadences'
  | 'rounds'
  | 'investorEngagements';

export function useStorage() {
  const [data, setData] = useState<AppData>(createEmptyAppData());
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'no_file'>('no_file');
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<AppData | null>(null);
  const isSaving = useRef(false);

  const readFile = useCallback(async (handle: FileSystemFileHandle): Promise<AppData> => {
    const file = await handle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text) as AppData;
    if (!parsed.items || !Array.isArray(parsed.items)) throw new Error('Invalid data format');
    return normalizeAppData(parsed);
  }, []);

  const writeFile = useCallback(async (handle: FileSystemFileHandle, appData: AppData) => {
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(appData, null, 2));
    await writable.close();
  }, []);

  const openFile = useCallback(async () => {
    try {
      if (!('showOpenFilePicker' in window)) {
        setError('File System Access API not supported. Use Chrome or Edge.');
        return;
      }

      const [handle] = await (window as Window & typeof globalThis & {
        showOpenFilePicker: (opts: object) => Promise<FileSystemFileHandle[]>
      }).showOpenFilePicker({
        types: [{ description: 'Corticle Data', accept: { 'application/json': ['.json'] } }],
        multiple: false,
      });

      setFileHandle(handle);
      const loaded = await readFile(handle);
      setData(loaded);
      cacheDataUsers(loaded.users);
      setSyncStatus('saved');
      setError(null);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError('Failed to open file.');
        setSyncStatus('error');
      }
    }
  }, [readFile]);

  const createFile = useCallback(async () => {
    try {
      const handle = await (window as Window & typeof globalThis & {
        showSaveFilePicker: (opts: object) => Promise<FileSystemFileHandle>
      }).showSaveFilePicker({
        suggestedName: 'corticle-ops-data.json',
        types: [{ description: 'Corticle Data', accept: { 'application/json': ['.json'] } }],
      });

      const fresh = createEmptyAppData();
      await writeFile(handle, fresh);
      setFileHandle(handle);
      setData(fresh);
      cacheDataUsers(fresh.users);
      setSyncStatus('saved');
      setError(null);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError('Failed to create file.');
        setSyncStatus('error');
      }
    }
  }, [writeFile]);

  const saveData = useCallback(async (newData: AppData) => {
    if (!fileHandle) {
      setSyncStatus('no_file');
      return;
    }

    // Write lock: if a save is already in-flight, queue this one
    if (isSaving.current) {
      pendingSave.current = newData;
      return;
    }

    isSaving.current = true;
    setSyncStatus('saving');
    try {
      const updated = { ...newData, lastSaved: new Date().toISOString() };
      await writeFile(fileHandle, updated);
      cacheDataUsers(updated.users);
      setSyncStatus('saved');
      setError(null);
    } catch {
      setSyncStatus('error');
      setError('Failed to save. Check file permissions.');
    } finally {
      isSaving.current = false;
      // Drain queued save — always write the latest data
      if (pendingSave.current) {
        const queued = pendingSave.current;
        pendingSave.current = null;
        saveData(queued);
      }
    }
  }, [fileHandle, writeFile]);

  const scheduleSave = useCallback((newData: AppData) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveData(newData), AUTO_SAVE_DELAY_MS);
  }, [saveData]);

  // ---------------------------------------------------------------------------
  // Generic CRUD helpers — one set of implementations for all 9 collections.
  // ---------------------------------------------------------------------------

  const addTo = useCallback(<K extends CollectionKey>(key: K, item: AppData[K][number]) => {
    setData(prev => {
      const nextList = [...(prev[key] as { id: string }[]), item as { id: string }];
      const updated = { ...prev, [key]: nextList } as AppData;
      scheduleSave(updated);
      if (key === 'users') cacheDataUsers(updated.users);
      return updated;
    });
  }, [scheduleSave]);

  const updateIn = useCallback(<K extends CollectionKey>(key: K, item: AppData[K][number]) => {
    setData(prev => {
      const list = prev[key] as { id: string }[];
      const nextList = list.map(x => x.id === (item as { id: string }).id ? item : x);
      const updated = { ...prev, [key]: nextList } as AppData;
      scheduleSave(updated);
      if (key === 'users') cacheDataUsers(updated.users);
      return updated;
    });
  }, [scheduleSave]);

  const removeFrom = useCallback(<K extends CollectionKey>(key: K, id: string) => {
    setData(prev => {
      const list = prev[key] as { id: string }[];
      const nextList = list.filter(x => x.id !== id);
      const updated = { ...prev, [key]: nextList } as AppData;
      scheduleSave(updated);
      if (key === 'users') cacheDataUsers(updated.users);
      return updated;
    });
  }, [scheduleSave]);

  // ---------------------------------------------------------------------------
  // Per-entity wrappers — preserve the existing API for callers.
  // ---------------------------------------------------------------------------

  // Action items
  const addItem = useCallback((item: ActionItem) => addTo('items', item), [addTo]);
  const updateItem = useCallback((item: ActionItem) => updateIn('items', item), [updateIn]);
  const deleteItem = useCallback((id: string) => removeFrom('items', id), [removeFrom]);

  // Users
  const addUser = useCallback((user: AppUser) => addTo('users', user), [addTo]);
  const updateUser = useCallback((user: AppUser) => updateIn('users', user), [updateIn]);
  const deleteUser = useCallback((id: string) => removeFrom('users', id), [removeFrom]);

  // Companies
  const addCompany = useCallback((c: Company) => addTo('companies', c), [addTo]);
  const updateCompany = useCallback((c: Company) => updateIn('companies', c), [updateIn]);
  const deleteCompany = useCallback((id: string) => removeFrom('companies', id), [removeFrom]);

  // Contacts
  const addContact = useCallback((c: Contact) => addTo('contacts', c), [addTo]);
  const updateContact = useCallback((c: Contact) => updateIn('contacts', c), [updateIn]);
  const deleteContact = useCallback((id: string) => removeFrom('contacts', id), [removeFrom]);

  // Deals
  const addDeal = useCallback((d: Deal) => addTo('deals', d), [addTo]);
  const updateDeal = useCallback((d: Deal) => updateIn('deals', d), [updateIn]);
  const deleteDeal = useCallback((id: string) => removeFrom('deals', id), [removeFrom]);

  // Activities
  const addActivity = useCallback((a: Activity) => addTo('activities', a), [addTo]);
  const updateActivity = useCallback((a: Activity) => updateIn('activities', a), [updateIn]);
  const deleteActivity = useCallback((id: string) => removeFrom('activities', id), [removeFrom]);

  // Cadences
  const addCadence = useCallback((c: Cadence) => addTo('cadences', c), [addTo]);
  const updateCadence = useCallback((c: Cadence) => updateIn('cadences', c), [updateIn]);
  const deleteCadence = useCallback((id: string) => removeFrom('cadences', id), [removeFrom]);

  // Rounds
  const addRound = useCallback((r: Round) => addTo('rounds', r), [addTo]);
  const updateRound = useCallback((r: Round) => updateIn('rounds', r), [updateIn]);
  const deleteRound = useCallback((id: string) => removeFrom('rounds', id), [removeFrom]);

  // Investor engagements
  const addInvestorEngagement = useCallback((e: InvestorEngagement) => addTo('investorEngagements', e), [addTo]);
  const updateInvestorEngagement = useCallback((e: InvestorEngagement) => updateIn('investorEngagements', e), [updateIn]);
  const deleteInvestorEngagement = useCallback((id: string) => removeFrom('investorEngagements', id), [removeFrom]);

  return {
    data,
    syncStatus,
    error,
    fileHandle,
    openFile,
    createFile,
    // Existing
    addItem, updateItem, deleteItem,
    addUser, updateUser, deleteUser,
    // Phase 2a relational
    addCompany, updateCompany, deleteCompany,
    addContact, updateContact, deleteContact,
    addDeal, updateDeal, deleteDeal,
    addActivity, updateActivity, deleteActivity,
    addCadence, updateCadence, deleteCadence,
    // Fundraising
    addRound, updateRound, deleteRound,
    addInvestorEngagement, updateInvestorEngagement, deleteInvestorEngagement,
  };
}
