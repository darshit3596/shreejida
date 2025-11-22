import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { AppData, Invoice, InventoryItem, User } from '../interfaces';
import { DatabaseService } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  // FIX: inject was used without being imported.
  private databaseService = inject(DatabaseService);

  private _appData = signal<AppData>(this.getInitialData());

  isDirty = signal(false);
  
  invoices = computed(() => this._appData().invoices.sort((a, b) => b.id.localeCompare(a.id)));
  inventory = computed(() => this._appData().inventory);
  settings = computed(() => this._appData().settings);
  users = computed(() => this._appData().users);

  nextInvoiceNumber = computed(() => {
    const counter = this.settings()?.invoiceCounter ?? 1;
    return `SJM${String(counter).padStart(7, '0')}`;
  });

  constructor() {}

  async initFromDb(): Promise<void> {
    const data = await this.databaseService.loadAllData();
    this._appData.set(data);
    this.isDirty.set(false);
  }

  private getInitialData(): AppData {
    return {
      users: [],
      invoices: [],
      inventory: [],
      settings: {
        invoiceCounter: 1,
        shopName: 'My Shop',
        tagLine: 'Quality Products',
        address: '123 Main St',
        signatory: 'Authorized Signatory',
        term1: '',
        term2: '',
        term3: '',
      }
    };
  }

  // User Management
  async getUsers(): Promise<User[]> {
    return this.users();
  }

  async addUser(user: User) {
    await this.databaseService.addUser(user);
    this._appData.update(data => ({
      ...data,
      users: [...data.users, user]
    }));
    this.isDirty.set(true);
  }


  // Invoice Management
  async addInvoice(invoice: Omit<Invoice, 'id'>): Promise<string> {
    const newInvoice: Invoice = {
      ...invoice,
      id: this.nextInvoiceNumber()
    };
    
    await this.databaseService.addInvoice(newInvoice);

    // Update inventory
    for (const item of newInvoice.items) {
      const inventoryItem = this.inventory().find(i => i.name === item.description);
      if (inventoryItem && inventoryItem.quantity !== -1) {
        inventoryItem.quantity -= item.quantity;
        await this.databaseService.updateInventoryItem(inventoryItem);
      }
    }
    
    const newSettings = { 
      ...this.settings()!, 
      invoiceCounter: this.settings()!.invoiceCounter + 1 
    };
    await this.databaseService.updateSettings(newSettings);

    this._appData.update(data => {
      return {
        ...data,
        invoices: [newInvoice, ...data.invoices],
        inventory: [...data.inventory], // trigger update
        settings: newSettings,
      };
    });

    this.isDirty.set(true);
    return newInvoice.id;
  }

  async deleteInvoice(invoiceId: string) {
    await this.databaseService.deleteInvoice(invoiceId);
    this._appData.update(data => ({
      ...data,
      invoices: data.invoices.filter(inv => inv.id !== invoiceId)
    }));
    this.isDirty.set(true);
  }
  
  async updateInvoiceStatus(invoiceId: string, status: 'Paid' | 'Unpaid') {
    await this.databaseService.updateInvoiceStatus(invoiceId, status);
    this._appData.update(data => ({
      ...data,
      invoices: data.invoices.map(inv =>
        inv.id === invoiceId ? { ...inv, status } : inv
      )
    }));
    this.isDirty.set(true);
  }

  getInvoiceById(id: string): Invoice | undefined {
    return this.invoices().find(inv => inv.id === id);
  }

  // Inventory Management
  async addInventoryItem(item: Omit<InventoryItem, 'id'>) {
    const newItem: InventoryItem = { ...item, id: new Date().toISOString() + Math.random() };
    await this.databaseService.addInventoryItem(newItem);
    this._appData.update(data => ({
      ...data,
      inventory: [...data.inventory, newItem]
    }));
    this.isDirty.set(true);
  }

  async updateInventoryItem(updatedItem: InventoryItem) {
    await this.databaseService.updateInventoryItem(updatedItem);
    this._appData.update(data => ({
      ...data,
      inventory: data.inventory.map(item => item.id === updatedItem.id ? updatedItem : item)
    }));
    this.isDirty.set(true);
  }

  async deleteInventoryItem(itemId: string) {
    await this.databaseService.deleteInventoryItem(itemId);
    this._appData.update(data => ({
      ...data,
      inventory: data.inventory.filter(item => item.id !== itemId)
    }));
    this.isDirty.set(true);
  }

  // Settings Management
  async updateSettings(newSettings: Partial<AppData['settings']>) {
    const updatedSettings = { ...this.settings()!, ...newSettings };
    await this.databaseService.updateSettings(updatedSettings);
    this._appData.update(data => ({
      ...data,
      settings: updatedSettings
    }));
    this.isDirty.set(true);
  }
}