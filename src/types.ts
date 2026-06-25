export type UserRole = 'admin' | 'manager' | 'cashier';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  active: boolean;
  pin?: string;
}

export interface StoreSettings {
  storeNameAr: string;
  storeNameEn: string;
  vatNumber: string;
  vatRate: number; // e.g., 15 for 15%
  currencyAr: string;
  currencyEn: string;
  addressAr: string;
  addressEn: string;
  phone: string;
  // Invoice Design Customizations
  invoiceTitleAr?: string;
  invoiceTitleEn?: string;
  invoiceFooterAr?: string;
  invoiceFooterEn?: string;
  showQrCode?: boolean;
  showCashierName?: boolean;
  accentColor?: string;
  invoiceFontSize?: 'sm' | 'base' | 'lg';
  invoiceWidth?: number; // width in pixels (e.g. 240 to 350)
  invoicePadding?: 'compact' | 'normal' | 'relaxed';
}

export interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
  barcodes: string[]; // Supports multiple barcodes
  category: string;
  purchasePrice: number;
  salePrice: number;
  taxRate: number; // e.g., 15
  quantity: number;
  minQuantity: number; // For low-stock alerts
  unitAr: string;
  unitEn: string;
}

export interface SaleItem {
  productId: string;
  nameAr: string;
  nameEn: string;
  barcodeUsed: string;
  quantity: number;
  unitPrice: number; // Selling price excluding tax
  taxAmount: number; // Total tax for this item quantity
  total: number; // Total including tax
}

export interface SaleInvoice {
  id: string;
  invoiceNumber: string;
  timestamp: string;
  items: SaleItem[];
  subtotal: number; // Total before tax and discount
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: 'cash' | 'card' | 'bank';
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  isVoided?: boolean;
  notes?: string;
}

export interface PurchaseItem {
  productId: string;
  nameAr: string;
  nameEn: string;
  quantity: number;
  costPrice: number; // Purchase price
  total: number; // quantity * costPrice
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  timestamp: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  grandTotal: number;
  paymentMethod: 'cash' | 'card' | 'bank';
  receivedBy: string; // User who processed
  status: 'received' | 'pending';
}

export interface Customer {
  id: string;
  nameAr: string;
  nameEn: string;
  phone: string;
  email?: string;
  vatNumber?: string;
  balance: number; // customer credit
}

export interface Supplier {
  id: string;
  nameAr: string;
  nameEn: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  vatNumber?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productNameAr: string;
  productNameEn: string;
  type: 'sale' | 'purchase' | 'manual_adjustment' | 'void_sale';
  quantity: number; // Positive for additions, negative for reductions
  timestamp: string;
  referenceId: string; // Invoice ID or adjust memo
  remainingQty: number;
}

export interface BackupLog {
  id: string;
  timestamp: string;
  type: 'auto' | 'manual';
  status: 'success' | 'failed';
  recordCount: {
    products: number;
    sales: number;
    purchases: number;
    customers: number;
    suppliers: number;
  };
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  color?: string; // Optional color accent
}

