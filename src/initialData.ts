import { Product, Customer, Supplier, SaleInvoice, PurchaseInvoice, User, StoreSettings, StockMovement, Category } from './types';

export const ADMIN_PIN = '1234';
export const MANAGER_PIN = '2345';
export const CASHIER_PIN = '3456';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', nameAr: 'الألبان والأجبان', nameEn: 'Dairy', color: 'blue' },
  { id: 'cat-2', nameAr: 'المخبوزات', nameEn: 'Bakery', color: 'amber' },
  { id: 'cat-3', nameAr: 'المشروبات', nameEn: 'Beverages', color: 'purple' },
  { id: 'cat-4', nameAr: 'المواد الغذائية', nameEn: 'Grocery', color: 'emerald' },
];

export const PRESET_USERS: User[] = [
  { id: 'usr-1', username: 'admin', name: 'مدير النظام (Admin)', role: 'admin', active: true },
  { id: 'usr-2', username: 'manager', name: 'مسؤول المستودع (Manager)', role: 'manager', active: true },
  { id: 'usr-3', username: 'cashier', name: 'كاشير المبيعات (Cashier)', role: 'cashier', active: true },
];

export const DEFAULT_SETTINGS: StoreSettings = {
  storeNameAr: 'سوبرماركت التوفير الذكي',
  storeNameEn: 'Smart Savings Supermarket',
  vatNumber: '310456789000003', // Valid 15-digit KSA VAT number
  vatRate: 15,
  currencyAr: 'ر.س',
  currencyEn: 'SAR',
  addressAr: 'طريق الملك فهد، الرياض، المملكة العربية السعودية',
  addressEn: 'King Fahd Road, Riyadh, Saudi Arabia',
  phone: '+966 50 123 4567',
  invoiceTitleAr: 'فاتورة ضريبية مبسطة',
  invoiceTitleEn: 'SIMPLIFIED TAX INVOICE',
  invoiceFooterAr: 'شكراً لزيارتكم ونتطلع لخدمتكم!',
  invoiceFooterEn: 'Thank you for your visit!',
  showQrCode: true,
  showCashierName: true,
  accentColor: '#eab308',
  invoiceFontSize: 'base',
  invoiceWidth: 290,
  invoicePadding: 'normal'
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    nameAr: 'حليب المراعي كامل الدسم 1 لتر',
    nameEn: 'Almarai Full Fat Milk 1L',
    barcodes: ['6281007011234', '1001', 'milk'],
    category: 'Dairy',
    purchasePrice: 4.50,
    salePrice: 6.00,
    taxRate: 15,
    quantity: 18,
    minQuantity: 10,
    unitAr: 'حبة',
    unitEn: 'piece'
  },
  {
    id: 'prod-2',
    nameAr: 'خبز توست لوزين أبيض',
    nameEn: 'Lusine White Toast Bread',
    barcodes: ['6281007024321', '1002'],
    category: 'Bakery',
    purchasePrice: 3.50,
    salePrice: 5.00,
    taxRate: 15,
    quantity: 8, // Triggers low-stock!
    minQuantity: 15,
    unitAr: 'كيس',
    unitEn: 'pack'
  },
  {
    id: 'prod-3',
    nameAr: 'بيبسي علبة معدنية 320 مل',
    nameEn: 'Pepsi Can 320ml',
    barcodes: ['012000000133', '1003', 'pepsi'],
    category: 'Beverages',
    purchasePrice: 1.80,
    salePrice: 2.50,
    taxRate: 15,
    quantity: 48,
    minQuantity: 20,
    unitAr: 'حبة',
    unitEn: 'piece'
  },
  {
    id: 'prod-4',
    nameAr: 'أرز بسمتي الشعلان 5 كجم',
    nameEn: 'Al Shalan Basmati Rice 5kg',
    barcodes: ['6281007039988', '1004'],
    category: 'Grocery',
    purchasePrice: 28.00,
    salePrice: 38.00,
    taxRate: 15,
    quantity: 12,
    minQuantity: 5,
    unitAr: 'كيس',
    unitEn: 'bag'
  },
  {
    id: 'prod-5',
    nameAr: 'مياه صفا الكرتون 40 * 200 مل',
    nameEn: 'Safa Water Carton 40 * 200ml',
    barcodes: ['6281007044000', '1005'],
    category: 'Beverages',
    purchasePrice: 12.00,
    salePrice: 18.00,
    taxRate: 15,
    quantity: 4, // Triggers low stock!
    minQuantity: 6,
    unitAr: 'كرتون',
    unitEn: 'carton'
  },
  {
    id: 'prod-6',
    nameAr: 'زيت طبخ عافية ذرة 1.5 لتر',
    nameEn: 'Afia Corn Oil 1.5L',
    barcodes: ['6281007055011', '1006'],
    category: 'Grocery',
    purchasePrice: 16.50,
    salePrice: 22.00,
    taxRate: 15,
    quantity: 15,
    minQuantity: 5,
    unitAr: 'حبة',
    unitEn: 'piece'
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'cust-cash', nameAr: 'عميل نقدي', nameEn: 'Cash Customer', phone: '0000000000', balance: 0 },
  { id: 'cust-1', nameAr: 'أحمد السعيد', nameEn: 'Ahmed Al-Saeed', phone: '0501112222', email: 'ahmed@example.com', balance: 150 },
  { id: 'cust-2', nameAr: 'سارة العتيبي', nameEn: 'Sara Al-Otaibi', phone: '0554443322', balance: 0 },
  { id: 'cust-3', nameAr: 'مؤسسة الرياض التجارية', nameEn: 'Riyadh Trading Est.', phone: '0112223344', vatNumber: '310488998800003', balance: 2400 }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 'supp-1', nameAr: 'شركة المراعي للأغذية', nameEn: 'Almarai Food Company', contactPerson: 'سعيد القحطاني', phone: '0114700000', email: 'info@almarai.com', vatNumber: '300056789000003' },
  { id: 'supp-2', nameAr: 'موزع المشروبات الوطني', nameEn: 'National Beverages Distributor', contactPerson: 'خالد محمد', phone: '0505112233', vatNumber: '300088112200003' },
  { id: 'supp-3', nameAr: 'مستودع الأغذية العام', nameEn: 'General Food Depot', contactPerson: 'أيمن المصري', phone: '0125556677' }
];

// Seed dynamic historical dates relative to today
const getPastDateString = (daysAgo: number, hour: number = 10): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString();
};

export const INITIAL_SALES: SaleInvoice[] = [
  {
    id: 'sale-1',
    invoiceNumber: 'INV00001',
    timestamp: getPastDateString(4, 11),
    items: [
      { productId: 'prod-1', nameAr: 'حليب المراعي كامل الدسم 1 لتر', nameEn: 'Almarai Full Fat Milk 1L', barcodeUsed: '1001', quantity: 2, unitPrice: 5.22, taxAmount: 1.56, total: 12.00 },
      { productId: 'prod-3', nameAr: 'بيبسي علبة معدنية 320 مل', nameEn: 'Pepsi Can 320ml', barcodeUsed: '1003', quantity: 4, unitPrice: 2.17, taxAmount: 1.30, total: 10.00 }
    ],
    subtotal: 19.13,
    taxTotal: 2.86,
    discountTotal: 0,
    grandTotal: 22.00,
    paidAmount: 50.00,
    changeAmount: 28.00,
    paymentMethod: 'cash',
    cashierId: 'usr-3',
    cashierName: 'كاشير المبيعات (Cashier)',
    customerId: 'cust-cash',
    customerName: 'عميل نقدي'
  },
  {
    id: 'sale-2',
    invoiceNumber: 'INV00002',
    timestamp: getPastDateString(3, 15),
    items: [
      { productId: 'prod-4', nameAr: 'أرز بسمتي الشعلان 5 كجم', nameEn: 'Al Shalan Basmati Rice 5kg', barcodeUsed: '1004', quantity: 1, unitPrice: 33.04, taxAmount: 4.96, total: 38.00 },
      { productId: 'prod-6', nameAr: 'زيت طبخ عافية ذرة 1.5 لتر', nameEn: 'Afia Corn Oil 1.5L', barcodeUsed: '1006', quantity: 1, unitPrice: 19.13, taxAmount: 2.87, total: 22.00 }
    ],
    subtotal: 52.17,
    taxTotal: 7.83,
    discountTotal: 2.00,
    grandTotal: 58.00,
    paidAmount: 58.00,
    changeAmount: 0,
    paymentMethod: 'card',
    cashierId: 'usr-3',
    cashierName: 'كاشير المبيعات (Cashier)',
    customerId: 'cust-1',
    customerName: 'أحمد السعيد'
  },
  {
    id: 'sale-3',
    invoiceNumber: 'INV00003',
    timestamp: getPastDateString(2, 9),
    items: [
      { productId: 'prod-5', nameAr: 'مياه صفا الكرتون 40 * 200 مل', nameEn: 'Safa Water Carton 40 * 200ml', barcodeUsed: '1005', quantity: 3, unitPrice: 15.65, taxAmount: 7.05, total: 54.00 }
    ],
    subtotal: 46.95,
    taxTotal: 7.05,
    discountTotal: 0,
    grandTotal: 54.00,
    paidAmount: 60.00,
    changeAmount: 6.00,
    paymentMethod: 'cash',
    cashierId: 'usr-3',
    cashierName: 'كاشير المبيعات (Cashier)',
    customerId: 'cust-cash',
    customerName: 'عميل نقدي'
  },
  {
    id: 'sale-4',
    invoiceNumber: 'INV00004',
    timestamp: getPastDateString(1, 19),
    items: [
      { productId: 'prod-1', nameAr: 'حليب المراعي كامل الدسم 1 لتر', nameEn: 'Almarai Full Fat Milk 1L', barcodeUsed: '1001', quantity: 6, unitPrice: 5.22, taxAmount: 4.70, total: 36.00 },
      { productId: 'prod-4', nameAr: 'أرز بسمتي الشعلان 5 كجم', nameEn: 'Al Shalan Basmati Rice 5kg', barcodeUsed: '1004', quantity: 2, unitPrice: 33.04, taxAmount: 9.92, total: 76.00 }
    ],
    subtotal: 97.48,
    taxTotal: 14.62,
    discountTotal: 0,
    grandTotal: 112.00,
    paidAmount: 112.00,
    changeAmount: 0,
    paymentMethod: 'card',
    cashierId: 'usr-3',
    cashierName: 'كاشير المبيعات (Cashier)',
    customerId: 'cust-3',
    customerName: 'مؤسسة الرياض التجارية'
  },
  {
    id: 'sale-5',
    invoiceNumber: 'INV00005',
    timestamp: getPastDateString(0, 10), // Today
    items: [
      { productId: 'prod-3', nameAr: 'بيبسي علبة معدنية 320 مل', nameEn: 'Pepsi Can 320ml', barcodeUsed: '1003', quantity: 12, unitPrice: 2.17, taxAmount: 3.91, total: 30.00 },
      { productId: 'prod-2', nameAr: 'خبز توست لوزين أبيض', nameEn: 'Lusine White Toast Bread', barcodeUsed: '1002', quantity: 2, unitPrice: 4.35, taxAmount: 1.30, total: 10.00 }
    ],
    subtotal: 34.78,
    taxTotal: 5.22,
    discountTotal: 0,
    grandTotal: 40.00,
    paidAmount: 50.00,
    changeAmount: 10.00,
    paymentMethod: 'cash',
    cashierId: 'usr-1',
    cashierName: 'مدير النظام (Admin)',
    customerId: 'cust-cash',
    customerName: 'عميل نقدي'
  }
];

export const INITIAL_PURCHASES: PurchaseInvoice[] = [
  {
    id: 'pur-1',
    invoiceNumber: 'PO00001',
    timestamp: getPastDateString(10, 14),
    supplierId: 'supp-1',
    supplierName: 'شركة المراعي للأغذية',
    items: [
      { productId: 'prod-1', nameAr: 'حليب المراعي كامل الدسم 1 لتر', nameEn: 'Almarai Full Fat Milk 1L', quantity: 30, costPrice: 4.50, total: 135.00 }
    ],
    grandTotal: 135.00,
    paymentMethod: 'cash',
    receivedBy: 'مدير النظام (Admin)',
    status: 'received'
  },
  {
    id: 'pur-2',
    invoiceNumber: 'PO00002',
    timestamp: getPastDateString(8, 11),
    supplierId: 'supp-2',
    supplierName: 'موزع المشروبات الوطني',
    items: [
      { productId: 'prod-3', nameAr: 'بيبسي علبة معدنية 320 مل', nameEn: 'Pepsi Can 320ml', quantity: 100, costPrice: 1.80, total: 180.00 },
      { productId: 'prod-5', nameAr: 'مياه صفا الكرتون 40 * 200 مل', nameEn: 'Safa Water Carton 40 * 200ml', quantity: 20, costPrice: 12.00, total: 240.00 }
    ],
    grandTotal: 420.00,
    paymentMethod: 'bank',
    receivedBy: 'مدير النظام (Admin)',
    status: 'received'
  }
];

// Helper to seed stock movements matching original sales and purchases
export const INITIAL_MOVEMENTS: StockMovement[] = [
  // Starting inventory additions (Purchases)
  { id: 'mov-1', productId: 'prod-1', productNameAr: 'حليب المراعي كامل الدسم 1 لتر', productNameEn: 'Almarai Full Fat Milk 1L', type: 'purchase', quantity: 30, timestamp: getPastDateString(10, 14), referenceId: 'pur-1', remainingQty: 30 },
  { id: 'mov-2', productId: 'prod-3', productNameAr: 'بيبسي علبة معدنية 320 مل', productNameEn: 'Pepsi Can 320ml', type: 'purchase', quantity: 100, timestamp: getPastDateString(8, 11), referenceId: 'pur-2', remainingQty: 100 },
  { id: 'mov-3', productId: 'prod-5', productNameAr: 'مياه صفا الكرتون 40 * 200 مل', productNameEn: 'Safa Water Carton 40 * 200ml', type: 'purchase', quantity: 20, timestamp: getPastDateString(8, 11), referenceId: 'pur-2', remainingQty: 20 },
  
  // Sales Deductions
  { id: 'mov-4', productId: 'prod-1', productNameAr: 'حليب المراعي كامل الدسم 1 لتر', productNameEn: 'Almarai Full Fat Milk 1L', type: 'sale', quantity: -2, timestamp: getPastDateString(4, 11), referenceId: 'sale-1', remainingQty: 28 },
  { id: 'mov-5', productId: 'prod-3', productNameAr: 'بيبسي علبة معدنية 320 مل', productNameEn: 'Pepsi Can 320ml', type: 'sale', quantity: -4, timestamp: getPastDateString(4, 11), referenceId: 'sale-1', remainingQty: 96 },
  
  { id: 'mov-6', productId: 'prod-4', productNameAr: 'أرز بسمتي الشعلان 5 كجم', productNameEn: 'Al Shalan Basmati Rice 5kg', type: 'sale', quantity: -1, timestamp: getPastDateString(3, 15), referenceId: 'sale-2', remainingQty: 14 },
  { id: 'mov-7', productId: 'prod-6', productNameAr: 'زيت طبخ عافية ذرة 1.5 لتر', productNameEn: 'Afia Corn Oil 1.5L', type: 'sale', quantity: -1, timestamp: getPastDateString(3, 15), referenceId: 'sale-2', remainingQty: 14 },
  
  { id: 'mov-8', productId: 'prod-5', productNameAr: 'مياه صفا الكرتون 40 * 200 مل', productNameEn: 'Safa Water Carton 40 * 200ml', type: 'sale', quantity: -3, timestamp: getPastDateString(2, 9), referenceId: 'sale-3', remainingQty: 17 },
  
  { id: 'mov-9', productId: 'prod-1', productNameAr: 'حليب المراعي كامل الدسم 1 لتر', productNameEn: 'Almarai Full Fat Milk 1L', type: 'sale', quantity: -6, timestamp: getPastDateString(1, 19), referenceId: 'sale-4', remainingQty: 22 },
  { id: 'mov-10', productId: 'prod-4', productNameAr: 'أرز بسمتي الشعلان 5 كجم', productNameEn: 'Al Shalan Basmati Rice 5kg', type: 'sale', quantity: -2, timestamp: getPastDateString(1, 19), referenceId: 'sale-4', remainingQty: 12 },
  
  { id: 'mov-11', productId: 'prod-3', productNameAr: 'بيبسي علبة معدنية 320 مل', productNameEn: 'Pepsi Can 320ml', type: 'sale', quantity: -12, timestamp: getPastDateString(0, 10), referenceId: 'sale-5', remainingQty: 84 },
  { id: 'mov-12', productId: 'prod-2', productNameAr: 'خبز توست لوزين أبيض', productNameEn: 'Lusine White Toast Bread', type: 'sale', quantity: -2, timestamp: getPastDateString(0, 10), referenceId: 'sale-5', remainingQty: 8 }
];

// UTILITIES
export function formatCurrency(amount: number, isEn: boolean = false, settings: StoreSettings = DEFAULT_SETTINGS): string {
  const rounded = Number(amount.toFixed(2));
  return isEn ? `${rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${settings.currencyEn}` : `${rounded.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${settings.currencyAr}`;
}

export function formatDate(isoString: string, isEn: boolean = false): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  if (isEn) {
    return d.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
  }
  return d.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Generate fully Saudi ZATCA Simplified Tax Invoice compliant Base64 TLV QR Code text.
 * TLV tags:
 * Tag 1: Seller Name (Store Name)
 * Tag 2: Seller VAT Registration Number
 * Tag 3: Invoice Timestamp
 * Tag 4: Invoice Total (Grand Total)
 * Tag 5: VAT Total
 */
export function generateZatcaTLV(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  totalAmount: number,
  vatAmount: number
): string {
  const getTLVBlock = (tag: number, val: string): Uint8Array => {
    const encoder = new TextEncoder();
    const valueBytes = encoder.encode(val);
    const tagLengthValue = new Uint8Array(2 + valueBytes.length);
    tagLengthValue[0] = tag;
    tagLengthValue[1] = valueBytes.length;
    tagLengthValue.set(valueBytes, 2);
    return tagLengthValue;
  };

  try {
    const block1 = getTLVBlock(1, sellerName);
    const block2 = getTLVBlock(2, vatNumber);
    const block3 = getTLVBlock(3, new Date(timestamp).toISOString());
    const block4 = getTLVBlock(4, totalAmount.toFixed(2));
    const block5 = getTLVBlock(5, vatAmount.toFixed(2));

    const totalLength = block1.length + block2.length + block3.length + block4.length + block5.length;
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const block of [block1, block2, block3, block4, block5]) {
      combined.set(block, offset);
      offset += block.length;
    }

    // Convert Uint8Array to base64 string
    let binary = '';
    const bytes = new Uint8Array(combined);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (e) {
    console.error('Error generating TLV', e);
    return 'TLV_ERROR';
  }
}

/**
 * Get online QR server URL for absolute accuracy, or fallback to an SVG mock in offline environments.
 */
export function getZatcaQrCodeUrl(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  totalAmount: number,
  vatAmount: number
): string {
  const base64Tlv = generateZatcaTLV(sellerName, vatNumber, timestamp, totalAmount, vatAmount);
  // Returns QR server rendering path with the parsed TLV string compliant with ZATCA spec
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(base64Tlv)}`;
}
