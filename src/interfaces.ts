
export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  customerName: string;
  vehicle: string;
  vehicleNo: string;
  mobileNo: string;
  km: string;
  date: string;
  items: InvoiceItem[];
  subTotal: number;
  taxPercent: number;
  discountAmount: number;
  total: number;
  status: 'Paid' | 'Unpaid';
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number; // -1 for infinite
  price: number;
  minStock: number;
}

export interface User {
  username: string;
  passwordHash: string; // Store hashed passwords, not plain text
}

export interface AppData {
  users: User[];
  invoices: Invoice[];
  inventory: InventoryItem[];
  settings: {
    invoiceCounter: number;
    shopName: string;
    tagLine: string;
    address: string;
    signatory: string;
    term1: string;
    term2: string;
    term3: string;
  };
}
