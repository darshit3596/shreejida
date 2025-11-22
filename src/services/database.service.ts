import { Injectable, inject, signal } from '@angular/core';
import { AppData, Invoice, InventoryItem, User } from '../interfaces';
import { FileService } from './file.service';

declare const initSqlJs: any;

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private fileService = inject(FileService);
  private db: any = null;
  private isInitialized = false;

  dbFileName = signal<string | null>(null);

  async init(): Promise<'ready' | 'needs_file'> {
    if (this.isInitialized) return 'ready';

    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });

    const fileHandle = await this.fileService.getHandle();
    if (fileHandle) {
      this.dbFileName.set(fileHandle.name);
      try {
        const file = await fileHandle.getFile();
        const arrayBuffer = await file.arrayBuffer();
        const dbContents = new Uint8Array(arrayBuffer);
        if (dbContents.length > 0) {
          this.db = new SQL.Database(dbContents);
        } else {
          this.db = new SQL.Database();
          await this.createSchema();
        }
        this.isInitialized = true;
        return 'ready';
      } catch (error) {
        console.error("Error reading database file:", error);
        await this.fileService.clearHandle(); // Clear invalid handle
        return 'needs_file';
      }
    } else {
      return 'needs_file';
    }
  }

  async createNewDatabaseFile(force = false): Promise<boolean> {
    if (!force && this.isInitialized) return false;
    const handle = await this.fileService.showSavePicker();
    if (handle) {
      await this.fileService.setHandle(handle);
      this.dbFileName.set(handle.name);
      const SQL = await initSqlJs();
      this.db = new SQL.Database();
      await this.createSchema();
      await this.saveDatabaseToFile();
      this.isInitialized = true;
      return true;
    }
    return false;
  }

  async loadDatabaseFromFile(force = false): Promise<boolean> {
    if (!force && this.isInitialized) return false;
    const handle = await this.fileService.showOpenPicker();
    if (handle) {
      await this.fileService.setHandle(handle);
      this.dbFileName.set(handle.name);
      this.isInitialized = false; // Force re-initialization
      return (await this.init()) === 'ready';
    }
    return false;
  }

  async saveDatabaseToFile(): Promise<void> {
    if (!this.db) return;
    const handle = await this.fileService.getHandle();
    if (handle) {
      const data = this.db.export();
      await this.fileService.writeFile(handle, data);
    }
  }

  async saveDatabaseAs(): Promise<void> {
    if (!this.db) return;
    const handle = await this.fileService.showSavePicker();
    if (handle) {
        const data = this.db.export();
        await this.fileService.writeFile(handle, data);
        // Optional: switch to the new file after save as
        // await this.fileService.setHandle(handle);
        // this.dbFileName.set(handle.name);
    }
  }


  private async createSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        passwordHash TEXT
      );
      CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        name TEXT,
        quantity INTEGER,
        price REAL,
        minStock INTEGER
      );
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        customerName TEXT,
        vehicle TEXT,
        vehicleNo TEXT,
        mobileNo TEXT,
        km TEXT,
        date TEXT,
        items TEXT,
        subTotal REAL,
        taxPercent REAL,
        discountAmount REAL,
        total REAL,
        status TEXT
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    // Insert default settings
    const defaultSettings = this.getInitialSettings();
    for (const key in defaultSettings) {
        this.db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify((defaultSettings as any)[key])]);
    }
  }
  
  private getInitialSettings(): AppData['settings'] {
     return {
        invoiceCounter: 1,
        shopName: 'SHREEJI MOTERS',
        tagLine: 'Invoice & Inventory',
        address: 'Your Address, City, State - 123456 | Contact: +91 1234567890',
        signatory: 'Shreeji Moters',
        term1: '(1) ટાયર માં કંપની મેન્યુફેક્ચરીંગ ખામીની જવાબદારી કંપની ની રહેશે.',
        term2: '(2) ક્લેમમાં મોકલેલ ટ્યુબ-ટાયર નો ખર્ચ તથા ઘસારો ગ્રાહકે આપવાનો રહેશે.',
        term3: '(3) ટ્યુબ-ટાયર ક્લેમમાં મોકલ્યા બાદ કંપનીનો નિર્ણય ગ્રાહકે માન્ય રાખવાનો રહેશે.'
      };
  }

  async loadAllData(): Promise<AppData> {
    const users = this.db.exec("SELECT * FROM users")[0]?.values.map((row: any) => ({ username: row[0], passwordHash: row[1] })) || [];
    const inventory = this.db.exec("SELECT * FROM inventory")[0]?.values.map((row: any) => ({ id: row[0], name: row[1], quantity: row[2], price: row[3], minStock: row[4] })) || [];
    const invoices = this.db.exec("SELECT * FROM invoices")[0]?.values.map((row: any) => ({
      id: row[0], customerName: row[1], vehicle: row[2], vehicleNo: row[3], mobileNo: row[4], km: row[5], date: row[6], items: JSON.parse(row[7]), subTotal: row[8], taxPercent: row[9], discountAmount: row[10], total: row[11], status: row[12]
    })) || [];
    
    const settingsResult = this.db.exec("SELECT * FROM settings")[0]?.values || [];
    const settings = settingsResult.reduce((acc: any, row: any) => {
        acc[row[0]] = JSON.parse(row[1]);
        return acc;
    }, {});

    return { users, inventory, invoices, settings };
  }

  // Write methods
  async addUser(user: User) {
    this.db.run('INSERT INTO users (username, passwordHash) VALUES (?, ?)', [user.username, user.passwordHash]);
  }
  async addInvoice(invoice: Invoice) {
    this.db.run('INSERT INTO invoices (id, customerName, vehicle, vehicleNo, mobileNo, km, date, items, subTotal, taxPercent, discountAmount, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [invoice.id, invoice.customerName, invoice.vehicle, invoice.vehicleNo, invoice.mobileNo, invoice.km, invoice.date, JSON.stringify(invoice.items), invoice.subTotal, invoice.taxPercent, invoice.discountAmount, invoice.total, invoice.status]
    );
  }
  async addInventoryItem(item: InventoryItem) {
    this.db.run('INSERT INTO inventory (id, name, quantity, price, minStock) VALUES (?, ?, ?, ?, ?)', [item.id, item.name, item.quantity, item.price, item.minStock]);
  }
  async updateInventoryItem(item: InventoryItem) {
    this.db.run('UPDATE inventory SET name = ?, quantity = ?, price = ?, minStock = ? WHERE id = ?', [item.name, item.quantity, item.price, item.minStock, item.id]);
  }
  async updateSettings(settings: AppData['settings']) {
     for (const key in settings) {
        this.db.run('UPDATE settings SET value = ? WHERE key = ?', [JSON.stringify((settings as any)[key]), key]);
     }
  }
  async deleteInvoice(id: string) {
    this.db.run('DELETE FROM invoices WHERE id = ?', [id]);
  }
  async updateInvoiceStatus(id: string, status: string) {
    this.db.run('UPDATE invoices SET status = ? WHERE id = ?', [status, id]);
  }
  async deleteInventoryItem(id: string) {
    this.db.run('DELETE FROM inventory WHERE id = ?', [id]);
  }
}
