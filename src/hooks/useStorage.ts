import { useState, useCallback, useRef } from 'react';
import type { AppData, ActionItem } from '@/types';

const DATA_VERSION = '1.0.0';
const AUTO_SAVE_DELAY_MS = 1500;

function createEmptyAppData(): AppData {
  return {
    version: DATA_VERSION,
    items: [],
    lastSaved: new Date().toISOString(),
  };
}

export function useStorage() {
  const [data, setData] = useState<AppData>(createEmptyAppData());
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'no_file'>('no_file');
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const readFile = useCallback(async (handle: FileSystemFileHandle): Promise<AppData> => {
    const file = await handle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text) as AppData;
    if (!parsed.items || !Array.isArray(parsed.items)) throw new Error('Invalid data format');
    return parsed;
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
    setSyncStatus('saving');
    try {
      const updated = { ...newData, lastSaved: new Date().toISOString() };
      await writeFile(fileHandle, updated);
      setSyncStatus('saved');
      setError(null);
    } catch {
      setSyncStatus('error');
      setError('Failed to save. Check file permissions.');
    }
  }, [fileHandle, writeFile]);

  const scheduleSave = useCallback((newData: AppData) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveData(newData), AUTO_SAVE_DELAY_MS);
  }, [saveData]);

  const addItem = useCallback((item: ActionItem) => {
    setData(prev => {
      const updated = { ...prev, items: [...prev.items, item] };
      scheduleSave(updated);
      return updated;
    });
  }, [scheduleSave]);

  const updateItem = useCallback((item: ActionItem) => {
    setData(prev => {
      const updated = {
        ...prev,
        items: prev.items.map(i => i.id === item.id ? item : i)
      };
      scheduleSave(updated);
      return updated;
    });
  }, [scheduleSave]);

  const deleteItem = useCallback((id: string) => {
    setData(prev => {
      const updated = { ...prev, items: prev.items.filter(i => i.id !== id) };
      scheduleSave(updated);
      return updated;
    });
  }, [scheduleSave]);

  return {
    data,
    syncStatus,
    error,
    fileHandle,
    openFile,
    createFile,
    addItem,
    updateItem,
    deleteItem,
  };
}
