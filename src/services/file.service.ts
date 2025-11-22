import { Injectable } from '@angular/core';

const DB_NAME = 'file-handles-db';
const STORE_NAME = 'file-handles-store';
const FILE_HANDLE_KEY = 'db-file-handle';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as any).result;
        db.createObjectStore(STORE_NAME);
      };
    });
  }

  private async getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.dbPromise;
    return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  }

  async getHandle(): Promise<FileSystemFileHandle | undefined> {
    const store = await this.getStore('readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(FILE_HANDLE_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        if(request.result) {
            // Check for permission, it might have been revoked
            const permission = await request.result.queryPermission({ mode: 'readwrite' });
            if (permission === 'granted') {
                resolve(request.result);
            } else {
                // If permission is not granted, prompt the user again.
                const newPermission = await request.result.requestPermission({ mode: 'readwrite' });
                if(newPermission === 'granted') {
                    resolve(request.result);
                } else {
                    resolve(undefined); // User denied permission
                }
            }
        } else {
            resolve(undefined);
        }
      };
    });
  }

  async setHandle(handle: FileSystemFileHandle): Promise<void> {
    const store = await this.getStore('readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(handle, FILE_HANDLE_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearHandle(): Promise<void> {
     const store = await this.getStore('readwrite');
     store.delete(FILE_HANDLE_KEY);
  }

  async writeFile(handle: FileSystemFileHandle, contents: Uint8Array): Promise<void> {
    const writable = await handle.createWritable();
    await writable.write(contents);
    await writable.close();
  }
  
  async showOpenPicker(): Promise<FileSystemFileHandle | null> {
    try {
        // FIX: Cast window to `any` to access File System Access API which is not in default TS types.
        const [handle] = await (window as any).showOpenFilePicker({
            types: [{
                description: 'Database Files',
                accept: { 'application/x-sqlite3': ['.db'] }
            }],
        });
        return handle;
    } catch(err) {
        console.log('File open picker cancelled');
        return null;
    }
  }

  async showSavePicker(): Promise<FileSystemFileHandle | null> {
    try {
        // FIX: Cast window to `any` to access File System Access API which is not in default TS types.
        const handle = await (window as any).showSaveFilePicker({
            types: [{
                description: 'Database File',
                accept: { 'application/x-sqlite3': ['.db'] }
            }],
        });
        return handle;
    } catch(err) {
        console.log('File save picker cancelled');
        return null;
    }
  }
}