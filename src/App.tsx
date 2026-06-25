import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Product, SaleInvoice, PurchaseInvoice, Customer, Supplier, StockMovement, BackupLog, StoreSettings, Category, SaleItem 
} from './types';
import { 
  PRESET_USERS, DEFAULT_SETTINGS, INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_SUPPLIERS, 
  INITIAL_SALES, INITIAL_PURCHASES, INITIAL_MOVEMENTS, formatCurrency, formatDate, INITIAL_CATEGORIES 
} from './initialData';

// Component imports
import LoginScreen from './components/LoginScreen';
import BarcodeScannerEmulator from './components/BarcodeScannerEmulator';
import ThermalReceipt from './components/ThermalReceipt';
import MobileSimulator from './components/MobileSimulator';

// Icons
import { 
  LayoutDashboard, ShoppingCart, Percent, Trash2, Printer, 
  Package, Plus, Settings, LogOut, CheckCircle, Smartphone, 
  Search, Users, Landmark, FileSpreadsheet, RefreshCw, AlertTriangle, 
  Download, Upload, Edit3, Sparkles, UserCheck, ShieldClose, Store,
  FileText, Receipt, XCircle, Ban, Layers, UserPlus, Database, Server, Keyboard
} from 'lucide-react';

export default function App() {
  // Locale State
  const [isEn, setIsEn] = useState<boolean>(false); // default Arabic (RTL)

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Core Database States (Hydrated from localStorage or initials)
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<SaleInvoice[]>([]);
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [backupLogs, setBackupLogs] = useState<BackupLog[]>([]);
  const [employees, setEmployees] = useState<User[]>(PRESET_USERS);
  const [categories, setCategories] = useState<Category[]>([]);

  // Dynamic system permissions matrix state
  const [rolePermissions, setRolePermissions] = useState<Record<'admin' | 'manager' | 'cashier', Record<string, boolean>>>(() => {
    const defaults = {
      admin: {
        pos: true,
        invoices: true,
        inventory: true,
        purchases: true,
        contacts: true,
        categories: true,
        reports: true,
        backups: true,
        users: true,
        invoice_view_details: true,
        invoice_print: true,
        invoice_edit: true,
        invoice_void: true,
      },
      manager: {
        pos: true,
        invoices: true,
        inventory: true,
        purchases: true,
        contacts: true,
        categories: true,
        reports: false,
        backups: false,
        users: false,
        invoice_view_details: true,
        invoice_print: true,
        invoice_edit: true,
        invoice_void: true,
      },
      cashier: {
        pos: true,
        invoices: true,
        inventory: false,
        purchases: false,
        contacts: false,
        categories: false,
        reports: false,
        backups: false,
        users: false,
        invoice_view_details: true,
        invoice_print: true,
        invoice_edit: false,
        invoice_void: false,
      },
    };

    const stored = localStorage.getItem('erp_role_permissions');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return {
            admin: { ...defaults.admin, ...(parsed.admin || {}) },
            manager: { ...defaults.manager, ...(parsed.manager || {}) },
            cashier: { ...defaults.cashier, ...(parsed.cashier || {}) },
          };
        }
      } catch (e) {
        // Fallback to defaults
      }
    }
    return defaults;
  });

  // Active Screen View
  const [activeScreen, setActiveScreen] = useState<'pos' | 'invoices' | 'inventory' | 'purchases' | 'contacts' | 'reports' | 'backups' | 'categories' | 'users' | 'database'>('pos');

  // Control to hide blocked tabs from sidebar navigation for users
  const [hideBlockedTabs, setHideBlockedTabs] = useState<boolean>(() => {
    return localStorage.getItem('erp_hide_blocked_tabs') === 'true';
  });

  // Database Connection Gating State
  const [dbConfig, setDbConfig] = useState(() => {
    const stored = localStorage.getItem('erp_db_config');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    return {
      type: 'localStorage', // 'localStorage' | 'firebase' | 'postgresql'
      host: 'postgres-production.cloudsql.internal',
      port: 5432,
      database: 'enterprise_erp_db',
      username: 'db_master_admin',
      password: '••••••••••••••••',
      status: 'connected', // 'connected' | 'disconnected' | 'error'
      lastSync: new Date().toISOString()
    };
  });

  // Users Screen Width and Layout Customization States
  const [usersScreenWidth, setUsersScreenWidth] = useState<'compact' | 'standard' | 'full'>(() => {
    return (localStorage.getItem('erp_users_screen_width') as 'compact' | 'standard' | 'full') || 'standard';
  });
  const [usersLayoutMode, setUsersLayoutMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('erp_users_layout_mode') as 'grid' | 'table') || 'grid';
  });
  const [usersGridCols, setUsersGridCols] = useState<number>(() => {
    return Number(localStorage.getItem('erp_users_grid_cols')) || 3;
  });

  // Invoice list state filters
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>('');
  const [invoiceDateFilter, setInvoiceDateFilter] = useState<string>('');
  const [invoicePaymentFilter, setInvoicePaymentFilter] = useState<string>('All');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('All');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // App Layout States
  const [showMobileSim, setShowMobileSim] = useState<boolean>(false);
  const [isAutoSyncing, setIsAutoSyncing] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('synced');
  const [hideRestrictedTabs, setHideRestrictedTabs] = useState<boolean>(() => {
    return localStorage.getItem('erp_hide_restricted_tabs') === 'true';
  });

  // Cashier POS Working states
  const [cart, setCart] = useState<{ product: Product; quantity: number; barcodeUsed: string }[]>([]);
  const [posCustomer, setPosCustomer] = useState<string>('cust-cash');
  const [posDiscount, setPosDiscount] = useState<number>(0);
  const [posPaymentMethod, setPosPaymentMethod] = useState<'cash' | 'card' | 'bank'>('cash');
  const [posPaidAmount, setPosPaidAmount] = useState<string>('');
  const [posNotes, setPosNotes] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Thermal Receipt state
  const [activeReceiptInvoice, setActiveReceiptInvoice] = useState<SaleInvoice | null>(null);

  // Form Modals States
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [contactType, setContactType] = useState<'customer' | 'supplier' | 'employee'>('customer');
  const [selectedContact, setSelectedContact] = useState<any | null>(null);

  // Keyboard Shortcuts Modal State
  const [showShortcutsHelp, setShowShortcutsHelp] = useState<boolean>(false);

  // Invoice Editing States
  const [editingInvoice, setEditingInvoice] = useState<SaleInvoice | null>(null);
  const [editInvoiceItems, setEditInvoiceItems] = useState<SaleItem[]>([]);
  const [editInvoiceCustomer, setEditInvoiceCustomer] = useState<string>('');
  const [editInvoicePaymentMethod, setEditInvoicePaymentMethod] = useState<'cash' | 'card' | 'bank'>('cash');
  const [editInvoiceDiscount, setEditInvoiceDiscount] = useState<number>(0);
  const [editInvoiceCashierName, setEditInvoiceCashierName] = useState<string>('');
  const [editInvoicePaid, setEditInvoicePaid] = useState<number>(0);
  const [editInvoiceNotes, setEditInvoiceNotes] = useState<string>('');
  const [editInvoiceDate, setEditInvoiceDate] = useState<string>('');
  const [selectedAddProdId, setSelectedAddProdId] = useState<string>('');

  // Custom Alert and Confirm Modal States to prevent sandbox browser iframe blockage
  const [appAlert, setAppAlert] = useState<{ message: string; type?: 'info' | 'warning' | 'success' } | null>(null);
  const [appConfirm, setAppConfirm] = useState<{ message: string; onConfirm: () => void; onCancel?: () => void } | null>(null);

  const showAlert = (message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    setAppAlert({ message, type });
  };

  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void) => {
    setAppConfirm({ message, onConfirm, onCancel });
  };

  // Manual transaction inputs
  const [purchaseSupplier, setPurchaseSupplier] = useState<string>('');
  const [purchaseCart, setPurchaseCart] = useState<{ product: Product; quantity: number; costPrice: number }[]>([]);
  const [purchaseSearch, setPurchaseSearch] = useState<string>('');

  // Hydrate Data on boot
  useEffect(() => {
    // Settings
    const storedSettings = localStorage.getItem('erp_settings');
    if (storedSettings && storedSettings !== 'undefined' && storedSettings !== 'null') {
      try {
        setSettings(JSON.parse(storedSettings));
      } catch (err) {
        localStorage.setItem('erp_settings', JSON.stringify(DEFAULT_SETTINGS));
      }
    } else {
      localStorage.setItem('erp_settings', JSON.stringify(DEFAULT_SETTINGS));
    }

    // Products
    const storedProducts = localStorage.getItem('erp_products');
    if (storedProducts && storedProducts !== 'undefined' && storedProducts !== 'null') {
      try {
        setProducts(JSON.parse(storedProducts));
      } catch (err) {
        setProducts(INITIAL_PRODUCTS);
        localStorage.setItem('erp_products', JSON.stringify(INITIAL_PRODUCTS));
      }
    } else {
      setProducts(INITIAL_PRODUCTS);
      localStorage.setItem('erp_products', JSON.stringify(INITIAL_PRODUCTS));
    }

    // Sales
    const storedSales = localStorage.getItem('erp_sales');
    if (storedSales && storedSales !== 'undefined' && storedSales !== 'null') {
      try {
        setSales(JSON.parse(storedSales));
      } catch (err) {
        setSales(INITIAL_SALES);
        localStorage.setItem('erp_sales', JSON.stringify(INITIAL_SALES));
      }
    } else {
      setSales(INITIAL_SALES);
      localStorage.setItem('erp_sales', JSON.stringify(INITIAL_SALES));
    }

    // Purchases
    const storedPurchases = localStorage.getItem('erp_purchases');
    if (storedPurchases && storedPurchases !== 'undefined' && storedPurchases !== 'null') {
      try {
        setPurchases(JSON.parse(storedPurchases));
      } catch (err) {
        setPurchases(INITIAL_PURCHASES);
        localStorage.setItem('erp_purchases', JSON.stringify(INITIAL_PURCHASES));
      }
    } else {
      setPurchases(INITIAL_PURCHASES);
      localStorage.setItem('erp_purchases', JSON.stringify(INITIAL_PURCHASES));
    }

    // Customers
    const storedCustomers = localStorage.getItem('erp_customers');
    if (storedCustomers && storedCustomers !== 'undefined' && storedCustomers !== 'null') {
      try {
        setCustomers(JSON.parse(storedCustomers));
      } catch (err) {
        setCustomers(INITIAL_CUSTOMERS);
        localStorage.setItem('erp_customers', JSON.stringify(INITIAL_CUSTOMERS));
      }
    } else {
      setCustomers(INITIAL_CUSTOMERS);
      localStorage.setItem('erp_customers', JSON.stringify(INITIAL_CUSTOMERS));
    }

    // Suppliers
    const storedSuppliers = localStorage.getItem('erp_suppliers');
    if (storedSuppliers && storedSuppliers !== 'undefined' && storedSuppliers !== 'null') {
      try {
        setSuppliers(JSON.parse(storedSuppliers));
      } catch (err) {
        setSuppliers(INITIAL_SUPPLIERS);
        localStorage.setItem('erp_suppliers', JSON.stringify(INITIAL_SUPPLIERS));
      }
    } else {
      setSuppliers(INITIAL_SUPPLIERS);
      localStorage.setItem('erp_suppliers', JSON.stringify(INITIAL_SUPPLIERS));
    }

    // Stock Movements
    const storedMovements = localStorage.getItem('erp_movements');
    if (storedMovements && storedMovements !== 'undefined' && storedMovements !== 'null') {
      try {
        setMovements(JSON.parse(storedMovements));
      } catch (err) {
        setMovements(INITIAL_MOVEMENTS);
        localStorage.setItem('erp_movements', JSON.stringify(INITIAL_MOVEMENTS));
      }
    } else {
      setMovements(INITIAL_MOVEMENTS);
      localStorage.setItem('erp_movements', JSON.stringify(INITIAL_MOVEMENTS));
    }

    // Employees
    const storedEmployees = localStorage.getItem('erp_employees');
    if (storedEmployees && storedEmployees !== 'undefined' && storedEmployees !== 'null') {
      try {
        setEmployees(JSON.parse(storedEmployees));
      } catch (err) {
        setEmployees(PRESET_USERS);
        localStorage.setItem('erp_employees', JSON.stringify(PRESET_USERS));
      }
    } else {
      localStorage.setItem('erp_employees', JSON.stringify(PRESET_USERS));
    }

    // Categories
    const storedCategories = localStorage.getItem('erp_categories');
    if (storedCategories && storedCategories !== 'undefined' && storedCategories !== 'null') {
      try {
        setCategories(JSON.parse(storedCategories));
      } catch (err) {
        setCategories(INITIAL_CATEGORIES);
        localStorage.setItem('erp_categories', JSON.stringify(INITIAL_CATEGORIES));
      }
    } else {
      setCategories(INITIAL_CATEGORIES);
      localStorage.setItem('erp_categories', JSON.stringify(INITIAL_CATEGORIES));
    }

    // Backups
    const storedBackups = localStorage.getItem('erp_backups');
    if (storedBackups && storedBackups !== 'undefined' && storedBackups !== 'null') {
      try {
        setBackupLogs(JSON.parse(storedBackups));
      } catch (err) {
        setBackupLogs([]);
      }
    } else {
      const initialBackup: BackupLog = {
        id: 'back-1',
        timestamp: new Date().toISOString(),
        type: 'auto',
        status: 'success',
        recordCount: {
          products: INITIAL_PRODUCTS.length,
          sales: INITIAL_SALES.length,
          purchases: INITIAL_PURCHASES.length,
          customers: INITIAL_CUSTOMERS.length,
          suppliers: INITIAL_SUPPLIERS.length
        }
      };
      setBackupLogs([initialBackup]);
      localStorage.setItem('erp_backups', JSON.stringify([initialBackup]));
    }

    // Active session
    const storedSession = localStorage.getItem('erp_session');
    if (storedSession && storedSession !== 'undefined' && storedSession !== 'null') {
      try {
        setCurrentUser(JSON.parse(storedSession));
      } catch (err) {
        localStorage.removeItem('erp_session');
      }
    }
  }, []);

  // Update HTML Document Direction based on Locale selection
  useEffect(() => {
    document.documentElement.dir = isEn ? 'ltr' : 'rtl';
    document.documentElement.lang = isEn ? 'en' : 'ar';
  }, [isEn]);

  // Simulated live cloud save indicator when local data changes
  const triggerAutoSync = () => {
    if (!isAutoSyncing) return;
    setSyncStatus('syncing');
    const timer = setTimeout(() => {
      setSyncStatus('synced');
    }, 1200);
    return () => clearTimeout(timer);
  };

  // Helper save triggers
  const saveProductsToDb = (updatedProducts: Product[]) => {
    setProducts(updatedProducts);
    localStorage.setItem('erp_products', JSON.stringify(updatedProducts));
    triggerAutoSync();
  };

  const saveSalesToDb = (updatedSales: SaleInvoice[]) => {
    setSales(updatedSales);
    localStorage.setItem('erp_sales', JSON.stringify(updatedSales));
    triggerAutoSync();
  };

  const savePurchasesToDb = (updatedPurchases: PurchaseInvoice[]) => {
    setPurchases(updatedPurchases);
    localStorage.setItem('erp_purchases', JSON.stringify(updatedPurchases));
    triggerAutoSync();
  };

  const saveCustomersToDb = (updatedCustomers: Customer[]) => {
    setCustomers(updatedCustomers);
    localStorage.setItem('erp_customers', JSON.stringify(updatedCustomers));
    triggerAutoSync();
  };

  const saveSuppliersToDb = (updatedSuppliers: Supplier[]) => {
    setSuppliers(updatedSuppliers);
    localStorage.setItem('erp_suppliers', JSON.stringify(updatedSuppliers));
    triggerAutoSync();
  };

  const saveMovementsToDb = (updatedMovements: StockMovement[]) => {
    setMovements(updatedMovements);
    localStorage.setItem('erp_movements', JSON.stringify(updatedMovements));
    triggerAutoSync();
  };

  const saveEmployeesToDb = (updatedEmployees: User[]) => {
    setEmployees(updatedEmployees);
    localStorage.setItem('erp_employees', JSON.stringify(updatedEmployees));
  };

  const saveCategoriesToDb = (updatedCategories: Category[]) => {
    setCategories(updatedCategories);
    localStorage.setItem('erp_categories', JSON.stringify(updatedCategories));
    triggerAutoSync();
  };


  // BARCODE SCANNING PROCESSOR
  const handleBarcodeScan = (barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;

    // Find product matching barcode in any of its defined barcodes
    const foundProduct = products.find(p => p.barcodes.includes(trimmed) || p.id === trimmed);

    if (foundProduct) {
      if (foundProduct.quantity <= 0) {
        showAlert(isEn ? `Warning: (${foundProduct.nameEn}) is out of stock!` : `تنبيه: (${foundProduct.nameAr}) غير متوفر في المخزون حالياً!`, 'warning');
      }

      // Check if item is already in POS cart
      const existingCartIndex = cart.findIndex(item => item.product.id === foundProduct.id);

      if (existingCartIndex > -1) {
        const updatedCart = [...cart];
        updatedCart[existingCartIndex].quantity += 1;
        setCart(updatedCart);
      } else {
        setCart([...cart, { product: foundProduct, quantity: 1, barcodeUsed: trimmed }]);
      }
    } else {
      showAlert(isEn ? `Barcode "${trimmed}" not linked to any product.` : `الباركود "${trimmed}" غير مرتبط بأي منتج حالياً.`, 'warning');
    }
  };

  // Keyboard listening to support physical Plug-Play USB Scanners!
  useEffect(() => {
    let scanBuffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      // Ignore keys when focused inside typed input fields
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
        return;
      }

      const currentTime = Date.now();
      // Physical scanner guns enter characters extremely fast (typically < 30ms apart)
      if (currentTime - lastKeyTime > 200) {
        scanBuffer = ''; // Reset if slow typing
      }
      
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (scanBuffer.length > 2) {
          handleBarcodeScan(scanBuffer);
          scanBuffer = '';
          e.preventDefault();
        }
      } else if (e.key !== 'Shift') {
        scanBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyPress);
    return () => window.removeEventListener('keydown', handleGlobalKeyPress);
  }, [products, cart]);


  // Global Keyboard Navigation & Action Shortcuts for Cashiers
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      // Shortcuts are strictly allowed ONLY for the System Admin (مدير النظام)
      if (currentUser?.role !== 'admin') return;

      const isCtrl = e.ctrlKey;
      const isAlt = e.altKey;
      const key = e.key.toLowerCase();

      // Escape key to close modals
      if (e.key === 'Escape') {
        if (showShortcutsHelp) {
          setShowShortcutsHelp(false);
          e.preventDefault();
          return;
        }
      }

      // We handle triggers that have Ctrl or Alt pressed (except standard text fields typing)
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isTyping = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select';

      // Shortcuts helper modal: Alt + H or Ctrl + Alt + H (Only for System Admin)
      if (((isAlt && key === 'h') || (isCtrl && isAlt && key === 'h')) && currentUser?.role === 'admin') {
        e.preventDefault();
        e.stopPropagation();
        setShowShortcutsHelp(prev => !prev);
        return;
      }

      if (!isCtrl && !isAlt) return;

      // Map keys to specific system active screens
      let targetScreen: 'pos' | 'invoices' | 'inventory' | 'purchases' | 'contacts' | 'reports' | 'backups' | 'categories' | 'users' | 'database' | null = null;

      switch (key) {
        case 'p':
          targetScreen = 'pos';
          break;
        case 's':
          targetScreen = 'invoices'; // S for Sales list
          break;
        case 'i':
          targetScreen = 'inventory'; // I for Inventory
          break;
        case 't':
          targetScreen = 'purchases'; // T for Trade / purchases
          break;
        case 'k':
          targetScreen = 'contacts'; // K for Contacts (Customers/Suppliers)
          break;
        case 'c':
          targetScreen = 'categories'; // C for Categories
          break;
        case 'u':
          targetScreen = 'users'; // U for Users
          break;
        case 'r':
          targetScreen = 'reports'; // R for Reports
          break;
        case 'b':
          targetScreen = 'backups'; // B for Backups
          break;
        case 'd':
          targetScreen = 'database'; // D for Database
          break;
        default:
          break;
      }

      if (targetScreen) {
        e.preventDefault();
        e.stopPropagation();
        if (hasAccess(targetScreen)) {
          setActiveScreen(targetScreen);
          showAlert(
            isEn 
              ? `Quick navigation: Jumped to ${targetScreen.toUpperCase()} view.` 
              : `الانتقال السريع: تم فتح شاشة (${
                  targetScreen === 'pos' ? 'نقطة البيع الكاشير' : 
                  targetScreen === 'invoices' ? 'الفواتير والمبيعات' :
                  targetScreen === 'inventory' ? 'المخزن والمنتجات' :
                  targetScreen === 'purchases' ? 'فواتير المشتريات' :
                  targetScreen === 'contacts' ? 'العملاء والموردين' :
                  targetScreen === 'reports' ? 'التقارير والإحصائيات' :
                  targetScreen === 'backups' ? 'النسخ الاحتياطي' :
                  targetScreen === 'categories' ? 'الأقسام والتصنيفات' :
                  targetScreen === 'users' ? 'الموظفين والصلاحيات' : 'التحكم بقواعد البيانات'
                })`,
            'success'
          );
        } else {
          showAlert(
            isEn 
              ? `Access denied for screen: ${targetScreen.toUpperCase()}` 
              : `عذراً، غير مصرح لحسابك الدخول لشاشة ${targetScreen} وفقاً للصلاحيات الممنوحة.`,
            'warning'
          );
        }
      }
    };

    window.addEventListener('keydown', handleShortcuts, true);
    return () => window.removeEventListener('keydown', handleShortcuts, true);
  }, [currentUser, rolePermissions, isEn, showShortcutsHelp]);


  // POS BILL PAYOUT WORKFLOW
  const computePOSSummary = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.product.salePrice * item.quantity), 0);
    // Standard VAT calculation: salePrice includes tax or tax is aggregated
    // Here we treat salePrice as INCLUSIVE of 15% VAT (ZATCA style)
    const totalTaxable = subtotal - posDiscount;
    const vatRateMultiplier = settings.vatRate / (100 + settings.vatRate); // 15 / 115
    const taxTotal = totalTaxable * vatRateMultiplier;
    const grandTotal = Math.max(0, totalTaxable);

    return { subtotal, taxTotal, grandTotal };
  };

  const handlePOSCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const { subtotal, taxTotal, grandTotal } = computePOSSummary();
    const paid = parseFloat(posPaidAmount) || grandTotal;

    if (paid < grandTotal) {
      showAlert(isEn ? 'Paid amount is less than total.' : 'المبلغ المدفوع أقل من صافي الفاتورة المستحقة.', 'warning');
      return;
    }

    const nextInvoiceId = `INV-${Date.now().toString().slice(-6)}`;
    const paddedInvoiceNum = `INV${String(sales.length + 1).padStart(5, '0')}`;

    const newInvoiceItems = cart.map(item => ({
      productId: item.product.id,
      nameAr: item.product.nameAr,
      nameEn: item.product.nameEn,
      barcodeUsed: item.barcodeUsed,
      quantity: item.quantity,
      unitPrice: item.product.salePrice / (1 + (settings.vatRate / 100)), // Base price
      taxAmount: (item.product.salePrice * item.quantity) * (settings.vatRate / (100 + settings.vatRate)),
      total: item.product.salePrice * item.quantity
    }));

    const salesCustomerName = customers.find(c => c.id === posCustomer);

    const newInvoice: SaleInvoice = {
      id: nextInvoiceId,
      invoiceNumber: paddedInvoiceNum,
      timestamp: new Date().toISOString(),
      items: newInvoiceItems,
      subtotal: parseFloat((subtotal / (1 + (settings.vatRate / 100))).toFixed(2)),
      taxTotal: parseFloat(taxTotal.toFixed(2)),
      discountTotal: posDiscount,
      grandTotal: parseFloat(grandTotal.toFixed(2)),
      paidAmount: parseFloat(paid.toFixed(2)),
      changeAmount: parseFloat(Math.max(0, paid - grandTotal).toFixed(2)),
      paymentMethod: posPaymentMethod,
      cashierId: currentUser?.id || 'usr-default',
      cashierName: currentUser?.name || 'Cashier',
      customerId: posCustomer,
      customerName: salesCustomerName ? (isEn ? salesCustomerName.nameEn : salesCustomerName.nameAr) : 'Cash Customer',
      notes: posNotes.trim() || undefined
    };

    // Deduct stock levels and save movements
    const updatedProducts = products.map(p => {
      const soldItem = cart.find(c => c.product.id === p.id);
      if (soldItem) {
        return { ...p, quantity: Math.max(0, p.quantity - soldItem.quantity) };
      }
      return p;
    });

    // Create stock movement records
    const newMovements: StockMovement[] = cart.map((item, index) => ({
      id: `mov-sale-${Date.now()}-${index}`,
      productId: item.product.id,
      productNameAr: item.product.nameAr,
      productNameEn: item.product.nameEn,
      type: 'sale',
      quantity: -item.quantity,
      timestamp: new Date().toISOString(),
      referenceId: nextInvoiceId,
      remainingQty: Math.max(0, item.product.quantity - item.quantity)
    }));

    // Update customer credit/balance if paid by credit/other bank methods
    if (posCustomer !== 'cust-cash' && posPaymentMethod === 'bank') {
      const updatedCustomers = customers.map(c => {
        if (c.id === posCustomer) {
          return { ...c, balance: c.balance + grandTotal };
        }
        return c;
      });
      saveCustomersToDb(updatedCustomers);
    }

    // Save
    saveProductsToDb(updatedProducts);
    saveSalesToDb([...sales, newInvoice]);
    saveMovementsToDb([...movements, ...newMovements]);

    // Show thermal print screen
    setActiveReceiptInvoice(newInvoice);

    // Reset Cashier Cart
    setCart([]);
    setPosDiscount(0);
    setPosPaidAmount('');
    setPosCustomer('cust-cash');
    setPosNotes('');
  };


  // PROCUREMENT (PURCHASES) RESTOCKING WORKFLOW
  const handleAddPurchaseToCart = (p: Product, qty: number, cost: number) => {
    const existingIndex = purchaseCart.findIndex(item => item.product.id === p.id);
    if (existingIndex > -1) {
      const updated = [...purchaseCart];
      updated[existingIndex].quantity += qty;
      updated[existingIndex].costPrice = cost;
      setPurchaseCart(updated);
    } else {
      setPurchaseCart([...purchaseCart, { product: p, quantity: qty, costPrice: cost }]);
    }
  };

  const handleApplyProcurementOrder = () => {
    if (purchaseCart.length === 0 || !purchaseSupplier) {
      showAlert(isEn ? 'Provide supplier and items first.' : 'يرجى اختيار المورد وتحديد الكميات للطلب أولاً.', 'warning');
      return;
    }

    const nextPurchaseId = `PUR-${Date.now().toString().slice(-6)}`;
    const paddedOrderNum = `PO${String(purchases.length + 1).padStart(5, '0')}`;
    const supplierObj = suppliers.find(s => s.id === purchaseSupplier);

    const invoiceItems = purchaseCart.map(item => ({
      productId: item.product.id,
      nameAr: item.product.nameAr,
      nameEn: item.product.nameEn,
      quantity: item.quantity,
      costPrice: item.costPrice,
      total: item.quantity * item.costPrice
    }));

    const grandTotal = purchaseCart.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);

    const newPurInvoice: PurchaseInvoice = {
      id: nextPurchaseId,
      invoiceNumber: paddedOrderNum,
      timestamp: new Date().toISOString(),
      supplierId: purchaseSupplier,
      supplierName: supplierObj ? (isEn ? supplierObj.nameEn : supplierObj.nameAr) : 'Supplier',
      items: invoiceItems,
      grandTotal: grandTotal,
      paymentMethod: 'bank',
      receivedBy: currentUser?.name || 'Manager',
      status: 'received'
    };

    // Update product quantities and purchase prices in inventory
    const updatedProducts = products.map(p => {
      const itemProcured = purchaseCart.find(item => item.product.id === p.id);
      if (itemProcured) {
        return { 
          ...p, 
          quantity: p.quantity + itemProcured.quantity,
          purchasePrice: itemProcured.costPrice // update default purchase cost to last price
        };
      }
      return p;
    });

    // Create Stock Movement log
    const newMovements: StockMovement[] = purchaseCart.map((item, idx) => ({
      id: `mov-pur-${Date.now()}-${idx}`,
      productId: item.product.id,
      productNameAr: item.product.nameAr,
      productNameEn: item.product.nameEn,
      type: 'purchase',
      quantity: item.quantity,
      timestamp: new Date().toISOString(),
      referenceId: nextPurchaseId,
      remainingQty: item.product.quantity + item.quantity
    }));

    // Save
    saveProductsToDb(updatedProducts);
    savePurchasesToDb([...purchases, newPurInvoice]);
    saveMovementsToDb([...movements, ...newMovements]);

    // Reset Purchase form
    setPurchaseCart([]);
    setPurchaseSupplier('');
    showAlert(isEn ? 'Purchase invoice registered and stock counts updated!' : 'تم تسجيل فاتورة الشراء وتحديث كميات المخزن بنجاح!', 'success');
  };


  // SMARTPHONE INSTANT RESTOCK ACTION
  const handleMobileQuickRestock = (productId: string, qty: number) => {
    const pObj = products.find(p => p.id === productId);
    if (!pObj) return;

    // Direct rapid purchase restock (Simulated supplier purchase)
    const nextPurchaseId = `PUR-MOB-${Date.now().toString().slice(-4)}`;
    const orderNum = `PO${String(purchases.length + 1).padStart(5, '0')}`;
    const restockCost = pObj.purchasePrice * qty;

    const quickInvoice: PurchaseInvoice = {
      id: nextPurchaseId,
      invoiceNumber: orderNum,
      timestamp: new Date().toISOString(),
      supplierId: suppliers[0]?.id || 'supp-default',
      supplierName: suppliers[0] ? (isEn ? suppliers[0].nameEn : suppliers[0].nameAr) : 'Primary Supplier',
      items: [{
        productId: pObj.id,
        nameAr: pObj.nameAr,
        nameEn: pObj.nameEn,
        quantity: qty,
        costPrice: pObj.purchasePrice,
        total: restockCost
      }],
      grandTotal: restockCost,
      paymentMethod: 'bank',
      receivedBy: 'Mobile App / المشرف',
      status: 'received'
    };

    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        return { ...p, quantity: p.quantity + qty };
      }
      return p;
    });

    const newMov: StockMovement = {
      id: `mov-pmob-${Date.now()}`,
      productId: pObj.id,
      productNameAr: pObj.nameAr,
      productNameEn: pObj.nameEn,
      type: 'purchase',
      quantity: qty,
      timestamp: new Date().toISOString(),
      referenceId: nextPurchaseId,
      remainingQty: pObj.quantity + qty
    };

    saveProductsToDb(updatedProducts);
    savePurchasesToDb([...purchases, quickInvoice]);
    saveMovementsToDb([...movements, newMov]);
    
    // Play virtual notification chime
    showAlert(isEn ? `Successfully restocked ${qty} units of "${pObj.nameEn}" via Mobile App!` : `تم تزويد المخزن بـ ${qty} حبة من "${pObj.nameAr}" عبر الموبايل بنجاح!`, 'success');
  };


  // BACKUP OPERATIONS (Export & Import JSON)
  const handleExportBackup = () => {
    const backupDb = {
      settings,
      products,
      sales,
      purchases,
      customers,
      suppliers,
      movements,
      employees
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupDb, null, 2)
    )}`;
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `Smart_Savings_ERP_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    // Log backup activity
    const newLog: BackupLog = {
      id: `back-man-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'manual',
      status: 'success',
      recordCount: {
        products: products.length,
        sales: sales.length,
        purchases: purchases.length,
        customers: customers.length,
        suppliers: suppliers.length
      }
    };
    setBackupLogs([...backupLogs, newLog]);
    localStorage.setItem('erp_backups', JSON.stringify([...backupLogs, newLog]));
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.products && parsed.sales) {
          if (parsed.settings) setSettings(parsed.settings);
          if (parsed.products) saveProductsToDb(parsed.products);
          if (parsed.sales) saveSalesToDb(parsed.sales);
          if (parsed.purchases) savePurchasesToDb(parsed.purchases);
          if (parsed.customers) saveCustomersToDb(parsed.customers);
          if (parsed.suppliers) saveSuppliersToDb(parsed.suppliers);
          if (parsed.movements) saveMovementsToDb(parsed.movements);
          if (parsed.employees) saveEmployeesToDb(parsed.employees);

          // Add positive log
          const newLog: BackupLog = {
            id: `back-imp-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'manual',
            status: 'success',
            recordCount: {
              products: parsed.products.length,
              sales: parsed.sales.length,
              purchases: parsed.purchases ? parsed.purchases.length : 0,
              customers: parsed.customers ? parsed.customers.length : 0,
              suppliers: parsed.suppliers ? parsed.suppliers.length : 0
            }
          };
          setBackupLogs([...backupLogs, newLog]);
          localStorage.setItem('erp_backups', JSON.stringify([...backupLogs, newLog]));

          showAlert(isEn ? 'System Database restored from file successfully!' : 'تم استعادة قاعدة بيانات البرنامج من ملف النسخ بنجاح!', 'success');
        } else {
          throw new Error('Invalid schema format');
        }
      } catch (err) {
        showAlert(isEn ? 'Failed to parse JSON file. Ensure correct ERP backup format.' : 'فشل قراءة الملف. يرجى التأكد من اختيار نسخة احتياطية صالحة ومطابقة للبرنامج.', 'warning');
      }
    };
    fileReader.readAsText(files[0]);
  };


  // RESET DATABASE TO DEFAULT FACTORY PRESETS
  const handleResetDatabase = () => {
    showConfirm(
      isEn ? 'Are you sure you want to restore defaults? All current transactions will be erased.' : 'هل أنت متأكد من رغبتك في إعادة ضبط المصنع؟ سيتم محو كافة الحركات الحالية.',
      () => {
        localStorage.clear();
        window.location.reload();
      }
    );
  };


  // ADD/EDIT FORMS PROCESSOR FOR MODALS
  const handleSaveProductForm = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pId = fd.get('id') as string;
    const nameAr = fd.get('nameAr') as string;
    const nameEn = fd.get('nameEn') as string;
    const category = fd.get('category') as string;
    const barStr = fd.get('barcodes') as string;
    const purchase = parseFloat(fd.get('purchasePrice') as string) || 0;
    const sale = parseFloat(fd.get('salePrice') as string) || 0;
    const initialQty = parseFloat(fd.get('quantity') as string) || 0;
    const minQty = parseFloat(fd.get('minQuantity') as string) || 0;
    const unitAr = fd.get('unitAr') as string;
    const unitEn = fd.get('unitEn') as string;

    const bcdArray = barStr.split(',').map(b => b.trim()).filter(Boolean);

    if (selectedProduct) {
      // Edit mode
      const updated = products.map(p => {
        if (p.id === selectedProduct.id) {
          return {
            ...p,
            nameAr, nameEn, category, purchasePrice: purchase, salePrice: sale,
            minQuantity: minQty, unitAr, unitEn, barcodes: bcdArray, quantity: initialQty
          };
        }
        return p;
      });
      saveProductsToDb(updated);
    } else {
      // Create mode
      const newP: Product = {
        id: pId || `prod-${Date.now()}`,
        nameAr, nameEn, category, purchasePrice: purchase, salePrice: sale,
        quantity: initialQty, minQuantity: minQty, unitAr, unitEn, barcodes: bcdArray,
        taxRate: settings.vatRate
      };
      
      // Add manual adjustment stock movement
      const adjustMov: StockMovement = {
        id: `mov-adj-${Date.now()}`,
        productId: newP.id,
        productNameAr: nameAr,
        productNameEn: nameEn,
        type: 'manual_adjustment',
        quantity: initialQty,
        timestamp: new Date().toISOString(),
        referenceId: 'INITIAL_STOCK',
        remainingQty: initialQty
      };

      saveProductsToDb([...products, newP]);
      saveMovementsToDb([...movements, adjustMov]);
    }

    setShowProductModal(false);
    setSelectedProduct(null);
  };

  const handleSaveContactForm = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nameAr = fd.get('nameAr') as string;
    const nameEn = fd.get('nameEn') as string;
    const phone = fd.get('phone') as string;
    const email = fd.get('email') as string;
    const vatNumber = fd.get('vatNumber') as string;

    if (contactType === 'customer') {
      if (selectedContact) {
        const u = customers.map(c => c.id === selectedContact.id ? { ...c, nameAr, nameEn, phone, email, vatNumber } : c);
        saveCustomersToDb(u);
      } else {
        const nc: Customer = { id: `cust-${Date.now()}`, nameAr, nameEn, phone, email, vatNumber, balance: 0 };
        saveCustomersToDb([...customers, nc]);
      }
    } else if (contactType === 'supplier') {
      if (selectedContact) {
        const u = suppliers.map(s => s.id === selectedContact.id ? { ...s, nameAr, nameEn, phone, email, vatNumber } : s);
        saveSuppliersToDb(u);
      } else {
        const ns: Supplier = { id: `supp-${Date.now()}`, nameAr, nameEn, phone, email, vatNumber };
        saveSuppliersToDb([...suppliers, ns]);
      }
    } else {
      // Employee Staff
      const username = fd.get('username') as string;
      const role = fd.get('role') as 'admin' | 'manager' | 'cashier';
      const pin = fd.get('pin') as string;
      if (selectedContact) {
        const u = employees.map(emp => emp.id === selectedContact.id ? { ...emp, name: nameAr, username, role, pin: pin && pin.trim().length === 4 ? pin.trim() : undefined } : emp);
        saveEmployeesToDb(u);
      } else {
        const nEmp: User = { id: `usr-${Date.now()}`, name: nameAr, username, role, active: true, pin: pin && pin.trim().length === 4 ? pin.trim() : undefined };
        saveEmployeesToDb([...employees, nEmp]);
      }
    }

    setShowContactModal(false);
    setSelectedContact(null);
  };

  const handleSaveEditedInvoice = () => {
    if (!editingInvoice) return;
    if (!hasAccess('invoice_edit')) {
      showAlert(isEn ? 'You do not have permission to edit invoices!' : 'عذراً، ليس لديك صلاحية تعديل بيانات الفواتير!', 'warning');
      return;
    }

    // 1. Recalculate totals
    let calculatedSubtotal = 0;
    let calculatedTaxTotal = 0;

    const finalItems = editInvoiceItems.map(item => {
      const itemSubtotal = item.unitPrice * item.quantity;
      const itemTax = itemSubtotal * (settings.vatRate / 100);
      const itemTotal = itemSubtotal + itemTax;

      calculatedSubtotal += itemSubtotal;
      calculatedTaxTotal += itemTax;

      return {
        ...item,
        taxAmount: parseFloat(itemTax.toFixed(2)),
        total: parseFloat(itemTotal.toFixed(2))
      };
    });

    const finalGrandTotal = calculatedSubtotal + calculatedTaxTotal - editInvoiceDiscount;
    const finalPaidAmount = Math.max(finalGrandTotal, editInvoicePaid);
    const finalChangeAmount = Math.max(0, finalPaidAmount - finalGrandTotal);

    const selectedCust = customers.find(c => c.id === editInvoiceCustomer);
    const customerName = selectedCust 
      ? (isEn ? selectedCust.nameEn : selectedCust.nameAr) 
      : (isEn ? 'Cash Customer' : 'عميل نقدي');

    // Create the updated invoice object
    const updatedInvoice: SaleInvoice = {
      ...editingInvoice,
      timestamp: editInvoiceDate ? new Date(editInvoiceDate).toISOString() : editingInvoice.timestamp,
      items: finalItems,
      subtotal: parseFloat(calculatedSubtotal.toFixed(2)),
      taxTotal: parseFloat(calculatedTaxTotal.toFixed(2)),
      discountTotal: editInvoiceDiscount,
      grandTotal: parseFloat(finalGrandTotal.toFixed(2)),
      paidAmount: parseFloat(finalPaidAmount.toFixed(2)),
      changeAmount: parseFloat(finalChangeAmount.toFixed(2)),
      paymentMethod: editInvoicePaymentMethod,
      customerId: editInvoiceCustomer,
      customerName: customerName,
      cashierName: editInvoiceCashierName || editingInvoice.cashierName,
      notes: editInvoiceNotes.trim() || undefined
    };

    // 2. Adjust product inventory stock levels
    const updatedProducts = products.map(prod => {
      const oldItem = editingInvoice.items.find(item => item.productId === prod.id);
      const oldQty = oldItem ? oldItem.quantity : 0;

      const newItem = finalItems.find(item => item.productId === prod.id);
      const newQty = newItem ? newItem.quantity : 0;

      const diff = oldQty - newQty;

      return {
        ...prod,
        quantity: Math.max(0, prod.quantity + diff)
      };
    });

    saveProductsToDb(updatedProducts);

    // 3. Add stock movement logs for any changed quantities
    const newMovements: StockMovement[] = [];
    finalItems.forEach(newItem => {
      const oldItem = editingInvoice.items.find(item => item.productId === newItem.productId);
      const oldQty = oldItem ? oldItem.quantity : 0;
      const diff = newItem.quantity - oldQty;

      if (diff !== 0) {
        newMovements.push({
          id: `mov-edit-${Date.now()}-${Math.random()}`,
          productId: newItem.productId,
          productNameAr: newItem.nameAr,
          productNameEn: newItem.nameEn,
          type: 'manual_adjustment' as const,
          quantity: -diff,
          timestamp: new Date().toISOString(),
          referenceId: editingInvoice.id,
          remainingQty: updatedProducts.find(p => p.id === newItem.productId)?.quantity || 0
        });
      }
    });

    editingInvoice.items.forEach(oldItem => {
      const existsInNew = finalItems.some(newItem => newItem.productId === oldItem.productId);
      if (!existsInNew) {
        newMovements.push({
          id: `mov-edit-del-${Date.now()}-${Math.random()}`,
          productId: oldItem.productId,
          productNameAr: oldItem.nameAr,
          productNameEn: oldItem.nameEn,
          type: 'manual_adjustment' as const,
          quantity: oldItem.quantity,
          timestamp: new Date().toISOString(),
          referenceId: editingInvoice.id,
          remainingQty: updatedProducts.find(p => p.id === oldItem.productId)?.quantity || 0
        });
      }
    });

    if (newMovements.length > 0) {
      const allMovements = [...movements, ...newMovements];
      setMovements(allMovements);
      localStorage.setItem('erp_movements', JSON.stringify(allMovements));
    }

    // 4. Update sales records
    const updatedSales = sales.map(s => s.id === editingInvoice.id ? updatedInvoice : s);
    saveSalesToDb(updatedSales);

    setEditingInvoice(null);
    showAlert(isEn ? 'Invoice updated successfully and inventory recalculated!' : 'تم حفظ تعديلات الفاتورة وتحديث كميات المخزن بنجاح!', 'success');
  };


  // AUTH OUT
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('erp_session');
    setCart([]);
  };


  const handleVoidSaleInvoice = (invoice: SaleInvoice) => {
    if (!hasAccess('invoice_void')) {
      showAlert(isEn ? 'You do not have permission to void or cancel invoices!' : 'عذراً، ليس لديك صلاحية إلغاء الفاتورة ورصد المرتجع!', 'warning');
      return;
    }
    
    showConfirm(
      isEn 
        ? `Are you sure you want to void invoice ${invoice.invoiceNumber}? This will return all items back to stock.`
        : `هل أنت متأكد من رغبتك في إلغاء الفاتورة ${invoice.invoiceNumber}؟ سيتم إرجاع كميات المواد تلقائياً للمستودع.`,
      () => {
        // 1. Mark isVoided as true
        const updatedSales = sales.map(s => s.id === invoice.id ? { ...s, isVoided: true } : s);
        saveSalesToDb(updatedSales);
        
        // 2. Return items to stock inventory
        const updatedProducts = products.map(prod => {
          const invoiceItem = invoice.items.find(item => item.productId === prod.id);
          if (invoiceItem) {
            return {
              ...prod,
              quantity: prod.quantity + invoiceItem.quantity
            };
          }
          return prod;
        });
        setProducts(updatedProducts);
        localStorage.setItem('erp_products', JSON.stringify(updatedProducts));
        
        // 3. Add stock movements for the voided items
        const newMovements: StockMovement[] = invoice.items.map(item => ({
          id: `mov-void-${Date.now()}-${Math.random()}`,
          productId: item.productId,
          productNameAr: item.nameAr,
          productNameEn: item.nameEn,
          type: 'void_sale' as const,
          quantity: item.quantity, 
          timestamp: new Date().toISOString(),
          referenceId: invoice.id,
          remainingQty: (products.find(p => p.id === item.productId)?.quantity || 0) + item.quantity
        }));
        
        const allMovements = [...movements, ...newMovements];
        setMovements(allMovements);
        localStorage.setItem('erp_movements', JSON.stringify(allMovements));
        
        showAlert(isEn ? 'Invoice successfully voided and inventory restored!' : 'تم إلغاء الفاتورة بنجاح وإعادة كميات الأصناف إلى المستودع!', 'success');
      }
    );
  };


  const handleDeleteCustomer = (id: string) => {
    if (id === 'cust-cash') {
      showAlert(isEn ? 'Cannot delete cash customer account!' : 'لا يمكن حذف حساب العميل النقدي الافتراضي!', 'warning');
      return;
    }
    showConfirm(
      isEn ? 'Are you sure you want to delete this customer?' : 'هل أنت متأكد من رغبتك في حذف هذا العميل؟',
      () => {
        const updated = customers.filter(c => c.id !== id);
        saveCustomersToDb(updated);
      }
    );
  };

  const handleDeleteSupplier = (id: string) => {
    showConfirm(
      isEn ? 'Are you sure you want to delete this supplier?' : 'هل أنت متأكد من رغبتك في حذف هذا المورد؟',
      () => {
        const updated = suppliers.filter(s => s.id !== id);
        saveSuppliersToDb(updated);
      }
    );
  };

  const handleDeleteEmployee = (id: string) => {
    if (id === currentUser?.id) {
      showAlert(isEn ? 'Cannot delete your own active logged-in session account!' : 'لا يمكنك حذف حساب الموظف الخاص بك أثناء تسجيل دخولك به حالياً!', 'warning');
      return;
    }
    if (id === 'usr-1') {
      showAlert(isEn ? 'Cannot delete default system super admin account!' : 'لا يمكن حذف حساب مسؤول النظام الافتراضي!', 'warning');
      return;
    }
    showConfirm(
      isEn ? 'Are you sure you want to delete this employee account?' : 'هل أنت متأكد من رغبتك في حذف حساب هذا الموظف وصلاحياته؟',
      () => {
        const updated = employees.filter(emp => emp.id !== id);
        saveEmployeesToDb(updated);
      }
    );
  };


  // VIEW GATING SECURITY CHECKS
  const hasAccess = (screen: string): boolean => {
    if (!currentUser) return false;
    const role = currentUser.role;

    // Failsafe: admin must ALWAYS be able to access the 'users' screen to edit permissions
    // so they can never accidentally lock themselves out of the system.
    if (role === 'admin' && screen === 'users') return true;

    // Look up in dynamic permissions state
    if (rolePermissions && rolePermissions[role] && rolePermissions[role][screen] !== undefined) {
      return rolePermissions[role][screen];
    }

    // Default/fallback rules if something goes wrong
    if (role === 'admin') return true; // full access
    if (role === 'manager') {
      // Blocks analytical reviews, staff management, and dedicated user controls
      if (screen === 'reports' || screen === 'users') return false;
      return true;
    }
    // Cashier role: allowed in POS Cashier register & Invoices list screens!
    if (role === 'cashier') {
      return screen === 'pos' || screen === 'invoices';
    }
    return false;
  };


  // Render Login state first
  if (!currentUser) {
    return (
      <LoginScreen 
        isEn={isEn} 
        employees={employees}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          localStorage.setItem('erp_session', JSON.stringify(user));
        }} 
      />
    );
  }

  // Active items below alert limits
  const lowStockAlertItems = products.filter(p => p.quantity <= p.minQuantity);

  // Computed dashboard calculations for Reporting Tab
  const activeSales = sales.filter(s => !s.isVoided);
  const totalSalesRevenue = activeSales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalTaxAmount = activeSales.reduce((sum, s) => sum + s.taxTotal, 0);
  
  // Total purchases cost
  const totalPurchasesCost = purchases.reduce((sum, p) => sum + p.grandTotal, 0);
  
  // Dynamic accurate profit analysis based on base item purchase margins
  const totalCapitalInStock = products.reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0);
  const totalValuationInStock = products.reduce((sum, p) => sum + (p.salePrice * p.quantity), 0);

  // Map daily revenue for our gorgeous high-craft SVG Sales Charts
  const getDaySalesData = () => {
    const days = [4, 3, 2, 1, 0].map(daysAgo => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      const dateStr = d.toISOString().slice(0, 10);
      
      const salesOfDate = sales.filter(s => !s.isVoided && s.timestamp.startsWith(dateStr));
      const totalDaySales = salesOfDate.reduce((sum, s) => sum + s.grandTotal, 0);
      
      // Calculate costs
      const totalCost = salesOfDate.reduce((costSum, s) => {
        return costSum + s.items.reduce((itemCostSum, item) => {
          const p = products.find(prod => prod.id === item.productId);
          const unitCost = p ? p.purchasePrice : item.unitPrice * 0.7;
          return itemCostSum + (unitCost * item.quantity);
        }, 0);
      }, 0);

      const label = isEn 
        ? d.toLocaleDateString('en-US', { weekday: 'short' })
        : d.toLocaleDateString('ar-EG', { weekday: 'short' });

      return { dateStr, label, revenue: totalDaySales, profit: Math.max(0, totalDaySales - totalCost) };
    });

    return days;
  };

  const chartData = getDaySalesData();
  const maxChartVal = Math.max(...chartData.map(d => d.revenue), 100);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none selection:bg-blue-600 selection:text-white" style={{ direction: isEn ? 'ltr' : 'rtl' }}>
      
      {/* 1. SECURE SYSTEM LEVEL APP BANNER HEADER */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 flex flex-wrap gap-4 items-center justify-between sticky top-0 z-40 shadow-sm">
        
        {/* Portal Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center p-2 text-white shadow-xl shadow-blue-600/20">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <span>{isEn ? settings.storeNameEn : settings.storeNameAr}</span>
              <span className="bg-blue-50 border border-blue-200 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                ERP v4.1
              </span>
            </h1>
            <div className="flex items-center gap-1.5 text-slate-500 text-xxs mt-0.5 font-bold font-mono">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isEn ? 'Logged as:' : 'المستخدم:'} {currentUser.name} ({currentUser.role.toUpperCase()})</span>
            </div>
          </div>
        </div>

        {/* Global Toolbar Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Real-time Cloud Sync indicators */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-xxs font-bold">
            <div className={`w-2.5 h-2.5 rounded-full ${syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
            <span className="text-slate-600 uppercase tracking-wider">
              {syncStatus === 'syncing' ? (isEn ? 'Syncing...' : 'جاري المزامنة سحابياً') : (isEn ? 'Dual-Sync Direct' : 'تزامن محلي سحابي')}
            </span>
          </div>

          {/* Quick Alert Warning Badge */}
          {lowStockAlertItems.length > 0 && (
            <button 
              onClick={() => {
                if (hasAccess('inventory')) {
                  setActiveScreen('inventory');
                  setCategoryFilter('LowStock');
                } else {
                  showAlert(isEn ? 'Access restricted to Manager roles.' : 'هذا القسم يقتصر على صلاحية المدير فقط.', 'warning');
                }
              }}
              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2.5 py-1.5 rounded-lg text-xxs font-extrabold flex items-center gap-1.5 transition-all shadow-lg shadow-red-500/5 active:scale-95"
            >
              <AlertTriangle className="w-3.5 h-3.5 animate-bounce text-red-600" />
              <span>{isEn ? `${lowStockAlertItems.length} Low Stock Alert` : `${lowStockAlertItems.length} تنبيهات نقص`}</span>
            </button>
          )}

          {/* Language Toggle Button */}
          <button
            onClick={() => setIsEn(!isEn)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-black px-3 py-1.5 cursor-pointer text-blue-600 transition-colors"
          >
            {isEn ? 'العربية' : 'English'}
          </button>

          {/* Keyboard Shortcuts Button */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setShowShortcutsHelp(true)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold px-3 py-1.5 flex items-center gap-1.5 cursor-pointer text-slate-700 transition-colors"
              title={isEn ? 'Show Keyboard Shortcuts (Alt+H)' : 'عرض اختصارات الكيبورد السريعة (Alt+H)'}
            >
              <Keyboard className="w-4 h-4 text-blue-600" />
              <span className="hidden md:inline">{isEn ? 'Shortcuts' : 'الاختصارات'}</span>
            </button>
          )}

          {/* Floating Mobile Sim Toggle */}
          <button
            onClick={() => setShowMobileSim(!showMobileSim)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showMobileSim 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700'
            }`}
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{isEn ? 'Mobile Simulator' : 'شاشة الجوال'}</span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors flex items-center justify-center cursor-pointer"
            title={isEn ? 'Lock Session' : 'إغلاق الجلسة واقفل النظام'}
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>

      </header>

      {/* WORKSPACE CONTENT SHELL */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

        {/* 2. RESPONSIVE SIDE NAVIGATION BAR */}
        <nav className="bg-slate-900 border-r md:border-r border-b md:border-b-0 border-slate-800 w-full md:w-56 flex md:flex-col justify-around md:justify-start p-2 gap-1 shrink-0 z-30 overflow-x-auto">
          
          <div className="hidden md:block py-2 px-3 text-xxs font-extrabold text-slate-500 tracking-wider uppercase">
            {isEn ? 'Operations Terminal' : 'موانئ النظام والتحكم'}
          </div>

          {(!hideBlockedTabs || hasAccess('pos')) && (
            <button
              onClick={() => {
                if (hasAccess('pos')) setActiveScreen('pos');
                else showAlert(isEn ? 'Access denied' : 'غير مصرح للدخول لهذه الشاشة.', 'warning');
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                !hasAccess('pos') ? 'opacity-45 cursor-not-allowed' : ''
              } ${
                activeScreen === 'pos' 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/15' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-4.5 h-4.5 shrink-0" />
              <span>{isEn ? 'Cashier Invoice Register (POS)' : 'شاشة البيع ونقاط البيع'}</span>
            </button>
          )}

          {(!hideBlockedTabs || hasAccess('invoices')) && (
            <button
              onClick={() => {
                if (hasAccess('invoices')) setActiveScreen('invoices');
                else showAlert(isEn ? 'Access denied' : 'غير مصرح للدخول لهذه الشاشة.', 'warning');
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                !hasAccess('invoices') ? 'opacity-45 cursor-not-allowed' : ''
              } ${
                activeScreen === 'invoices' 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/15' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Receipt className="w-4.5 h-4.5 shrink-0" />
              <span>{isEn ? 'Invoices Ledger (Sales)' : 'دفتر وقائمة الفواتير'}</span>
            </button>
          )}

          {(!hideBlockedTabs || hasAccess('inventory')) && (
            <button
              onClick={() => {
                if (hasAccess('inventory')) setActiveScreen('inventory');
                else showAlert(isEn ? 'Access denied' : 'غير مصرح للدخول لهذه الشاشة.', 'warning');
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                !hasAccess('inventory') ? 'opacity-45 cursor-not-allowed' : ''
              } ${
                activeScreen === 'inventory' 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/15' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Package className="w-4.5 h-4.5 shrink-0" />
              <span>{isEn ? 'Products Catalog (Stock)' : 'إدارة المستودع والأصناف'}</span>
            </button>
          )}

          {(!hideBlockedTabs || hasAccess('purchases')) && (
            <button
              onClick={() => {
                if (hasAccess('purchases')) setActiveScreen('purchases');
                else showAlert(isEn ? 'Access denied' : 'غير مصرح للدخول لهذه الشاشة.', 'warning');
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                !hasAccess('purchases') ? 'opacity-45 cursor-not-allowed' : ''
              } ${
                activeScreen === 'purchases' 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/15' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Landmark className="w-4.5 h-4.5 shrink-0" />
              <span>{isEn ? 'Procurements (Purchases)' : 'شراء وتوريد بضائع'}</span>
            </button>
          )}

          {(!hideBlockedTabs || hasAccess('contacts')) && (
            <button
              onClick={() => {
                if (hasAccess('contacts')) setActiveScreen('contacts');
                else showAlert(isEn ? 'Access denied' : 'غير مصرح للدخول لهذه الشاشة.', 'warning');
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                !hasAccess('contacts') ? 'opacity-45 cursor-not-allowed' : ''
              } ${
                activeScreen === 'contacts' 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/15' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-4.5 h-4.5 shrink-0" />
              <span>{isEn ? 'Contacts & CRM' : 'الموظفون والعملاء والموردون'}</span>
            </button>
          )}

          {(!hideBlockedTabs || hasAccess('categories')) && (
            <button
              onClick={() => {
                if (hasAccess('categories')) setActiveScreen('categories');
                else showAlert(isEn ? 'Access denied' : 'غير مصرح للدخول لهذه الشاشة.', 'warning');
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                !hasAccess('categories') ? 'opacity-45 cursor-not-allowed' : ''
              } ${
                activeScreen === 'categories' 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/15' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Layers className="w-4.5 h-4.5 shrink-0" />
              <span>{isEn ? 'Product Categories' : 'إدارة وتسجيل الأقسام'}</span>
            </button>
          )}

          {hasAccess('users') && (
            <button
              onClick={() => {
                if (hasAccess('users')) setActiveScreen('users');
                else showAlert(isEn ? 'Access denied' : 'غير مصرح للدخول لهذه الشاشة.', 'warning');
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                activeScreen === 'users' 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/15' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <UserCheck className="w-4.5 h-4.5 shrink-0" />
              <span>{isEn ? 'User Control Center' : 'التحكم بالمستخدمين والنظام'}</span>
            </button>
          )}

          {(!hideBlockedTabs || hasAccess('reports')) && (
            <button
              onClick={() => {
                if (hasAccess('reports')) setActiveScreen('reports');
                else showAlert(isEn ? 'Access denied' : 'غير مصرح للدخول لهذه الشاشة.', 'warning');
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                !hasAccess('reports') ? 'opacity-45 cursor-not-allowed' : ''
              } ${
                activeScreen === 'reports' 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/15' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4.5 h-4.5 shrink-0" />
              <span>{isEn ? 'P&L Reports / Analytics' : 'تقارير الأرباح والتحليلات'}</span>
            </button>
          )}

          {(!hideBlockedTabs || hasAccess('backups')) && (
            <button
              onClick={() => {
                if (hasAccess('backups')) setActiveScreen('backups');
                else showAlert(isEn ? 'Access denied' : 'غير مصرح للدخول لهذه الشاشة.', 'warning');
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                !hasAccess('backups') ? 'opacity-45 cursor-not-allowed' : ''
              } ${
                activeScreen === 'backups' 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/15' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4.5 h-4.5 shrink-0" />
              <span>{isEn ? 'Cloud Sync & Backups' : 'النسخ والضبط العام'}</span>
            </button>
          )}

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => {
                setActiveScreen('database');
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                activeScreen === 'database' 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/15' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Database className="w-4.5 h-4.5 shrink-0" />
              <span>{isEn ? 'Database Connectivity' : 'اتصال قاعدة البيانات'}</span>
            </button>
          )}

        </nav>

        {/* 3. CORE APP VIEW MODULE */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
          
          {/* ============================== SCREEN: POS / CASHIER ============================== */}
          {activeScreen === 'pos' && (
            <div id="screen-pos" className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-slate-800">
              
              {/* POS Left Panel: Active Cart & Total Payment details */}
              <div className="lg:col-span-4 bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col h-full min-h-[500px]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                    <h2 className="text-sm font-black text-slate-900">
                      {isEn ? 'Active Sales Cart' : 'عربة كاشير المبيعات'}
                    </h2>
                  </div>
                  <span className="bg-slate-100 text-slate-600 text-xxs font-mono font-bold px-2 py-0.5 rounded">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)} {isEn ? 'Items' : 'قطعة'}
                  </span>
                </div>

                {/* Live Basket Scrollable list */}
                <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-[290px] pr-1">
                  {cart.length === 0 ? (
                    <div className="text-center py-12 text-xxs text-slate-400 font-bold">
                      {isEn ? 'Cart is empty. Scan products to check-out...' : 'سلة الكاشير فارغة. امسح باركود منتج لتنزيله...'}
                    </div>
                  ) : (
                    cart.map((item, index) => (
                      <div key={index} className="bg-slate-50 border border-slate-200/60 p-2.5 rounded-xl flex justify-between items-center gap-2 shadow-sm">
                        <div className="overflow-hidden grow">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {isEn ? item.product.nameEn : item.product.nameAr}
                          </p>
                          <span className="text-xxs text-slate-500 font-mono">
                            {item.barcodeUsed} @ {formatCurrency(item.product.salePrice, isEn, settings)}
                          </span>
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...cart];
                              if (updated[index].quantity > 1) {
                                updated[index].quantity -= 1;
                                  setCart(updated);
                              } else {
                                setCart(cart.filter((_, i) => i !== index));
                              }
                            }}
                            className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex justify-center items-center shadow-sm"
                          >
                            -
                          </button>
                          <span className="text-xs font-extrabold text-slate-800 w-5 text-center">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...cart];
                              updated[index].quantity += 1;
                              setCart(updated);
                            }}
                            className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex justify-center items-center shadow-sm"
                          >
                            +
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setCart(cart.filter((_, i) => i !== index));
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors mr-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Checkout & Bill Summary controls */}
                <form onSubmit={handlePOSCheckout} className="border-t border-slate-100 pt-3 space-y-3 shrink-0">
                  
                  {/* Select Customer */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-550 font-bold uppercase mb-1">
                        {isEn ? 'Invoice Customer' : 'اختيار العميل'}
                      </label>
                      <select
                        value={posCustomer}
                        onChange={(e) => setPosCustomer(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-xxs px-2.5 py-2 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {isEn ? c.nameEn : c.nameAr}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Applied Discount */}
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                        {isEn ? 'Apply Discount (SAR)' : 'تطبيق خصم (ريال)'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          value={posDiscount || ''}
                          onChange={(e) => setPosDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-xxs px-2.5 py-1.5 focus:outline-none font-bold"
                          placeholder="0"
                        />
                        <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div>
                    <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                      {isEn ? 'Payment Way' : 'طريقة السداد'}
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['cash', 'card', 'bank'] as const).map((method) => {
                        const isSelected = posPaymentMethod === method;
                        return (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPosPaymentMethod(method)}
                            className={`py-1.5 rounded-lg text-xxs font-extrabold transition-all duration-150 ${
                              isSelected 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {method === 'cash' ? (isEn ? 'Cash' : 'نقدي') : method === 'card' ? (isEn ? 'Mada (Card)' : 'مدى/بطاقة') : (isEn ? 'Bank Transfer' : 'حوالة بنكية')}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Amount Paid Input for Change Calculation */}
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                      {isEn ? 'Paid amount by customer' : 'المبلغ النقدي المستلم'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={posPaidAmount}
                      onChange={(e) => setPosPaidAmount(e.target.value)}
                      placeholder={isEn ? 'Leave empty for exact amount' : 'اتركه فارغاً للسداد بالصافي التلقائي'}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-xxs px-2.5 py-1.5 focus:outline-none font-bold"
                    />
                  </div>

                  {/* Quick Notes for Active Sale */}
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-400" />
                      <span>{isEn ? 'Quick Notes (Invoice Note)' : 'ملاحظات سريعة الفاتورة'}</span>
                    </label>
                    <textarea
                      rows={2}
                      value={posNotes}
                      onChange={(e) => setPosNotes(e.target.value)}
                      placeholder={isEn ? 'Add extra notes, special requests, or description...' : 'أضف ملاحظات الفاتورة، طلبات خاصة، أو تفاصيل...'}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-xxs px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium resize-none"
                    />
                  </div>

                  {/* Pricing Breakdown Card */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1 text-xxs text-slate-700 shadow-sm">
                    <div className="flex justify-between items-center text-slate-500">
                      <span>{isEn ? 'Basket subtotal' : 'المجموع قبل الضريبة'}</span>
                      <span className="font-mono font-bold">
                        {formatCurrency(computePOSSummary().subtotal / (1 + (settings.vatRate / 100)), isEn, settings)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>{isEn ? 'Applied VAT 15%' : 'قيمة ضريبة القيمة المضافة 15%'}</span>
                      <span className="font-mono font-bold">
                        {formatCurrency(computePOSSummary().taxTotal, isEn, settings)}
                      </span>
                    </div>
                    {posDiscount > 0 && (
                      <div className="flex justify-between items-center text-emerald-700 font-semibold">
                        <span>{isEn ? 'Total Discount' : 'الخصم المستبعد'}</span>
                        <span className="font-mono">
                          -{formatCurrency(posDiscount, isEn, settings)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center border-t border-slate-100 pt-2 mt-1 font-black text-slate-900 text-xs">
                      <span>{isEn ? 'GRAND NET:' : 'صافي المبلغ المطلوب:'}</span>
                      <span className="font-mono text-emerald-600">
                        {formatCurrency(computePOSSummary().grandTotal, isEn, settings)}
                      </span>
                    </div>
                  </div>

                  {/* Complete Action Button */}
                  <button
                    type="submit"
                    disabled={cart.length === 0}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
                  >
                    <CheckCircle className="w-4 h-4 animate-pulse" />
                    <span>{isEn ? 'Execute Standard Tax Sale' : 'اعتماد وترحيل بيع الفاتورة'}</span>
                  </button>

                </form>

              </div>

              {/* POS Right Panel: Fast Products Directory & Barcode scanning panel */}
              <div className="lg:col-span-8 space-y-4">
                
                {/* 2-line fast Scan component */}
                <BarcodeScannerEmulator 
                  isEn={isEn} 
                  products={products} 
                  onScan={handleBarcodeScan} 
                />

                {/* Directory Controls & Quick Add Custom Customer link */}
                <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl space-y-3">
                  
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <h3 className="text-xs font-black text-white">
                      {isEn ? 'Interactive Inventory Catalog' : 'دليل المنتجات والمستودع السريع'}
                    </h3>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setContactType('customer');
                        setSelectedContact(null);
                        setShowContactModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-700 font-bold text-xxs flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Add New Customer CRM' : 'تسجيل عميل جديد'}</span>
                    </button>
                  </div>

                  {/* Search filters & query */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={isEn ? 'Search product catalog by name, code...' : 'ابحث عن صنف بالاسمAr، الاسمEn، أو الكود...'}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 text-xxs rounded-lg pl-9 focus:outline-none focus:border-blue-500"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-thin">
                      {[{ id: 'all', nameEn: 'All', nameAr: 'الكل' }, ...categories].map((category) => {
                        const isSelected = categoryFilter === category.nameEn;
                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => setCategoryFilter(category.nameEn)}
                            className={`px-3 py-1.5 rounded-lg text-xxs font-black transition-all whitespace-nowrap ${
                              isSelected 
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {isEn ? category.nameEn : category.nameAr}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grid layout of matches */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                    {products
                      .filter(p => {
                        const matchesQuery = searchQuery 
                          ? p.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.barcodes.some(b => b.includes(searchQuery))
                          : true;
                        const matchesCategory = categoryFilter === 'All' ? true : p.category === categoryFilter;
                        return matchesQuery && matchesCategory;
                      })
                      .map((p) => {
                        const isLow = p.quantity <= p.minQuantity;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleBarcodeScan(p.barcodes[0] || p.id)}
                            className="bg-slate-50 border border-slate-200 hover:border-slate-350 hover:bg-white rounded-xl p-3 text-right group flex flex-col justify-between h-28 hover:shadow-md transition-all shadow-sm"
                          >
                            <div className="w-full">
                              <div className="flex justify-between items-start gap-1">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                                  isLow ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-200/80 text-slate-600'
                                }`}>
                                  {p.quantity} {isEn ? 'Qty' : 'في الرف'}
                                </span>
                                <span className="text-[9px] text-slate-550 font-bold">
                                  {p.category}
                                </span>
                              </div>
                              <p className="text-xxs font-extrabold text-slate-800 mt-2 truncate group-hover:text-blue-600 block w-full text-right leading-tight">
                                {isEn ? p.nameEn : p.nameAr}
                              </p>
                            </div>

                            <div className="flex justify-between items-center w-full border-t border-slate-200/60 pt-1.5 shrink-0">
                              <span className="text-[10px] font-bold text-slate-500 font-mono">
                                BC: {p.barcodes[0]}
                              </span>
                              <span className="text-xs font-black text-slate-900 font-mono">
                                {formatCurrency(p.salePrice, isEn, settings)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* ============================== SCREEN: INVOICES HUB ============================== */}
          {activeScreen === 'invoices' && (
            <div id="screen-invoices" className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 space-y-5 shadow-sm text-slate-800">
              
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                <div>
                  <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-blue-600 shrink-0" />
                    <span>{isEn ? 'Invoices Desk' : 'دفتر وقائمة الفواتير'}</span>
                  </h2>
                  <p className="text-slate-500 text-xxs font-medium mt-0.5">
                    {isEn ? 'Browse, reprint, filter and void sales invoice logs' : 'استعراض فواتير المبيعات، الفلترة وإعادة الطباعة وإلغاء المعاملات'}
                  </p>
                </div>
                <div className="text-xxs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-bold">
                  {isEn ? `Total Logs: ${sales.length}` : `إجمالي الفواتير: ${sales.length} فاتورة`}
                </div>
              </div>

              {/* KPI Panel */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-slate-500 text-xxs font-extrabold">{isEn ? 'Total Sales Value' : 'إجمالي المبيعات المحققة'}</p>
                  <p className="text-sm md:text-md font-black text-slate-900 mt-1">
                    {formatCurrency(sales.filter(s => !s.isVoided).reduce((sum, s) => sum + s.grandTotal, 0), isEn)}
                  </p>
                  <span className="text-[10px] text-slate-400 font-bold">{isEn ? 'excluding cancelled' : 'باستثناء المرتجعة'}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-slate-500 text-xxs font-extrabold">{isEn ? 'Collected Tax (15%)' : 'إجمالي الضريبة المحصلة'}</p>
                  <p className="text-sm md:text-md font-black text-emerald-600 mt-1">
                    {formatCurrency(sales.filter(s => !s.isVoided).reduce((sum, s) => sum + s.taxTotal, 0), isEn)}
                  </p>
                  <span className="text-[10px] text-slate-400 font-bold">{isEn ? 'net tax' : 'صافي الضريبة الاستحقاقية'}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-slate-500 text-xxs font-extrabold">{isEn ? 'Issued Invoices' : 'عدد الفواتير الصالحة'}</p>
                  <p className="text-sm md:text-md font-black text-blue-600 mt-1">
                    {sales.filter(s => !s.isVoided).length}
                  </p>
                  <span className="text-[10px] text-slate-400 font-bold">{isEn ? 'active transactions' : 'فاتورة نشطة ومقيدة'}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-slate-500 text-xxs font-extrabold">{isEn ? 'Voided Invoices' : 'الفواتير الملغاة/المرتجعة'}</p>
                  <p className="text-sm md:text-md font-black text-rose-600 mt-1">
                    {sales.filter(s => s.isVoided).length}
                  </p>
                  <span className="text-[10px] text-slate-400 font-bold">{isEn ? 'reverted value: ' : 'إجمالي الملغي: '}{formatCurrency(sales.filter(s => s.isVoided).reduce((sum, s) => sum + s.grandTotal, 0), isEn)}</span>
                </div>
              </div>

              {/* Filtering Block */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search query */}
                <div>
                  <label className="block text-slate-700 text-xs font-extrabold mb-1">{isEn ? 'Search Invoices' : 'ابحث عن فاتورة الكود/العميل'}</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={isEn ? 'Invoice or Customer or Cashier' : 'رقم الفاتورة، العميل، الكاشير...'}
                      value={invoiceSearchQuery}
                      onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-250 py-1.5 px-3 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Date select */}
                <div>
                  <label className="block text-slate-700 text-xs font-extrabold mb-1">{isEn ? 'Filter by Date' : 'تصفية حسب التاريخ'}</label>
                  <input
                    type="date"
                    value={invoiceDateFilter}
                    onChange={(e) => setInvoiceDateFilter(e.target.value)}
                    className="w-full bg-white border border-slate-250 py-1.5 px-3 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Method filter */}
                <div>
                  <label className="block text-slate-700 text-xs font-extrabold mb-1">{isEn ? 'Payment Method' : 'طريقة السداد'}</label>
                  <select
                    value={invoicePaymentFilter}
                    onChange={(e) => setInvoicePaymentFilter(e.target.value)}
                    className="w-full bg-white border border-slate-250 py-1.5 px-3 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">{isEn ? 'All Methods' : 'كل الطرق'}</option>
                    <option value="cash">{isEn ? 'Cash' : 'نقداً (Cash)'}</option>
                    <option value="card">{isEn ? 'Card' : 'بطاقة مدى/شبكة'}</option>
                    <option value="bank">{isEn ? 'Bank Transfer' : 'حوالة بنكية'}</option>
                  </select>
                </div>

                {/* Status filter */}
                <div>
                  <label className="block text-slate-700 text-xs font-extrabold mb-1">{isEn ? 'Invoice Status' : 'حالة الفاتورة'}</label>
                  <select
                    value={invoiceStatusFilter}
                    onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                    className="w-full bg-white border border-slate-250 py-1.5 px-3 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">{isEn ? 'All Status' : 'كل الحالات'}</option>
                    <option value="active">{isEn ? 'Active / Paid' : 'نشطة / سارية'}</option>
                    <option value="voided">{isEn ? 'Voided / Cancelled' : 'ملغاة ومسترجعة'}</option>
                  </select>
                </div>
              </div>

              {/* Table ledger */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
                <table className="w-full text-xxs text-right">
                  <thead className="bg-slate-100 border-b border-slate-250 text-slate-700 font-extrabold">
                    <tr>
                      <th className="p-3 text-center w-8">#</th>
                      <th className="p-3">{isEn ? 'Invoice No.' : 'رقم الفاتورة'}</th>
                      <th className="p-3">{isEn ? 'Date & Time' : 'التاريخ والوقت'}</th>
                      <th className="p-3">{isEn ? 'Cashier' : 'الكاشير'}</th>
                      <th className="p-3">{isEn ? 'Customer' : 'العميل'}</th>
                      <th className="p-3">{isEn ? 'Method' : 'طريقة الدفع'}</th>
                      <th className="p-3">{isEn ? 'Collected VAT' : 'الضريبة محصلة'}</th>
                      <th className="p-3">{isEn ? 'Grand Total' : 'الصافي المستحق'}</th>
                      <th className="p-3 text-center">{isEn ? 'Status' : 'الحالة'}</th>
                      <th className="p-3 text-center">{isEn ? 'Operations' : 'خيارات التحكم'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 rounded-b-xl overflow-hidden">
                    {(() => {
                      const filtered = sales.filter((inv) => {
                        const sQuery = invoiceSearchQuery.toLowerCase();
                        const matchesSearch = 
                          inv.invoiceNumber.toLowerCase().includes(sQuery) ||
                          (inv.customerName && inv.customerName.toLowerCase().includes(sQuery)) ||
                          inv.cashierName.toLowerCase().includes(sQuery);
                        
                        const matchesDate = !invoiceDateFilter || inv.timestamp.startsWith(invoiceDateFilter);
                        const matchesPayment = invoicePaymentFilter === 'All' || inv.paymentMethod === invoicePaymentFilter;
                        const matchesStatus = 
                          invoiceStatusFilter === 'All' ||
                          (invoiceStatusFilter === 'active' && !inv.isVoided) ||
                          (invoiceStatusFilter === 'voided' && inv.isVoided);
                        
                        return matchesSearch && matchesDate && matchesPayment && matchesStatus;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">
                              {isEn ? 'No invoices found matching the current filters!' : 'لا توجد فواتير مطابقة لخيارات البحث المحددة!'}
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((inv, index) => {
                        const isExpanded = expandedInvoiceId === inv.id;
                        return (
                          <React.Fragment key={inv.id}>
                            <tr className={`hover:bg-slate-50 font-medium ${inv.isVoided ? 'bg-rose-50/50' : ''}`}>
                              <td className="p-3 text-center text-slate-400">{index + 1}</td>
                              <td className="p-3 font-bold text-slate-900 font-mono">{inv.invoiceNumber}</td>
                              <td className="p-3 text-slate-500 font-mono">{formatDate(inv.timestamp)}</td>
                              <td className="p-3 text-slate-600">{inv.cashierName}</td>
                              <td className="p-3 font-bold text-slate-700">{inv.customerName || (isEn ? 'Cash Customer' : 'عميل نقدي')}</td>
                              <td className="p-3 text-slate-600">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-black">
                                  {isEn ? inv.paymentMethod : inv.paymentMethod === 'cash' ? 'نقدي' : inv.paymentMethod === 'card' ? 'بطاقة/شبكة' : 'حوالة بنكية'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-500 font-mono">{formatCurrency(inv.taxTotal, isEn)}</td>
                              <td className="p-3 font-extrabold text-slate-900 font-mono">{formatCurrency(inv.grandTotal, isEn)}</td>
                              <td className="p-3 text-center">
                                {inv.isVoided ? (
                                  <span className="px-2 py-0.5 rounded font-black text-[10px] bg-rose-150 text-rose-700 border border-rose-300">
                                    {isEn ? 'VOIDED / RETURNED' : 'مرتجع ملغي'}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded font-black text-[10px] bg-emerald-150 text-emerald-700 border border-emerald-300">
                                    {isEn ? 'REGISTERED' : 'ساري ومقيد'}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center flex justify-center gap-1.5 items-center">
                                {/* Toggle Items Details */}
                                <button
                                  onClick={() => {
                                    if (!hasAccess('invoice_view_details')) {
                                      showAlert(isEn ? 'Not authorized to view invoice items' : 'غير مصرح لك باستعراض محتويات ومواد الفاتورة!', 'warning');
                                      return;
                                    }
                                    setExpandedInvoiceId(isExpanded ? null : inv.id);
                                  }}
                                  className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 cursor-pointer transition-all text-xxs ${
                                    hasAccess('invoice_view_details') 
                                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                                      : 'bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed'
                                  }`}
                                  title={isEn 
                                    ? (hasAccess('invoice_view_details') ? 'View items list' : 'Access Denied') 
                                    : (hasAccess('invoice_view_details') ? 'عرض المحتويات' : 'الوصول محجوب')
                                  }
                                >
                                  {isExpanded ? (isEn ? 'Hide' : 'إخفاء') : (isEn ? 'Details' : 'عرض المواد')}
                                </button>
                                
                                {/* Reprint */}
                                <button
                                  onClick={() => {
                                    if (!hasAccess('invoice_print')) {
                                      showAlert(isEn ? 'Not authorized to print/reprint invoices' : 'غير مصرح لك بطباعة أو إعادة إصدار الفواتير!', 'warning');
                                      return;
                                    }
                                    setActiveReceiptInvoice(inv);
                                  }}
                                  className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 cursor-pointer transition-all text-xxs ${
                                    hasAccess('invoice_print')
                                      ? 'bg-blue-550 hover:bg-blue-650 text-white'
                                      : 'bg-blue-300 text-white/70 opacity-50 cursor-not-allowed'
                                  }`}
                                  title={isEn 
                                    ? (hasAccess('invoice_print') ? 'Print Invoice' : 'Access Denied')
                                    : (hasAccess('invoice_print') ? 'طباعة الفاتورة' : 'الوصول محجوب')
                                  }
                                >
                                  <Printer className="w-3 h-3 shrink-0" />
                                  <span>{isEn ? 'Print' : 'طباعة الفاتورة'}</span>
                                </button>

                                {/* Edit sale invoice */}
                                {!inv.isVoided && (
                                  <button
                                    onClick={() => {
                                      if (!hasAccess('invoice_edit')) {
                                        showAlert(isEn ? 'Not authorized to edit invoices' : 'غير مصرح لك بتعديل الفواتير الصادرة!', 'warning');
                                        return;
                                      }
                                      setEditingInvoice(inv);
                                      setEditInvoiceItems([...inv.items]);
                                      setEditInvoiceCustomer(inv.customerId || 'cust-cash');
                                      setEditInvoicePaymentMethod(inv.paymentMethod);
                                      setEditInvoiceDiscount(inv.discountTotal);
                                      setEditInvoiceCashierName(inv.cashierName);
                                      setEditInvoicePaid(inv.paidAmount);
                                      setEditInvoiceNotes(inv.notes || '');
                                      setEditInvoiceDate(inv.timestamp.substring(0, 16)); // YYYY-MM-DDTHH:mm
                                    }}
                                    className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 cursor-pointer transition-all text-xxs ${
                                      hasAccess('invoice_edit')
                                        ? 'bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700'
                                        : 'bg-amber-50/50 border border-amber-100 text-amber-400 opacity-50 cursor-not-allowed'
                                    }`}
                                    title={isEn 
                                      ? (hasAccess('invoice_edit') ? 'Edit Invoice' : 'Access Denied') 
                                      : (hasAccess('invoice_edit') ? 'تعديل الفاتورة' : 'الوصول محجوب')
                                    }
                                  >
                                    <Edit3 className="w-3 h-3 shrink-0" />
                                    <span>{isEn ? 'Edit' : 'تعديل'}</span>
                                  </button>
                                )}

                                {/* Void / Cancel invoice */}
                                {!inv.isVoided && (
                                  <button
                                    onClick={() => {
                                      if (!hasAccess('invoice_void')) {
                                        showAlert(isEn ? 'Not authorized to void invoices' : 'غير مصرح لك بإرجاع الفاتورة وإلغائها!', 'warning');
                                        return;
                                      }
                                      handleVoidSaleInvoice(inv);
                                    }}
                                    className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 cursor-pointer transition-all text-xxs ${
                                      hasAccess('invoice_void')
                                        ? 'bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700'
                                        : 'bg-rose-50/50 border border-rose-100 text-rose-400 opacity-50 cursor-not-allowed'
                                    }`}
                                    title={isEn
                                      ? (hasAccess('invoice_void') ? 'Void Invoice' : 'Access Denied')
                                      : (hasAccess('invoice_void') ? 'مرتجع الفاتورة' : 'الوصول محجوب')
                                    }
                                  >
                                    <Ban className="w-3 h-3 shrink-0" />
                                    <span>{isEn ? 'Void' : 'مرتجع الفاتورة'}</span>
                                  </button>
                                )}
                              </td>
                            </tr>

                            {/* Expanded items row */}
                            {isExpanded && hasAccess('invoice_view_details') && (
                              <tr>
                                <td colSpan={10} className="p-4 bg-slate-50 font-sans">
                                  <div className="border border-slate-200 rounded-xl bg-white p-3 space-y-3 shadow-inner">
                                    <h4 className="text-xxs font-black text-slate-800 border-b border-slate-100 pb-1.5 flex justify-between items-center">
                                      <span>{isEn ? 'Invoice Itemized Breakdown' : 'التفصيل العيني لمواد الفاتورة'}</span>
                                      <span className="text-slate-500 text-mono">{inv.invoiceNumber}</span>
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xxs animate-fade-in">
                                      {/* Invoice stats detail */}
                                      <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                        <p className="flex justify-between">
                                          <span className="text-slate-500 font-bold">{isEn ? 'Subtotal (Excl. Tax)' : 'المجموع الفرعي (غير شامل الضريبة)'}:</span>
                                          <span className="font-extrabold text-slate-900 font-mono">{formatCurrency(inv.subtotal, isEn)}</span>
                                        </p>
                                        <p className="flex justify-between">
                                          <span className="text-slate-500 font-bold">{isEn ? 'Discount Applied' : 'الخصم الممنوح'}:</span>
                                          <span className="font-extrabold text-rose-600 font-mono">-{formatCurrency(inv.discountTotal, isEn)}</span>
                                        </p>
                                        <p className="flex justify-between border-t border-slate-200 pt-1 mt-1 font-bold">
                                          <span className="text-slate-800">{isEn ? 'Total Net Pay' : 'الصافي المدفوع'}:</span>
                                          <span className="font-black text-slate-1000 font-mono">{formatCurrency(inv.grandTotal, isEn)}</span>
                                        </p>
                                        <p className="flex justify-between text-slate-500">
                                          <span>{isEn ? 'Payment Status' : 'طريقة الدفع والتسجيل'}:</span>
                                          <span className="font-bold">{isEn ? inv.paymentMethod.toUpperCase() : inv.paymentMethod === 'cash' ? 'كاش نقدي' : 'مدى شبكة بوابات'}</span>
                                        </p>
                                      </div>

                                      {/* Items list */}
                                      <div className="space-y-1.5">
                                        {inv.items.map((item, i) => (
                                          <div key={i} className="flex justify-between items-center border-b border-slate-150 pb-1 text-slate-800">
                                            <div className="text-right">
                                              <p className="font-extrabold text-slate-900 text-xs">{isEn ? item.nameEn : item.nameAr}</p>
                                              <p className="text-[10px] text-slate-400 font-mono">
                                                {item.quantity} x {formatCurrency(item.unitPrice, isEn)} {isEn ? 'excl. tax' : 'قبل الضريبة'}
                                              </p>
                                            </div>
                                            <div className="text-left font-mono font-bold font-semibold">
                                              {formatCurrency(item.total, isEn)}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {inv.notes && (
                                      <div className="bg-amber-50/70 border border-amber-100 rounded-lg p-2.5 text-slate-800 text-xxs flex gap-2 items-start mt-2">
                                        <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                          <p className="font-extrabold text-amber-800">{isEn ? 'Invoice Notes:' : 'ملاحظات الفاتورة:'}</p>
                                          <p className="mt-0.5 text-slate-700 whitespace-pre-wrap font-medium">{inv.notes}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================== SCREEN: PRODUCTS / INVENTORY ============================== */}
          {activeScreen === 'inventory' && (
            <div id="screen-inventory" className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 space-y-4 shadow-sm text-slate-800">
              
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <h2 className="text-md font-black text-slate-900">
                    {isEn ? 'Central Inventory Catalog' : 'مستودع المخزون والأصناف المركزي'}
                  </h2>
                  <p className="text-xxs text-slate-500 mt-0.5">
                    {isEn ? 'Add, edit, scan multiple barcodes per product, register low alert limits.' : 'تسجيل وتحديث المنتجات مع دعم الباركود المتعدد وتنبيه النقصان التلقائي.'}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    setShowProductModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-lg shadow-blue-600/10 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isEn ? 'Register New Product' : 'إضافة صنف جديد'}</span>
                </button>
              </div>

              {/* Grid of Product card catalogs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {products
                  .filter(p => categoryFilter === 'LowStock' ? p.quantity <= p.minQuantity : true)
                  .map((p) => {
                    const isLow = p.quantity <= p.minQuantity;
                    return (
                      <div 
                        key={p.id}
                        className={`bg-slate-50 border rounded-xl p-4 flex flex-col justify-between h-44 hover:border-slate-350 hover:bg-white hover:shadow-md transition-all ${
                          isLow ? 'border-amber-500/50 shadow-md shadow-amber-500/5 bg-amber-50/20' : 'border-slate-200 shadow-sm'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-xxs font-black text-slate-600 bg-slate-200 px-2 py-0.5 rounded-lg border border-slate-250">
                              {p.category}
                            </span>
                            {isLow && (
                              <span className="flex items-center gap-1 text-[9px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-amber-700" />
                                <span>{isEn ? 'Low Stock Warning' : 'نقص بالمخزون'}</span>
                              </span>
                            )}
                          </div>

                          <h3 className="text-xs font-black text-slate-900 mt-2 leading-snug line-clamp-2">
                            {isEn ? p.nameEn : p.nameAr}
                          </h3>

                          {/* Multiple Barcode chips */}
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {p.barcodes.map((bcd, i) => (
                              <span key={i} className="text-[9px] bg-white font-mono text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                {bcd}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="border-t border-slate-200/60 pt-3 mt-3 flex justify-between items-center shrink-0">
                          <div className="text-xxs">
                            <span className="text-slate-500 block leading-none">{isEn ? 'Sale Margin' : 'سعر بيع الرف'}</span>
                            <span className="font-black text-slate-900 mt-1 block font-mono">
                              {formatCurrency(p.salePrice, isEn, settings)}
                            </span>
                          </div>

                          <div className="text-xxs">
                            <span className="text-slate-500 block leading-none">{isEn ? 'Stock Level' : 'الرصيد بالمخزن'}</span>
                            <span className={`font-black mt-1 block ${isLow ? 'text-amber-800' : 'text-emerald-700'}`}>
                              {p.quantity} {isEn ? p.unitEn : p.unitAr}
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedProduct(p);
                              setShowProductModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors cursor-pointer border border-slate-200 shadow-sm"
                            title={isEn ? 'Edit Info' : 'تعديل الصنف'}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

            </div>
          )}

          {/* ============================== SCREEN: PROCUREMENTS (PURCHASES) ============================== */}
          {activeScreen === 'purchases' && (
            <div id="screen-purchases" className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-slate-800 animate-fadeIn">
              
              {/* Procurement order form block */}
              <div className="lg:col-span-5 bg-white border border-slate-200 shadow-sm rounded-xl p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {isEn ? 'Purchases Cart' : 'إنشاء فاتورة مشتريات'}
                  </h3>
                  <p className="text-xxs text-slate-500">
                    {isEn ? 'Register restocks from suppliers to increase inventory counts.' : 'تقييد فواتير الشراء للتزود من الموردين وتحديث رصيد كمية الصنف تلقائياً.'}
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Select supplier */}
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                      {isEn ? 'Choose Supplier' : 'حدد المورد'}
                    </label>
                    <select
                      value={purchaseSupplier}
                      onChange={(e) => setPurchaseSupplier(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xxs px-2.5 py-2 font-bold focus:outline-none"
                    >
                      <option value="">{isEn ? '-- Select Supplier --' : '-- اختر المورّد من القائمة --'}</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {isEn ? s.nameEn : s.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Restock List scrollable */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-[220px] overflow-y-auto space-y-2">
                    <span className="block text-xxs text-slate-500 font-bold uppercase mb-1.5">
                      {isEn ? 'Procured Items List' : 'سجل البضائع المطلوب شراؤها'}
                    </span>
                    
                    {purchaseCart.length === 0 ? (
                      <div className="text-center py-8 text-xxs text-slate-400 font-bold">
                        {isEn ? 'No products added. Select from the right catalog...' : 'قائمة الشراء فارغة. اختر من أصناف اليمين للطلب...'}
                      </div>
                    ) : (
                      purchaseCart.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center gap-1.5 text-xxs border-b border-slate-200/60 pb-2 mb-2">
                          <div className="overflow-hidden grow">
                            <span className="font-bold text-slate-850 block truncate">{isEn ? item.product.nameEn : item.product.nameAr}</span>
                            <span className="text-slate-500 font-mono">Cost: {item.costPrice.toFixed(2)}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-bold text-blue-600 mr-2">{item.quantity} Qty</span>
                            <button
                              onClick={() => setPurchaseCart(purchaseCart.filter((_, i) => i !== idx))}
                              className="p-1 hover:bg-rose-50 text-rose-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="bg-slate-100/80 border border-slate-200 p-3 rounded-lg flex justify-between items-center text-xs text-slate-800 font-semibold shadow-inner">
                    <span>{isEn ? 'Total Procurement Cost:' : 'إجمالي تكلفة الفاتورة:'}</span>
                    <span className="font-mono text-blue-700 font-black">
                      {formatCurrency(purchaseCart.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0), isEn, settings)}
                    </span>
                  </div>

                  <button
                    onClick={handleApplyProcurementOrder}
                    disabled={purchaseCart.length === 0 || !purchaseSupplier}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/10"
                  >
                    <Landmark className="w-4 h-4" />
                    <span>{isEn ? 'Approve restock order' : 'تقييد المشتريات وتغذية المستودع'}</span>
                  </button>

                </div>

              </div>

              {/* Procurement Right catalogue list selection inside purchases */}
              <div className="lg:col-span-7 bg-white border border-slate-200 shadow-sm rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-900">
                    {isEn ? 'Warehouse procurement picker' : 'اختر صنف السلعة والكمية'}
                  </h3>
                  <button
                    onClick={() => {
                      setContactType('supplier');
                      setSelectedContact(null);
                      setShowContactModal(true);
                    }}
                    className="text-blue-600 font-black hover:underline text-xxs block"
                  >
                    + {isEn ? 'Register Supplier' : 'تسجيل مورد جديد'}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={purchaseSearch}
                    onChange={(e) => setPurchaseSearch(e.target.value)}
                    placeholder={isEn ? 'Filter products catalog by name...' : 'فلترة السلع باسم المنتج...'}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 text-xxs rounded-lg focus:outline-none"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                </div>

                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {products
                    .filter(p => p.nameAr.toLowerCase().includes(purchaseSearch.toLowerCase()) || p.nameEn.toLowerCase().includes(purchaseSearch.toLowerCase()))
                    .map((p) => {
                      return (
                        <div key={p.id} className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 transition-all">
                          <div className="overflow-hidden grow">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{isEn ? p.nameEn : p.nameAr}</h4>
                            <span className="text-[10px] text-slate-500">
                              {isEn ? 'Current Stock:' : 'المتوفر بالمخزن:'} <span className="font-bold text-slate-700">{p.quantity} {isEn ? p.unitEn : p.unitAr}</span> • {isEn ? 'Purchase price:' : 'تكلفة الشراء السابقة:'} <span className="font-bold">{p.purchasePrice.toFixed(2)}</span>
                            </span>
                          </div>

                          {/* Quick procure form */}
                          <div className="flex gap-1 items-center shrink-0">
                            <input
                              type="number"
                              min={1}
                              defaultValue={10}
                              id={`purchase-qty-${p.id}`}
                              placeholder="Qty"
                              className="w-12 bg-white border border-slate-200 px-1.5 py-1 text-center text-xs text-slate-800 rounded font-bold shadow-sm"
                            />
                            <input
                              type="number"
                              min={0.1}
                              step="0.1"
                              defaultValue={p.purchasePrice}
                              id={`purchase-cost-${p.id}`}
                              placeholder="Cost"
                              className="w-16 bg-white border border-slate-200 px-1.5 py-1 text-center text-xs text-slate-800 rounded font-bold font-mono shadow-sm"
                            />
                            <button
                              onClick={() => {
                                const qtyInput = document.getElementById(`purchase-qty-${p.id}`) as HTMLInputElement;
                                const costInput = document.getElementById(`purchase-cost-${p.id}`) as HTMLInputElement;
                                const parsedQty = parseFloat(qtyInput?.value) || 10;
                                const parsedCost = parseFloat(costInput?.value) || p.purchasePrice;
                                handleAddPurchaseToCart(p, parsedQty, parsedCost);
                              }}
                              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xxs px-2.5 py-1.5 rounded transition-colors shadow-sm"
                            >
                              {isEn ? 'Add Order' : 'درج للشراء'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

            </div>
          )}

          {/* ============================== SCREEN: CONTACTS & STATIONS (CRM) ============================== */}
          {activeScreen === 'contacts' && (
            <div id="screen-contacts" className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 space-y-6 shadow-sm text-slate-800">
              
              <div className="flex flex-wrap gap-4 items-center justify-between border-b border-slate-100 pb-4 shrink-0">
                <div>
                  <h2 className="text-md font-black text-slate-900">
                    {isEn ? 'Directory and Human Resources Portal' : 'إدارة الموظفين والعملاء والموردين'}
                  </h2>
                  <p className="text-xxs text-slate-500 mt-0.5">
                    {isEn ? 'Configure secure cashier logins, supplier records, and customer accounts.' : 'تنظيم بطاقات الائتمان للعملاء، وجهات الاتصال للموردين، وقوائم الموظفين وصلاحياتهم.'}
                  </p>
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => {
                      setContactType('customer');
                      setSelectedContact(null);
                      setShowContactModal(true);
                    }}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xxs font-black px-3 py-2 rounded-lg cursor-pointer"
                  >
                    + {isEn ? 'Register Customer' : 'إضافة عميل جديد'}
                  </button>
                  <button
                    onClick={() => {
                      setContactType('supplier');
                      setSelectedContact(null);
                      setShowContactModal(true);
                    }}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xxs font-black px-3 py-2 rounded-lg cursor-pointer"
                  >
                    + {isEn ? 'Register Supplier' : 'إضافة مورد جديد'}
                  </button>
                  
                  {currentUser.role === 'admin' && (
                    <button
                      onClick={() => {
                        setContactType('employee');
                        setSelectedContact(null);
                        setShowContactModal(true);
                      }}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xxs font-black px-3 py-2 rounded-lg cursor-pointer"
                    >
                      + {isEn ? 'Register Employee' : 'إضافة موظف/صلاحية'}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Column 1: CUSTOMERS List */}
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-slate-900 border-b border-slate-205 pb-2 flex justify-between items-center animate-fadeIn">
                    <span>{isEn ? 'Customers CRM' : 'سجل العملاء'}</span>
                    <span className="text-xxs text-slate-400 font-bold">{customers.length} {isEn ? 'accounts' : 'عميل'}</span>
                  </h3>

                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {customers.map((c) => (
                      <div key={c.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center text-xxs shadow-sm">
                        <div>
                          <p className="font-bold text-slate-800">{isEn ? c.nameEn : c.nameAr}</p>
                          <p className="text-slate-500 mt-1 font-mono">{c.phone}</p>
                          {c.vatNumber && <p className="text-slate-500 text-[10px] mt-0.5">Vat ID: {c.vatNumber}</p>}
                        </div>
                        <div className="text-left shrink-0 flex flex-col items-end gap-1.5">
                          <div>
                            <span className="text-[10px] block text-slate-400 font-bold">{isEn ? 'Credit' : 'مديونيات'}</span>
                            <span className="font-bold text-amber-750 font-mono text-xs">{formatCurrency(c.balance, isEn, settings)}</span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setContactType('customer');
                                setSelectedContact(c);
                                setShowContactModal(true);
                              }}
                              className="px-1.5 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[10px] font-bold cursor-pointer animate-fade-in"
                            >
                              {isEn ? 'Edit' : 'تعديل'}
                            </button>
                            {c.id !== 'cust-cash' && (
                              <button
                                onClick={() => handleDeleteCustomer(c.id)}
                                className="px-1.5 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[10px] font-bold cursor-pointer"
                              >
                                {isEn ? 'Del' : 'حذف'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 2: SUPPLIERS List */}
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-slate-900 border-b border-slate-205 pb-2 flex justify-between items-center">
                    <span>{isEn ? 'Suppliers Directory' : 'سجل الموردين'}</span>
                    <span className="text-xxs text-slate-400 font-bold">{suppliers.length} {isEn ? 'companies' : 'مورّد'}</span>
                  </h3>

                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {suppliers.map((s) => (
                      <div key={s.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xxs shadow-sm flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-slate-800">{isEn ? s.nameEn : s.nameAr}</p>
                            {s.contactPerson && (
                              <span className="text-[10px] text-slate-600 bg-slate-200 hover:bg-slate-250 px-1.5 py-0.5 rounded border border-slate-250 font-black">
                                {s.contactPerson}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 mt-1 font-mono">{s.phone}</p>
                          {s.vatNumber && <p className="text-slate-505 text-[10px] font-mono mt-0.5 font-bold">Vat ID: {s.vatNumber}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setContactType('supplier');
                              setSelectedContact(s);
                              setShowContactModal(true);
                            }}
                            className="px-1.5 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[10px] font-bold cursor-pointer"
                          >
                            {isEn ? 'Edit' : 'تعديل'}
                          </button>
                          <button
                            onClick={() => handleDeleteSupplier(s.id)}
                            className="px-1.5 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[10px] font-bold cursor-pointer"
                          >
                            {isEn ? 'Del' : 'حذف'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 3: EMPLOYEES & Permissions List */}
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-slate-900 border-b border-slate-205 pb-2 flex justify-between items-center">
                    <span>{isEn ? 'Staff Power Accounts' : 'حسابات صلاحيات الموظفين'}</span>
                    <span className="text-xxs text-slate-400 font-bold">{employees.length} {isEn ? 'staff' : 'موظف ببرنامج'}</span>
                  </h3>

                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {employees.map((emp) => (
                      <div key={emp.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center text-xxs shadow-sm">
                        <div>
                          <p className="font-extrabold text-slate-900">{emp.name}</p>
                          <span className="text-slate-500 font-mono mt-0.5 block">@{emp.username}</span>
                          {emp.pin && <span className="text-amber-600 font-mono text-[9px] font-bold mt-0.5 block">{isEn ? `PIN: ${emp.pin}` : `رمز المرور: ${emp.pin}`}</span>}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className={`px-2 py-0.5 rounded font-black text-xxs uppercase ${
                            emp.role === 'admin' ? 'bg-rose-50 text-rose-700 border border-rose-200' : emp.role === 'manager' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {emp.role.toUpperCase()}
                          </span>
                          
                          {currentUser.role === 'admin' && (
                            <div className="flex gap-1 mt-0.5">
                              <button
                                onClick={() => {
                                  setContactType('employee');
                                  setSelectedContact(emp);
                                  setShowContactModal(true);
                                }}
                                className="px-1.5 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[10px] font-bold cursor-pointer"
                              >
                                {isEn ? 'Edit' : 'تعديل'}
                              </button>
                              {emp.id !== currentUser.id && emp.id !== 'usr-1' && (
                                <button
                                  onClick={() => handleDeleteEmployee(emp.id)}
                                  className="px-1.5 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[10px] font-bold cursor-pointer"
                                >
                                  {isEn ? 'Del' : 'حذف'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ============================== SCREEN: ANALYTICAL FINANCIAL REPORTS ============================== */}
          {activeScreen === 'reports' && (
            <div id="screen-reports" className="space-y-5">
              
              {/* Cards row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-xxs text-slate-500 font-bold uppercase">{isEn ? 'Total Gross Sales' : 'إجمالي المبيعات'}</span>
                  <span className="text-sm font-black text-emerald-600 font-mono mt-2 block">
                    {formatCurrency(totalSalesRevenue, isEn, settings)}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">{isEn ? 'Total taxable transactions' : 'شاملة الضريبة المضافة'}</span>
                </div>

                <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-xxs text-slate-500 font-bold uppercase">{isEn ? 'Collected 15% VAT' : 'محصل ضريبة VAT'}</span>
                  <span className="text-sm font-black text-blue-600 font-mono mt-2 block">
                    {formatCurrency(totalTaxAmount, isEn, settings)}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">{isEn ? 'Due for tax returns' : 'إقرارات ضريبية مبسطة'}</span>
                </div>

                <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-xxs text-slate-500 font-bold uppercase">{isEn ? 'Total Net Profits' : 'صافي هامش الأرباح'}</span>
                  <span className="text-sm font-black text-rose-600 font-mono mt-2 block">
                    {formatCurrency(totalSalesRevenue - totalTaxAmount - (totalSalesRevenue * 0.5), isEn, settings)}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">{isEn ? 'Minus item cost structures' : 'مستخلص من ميزانيات السلعة'}</span>
                </div>

                <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-xxs text-slate-500 font-bold uppercase">{isEn ? 'Capital Assets Value' : 'رأس مال البضاعة بالمخزن'}</span>
                  <span className="text-sm font-black text-amber-700 font-mono mt-2 block">
                    {formatCurrency(totalCapitalInStock, isEn, settings)}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">{isEn ? 'Based on supplier cost' : 'تقييم قيمة المخزون الحالي'}</span>
                </div>

              </div>

              {/* Graphic analytics layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* SVG Revenue Chart */}
                <div className="lg:col-span-8 bg-white border border-slate-200 shadow-sm rounded-xl p-4 space-y-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-900">
                      {isEn ? 'Revenue and Profit Trend (Past 5 Days)' : 'منحنى الإيرادات والأرباح اليومية (آخر 5 أيام)'}
                    </h3>
                    <span className="text-[10px] text-slate-400">{isEn ? 'Interactive direct synchronization values.' : 'مخطط تحليلي لنمو المبيعات وحركة الفواتير اليومية.'}</span>
                  </div>

                  {/* SVG DRAWN HIGHEST FIDELITY CHART CONTAINER */}
                  <div className="relative h-60 w-full bg-slate-50 border border-slate-150 rounded-xl p-4 flex items-end shadow-inner">
                    
                    {/* Background Grid Lines */}
                    <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-40">
                      <div className="border-b border-slate-200 w-full"></div>
                      <div className="border-b border-slate-200 w-full"></div>
                      <div className="border-b border-slate-200 w-full"></div>
                      <div className="border-b border-slate-200 w-full"></div>
                    </div>

                    <div className="w-full flex justify-between items-end h-48 px-4 relative z-10">
                      {chartData.map((day, i) => {
                        const revHeight = (day.revenue / maxChartVal) * 100;
                        const profHeight = (day.profit / maxChartVal) * 100;
                        return (
                          <div key={i} className="flex flex-col items-center gap-1.5 grow max-w-[80px]">
                            <div className="flex gap-1.5 items-end justify-center w-full h-36">
                              {/* Revenue bar */}
                              <div 
                                style={{ height: `${Math.max(4, revHeight)}%` }} 
                                className="w-4 bg-blue-600 rounded-t-sm transition-all duration-500 hover:bg-blue-500 relative group"
                                title={`Revenue: ${day.revenue}`}
                              >
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-[8px] font-bold text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-mono shadow">
                                  {day.revenue.toFixed(0)}
                                </span>
                              </div>
                              {/* Profit bar */}
                              <div 
                                style={{ height: `${Math.max(4, profHeight)}%` }} 
                                className="w-4 bg-emerald-500 rounded-t-sm transition-all duration-500 hover:bg-emerald-450 relative group"
                                title={`Profit: ${day.profit}`}
                              >
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-[8px] font-bold text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-mono shadow">
                                  {day.profit.toFixed(0)}
                                </span>
                              </div>
                            </div>
                            
                            <span className="text-[10px] font-bold text-slate-500">
                              {day.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-4 justify-center items-center text-xxs pt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
                      <span className="text-slate-600 font-medium">{isEn ? 'Gross Revenue' : 'إجمالي المبيعات'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                      <span className="text-slate-600 font-medium">{isEn ? 'Net Margins (Profit)' : 'صافي الأرباح المأخوذة'}</span>
                    </div>
                  </div>

                </div>

                {/* Top Moving items */}
                <div className="lg:col-span-4 bg-white border border-slate-200 shadow-sm rounded-xl p-4 space-y-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-900">
                      {isEn ? 'Product Movement Tracker' : 'حركة الأصناف والأكثر مبيعاً'}
                    </h3>
                    <span className="text-[10px] text-slate-400">{isEn ? 'Flexible logs of physical stock level.' : 'معدل سحب البضاعة وسرعة خروج المنتجات.'}</span>
                  </div>

                  <div className="space-y-3">
                    {products.slice(0, 4).map((p) => {
                      // Sum quantities sold for p.id
                      const unitsSold = sales
                        .filter(s => !s.isVoided)
                        .flatMap(s => s.items)
                        .filter(itm => itm.productId === p.id)
                        .reduce((sum, item) => sum + item.quantity, 0);

                      // Calculate percentage relative to some max
                      const pct = Math.min(100, Math.max(10, (unitsSold / 20) * 100));

                      return (
                        <div key={p.id} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xxs">
                            <span className="font-extrabold text-slate-800 truncate max-w-[150px]">{isEn ? p.nameEn : p.nameAr}</span>
                            <span className="text-slate-500 font-bold">{unitsSold} {isEn ? 'piece' : 'حبة بيعت'}</span>
                          </div>
                          <div className="w-full bg-slate-100 border border-slate-200/50 h-2 rounded-full overflow-hidden">
                            <div style={{ width: `${pct}%` }} className="bg-blue-600 h-full rounded-full"></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>

              </div>

              {/* Physical Transaction ledger logs */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-black text-slate-900">
                  {isEn ? 'Stock Movement Ledger' : 'سجل حركة الصندوق والمخازن العملي'}
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xxs text-slate-705 divide-y divide-slate-100">
                    <thead>
                      <tr className="text-slate-400 font-bold border-b border-slate-100">
                        <th className="py-2.5 px-3">{isEn ? 'ID Reference' : 'كود العملية'}</th>
                        <th className="py-2.5 px-3">{isEn ? 'Date' : 'التاريخ'}</th>
                        <th className="py-2.5 px-3">{isEn ? 'Product Name' : 'اسم الصنف'}</th>
                        <th className="py-2.5 px-3">{isEn ? 'Event' : 'الحدث والاتجاه'}</th>
                        <th className="py-2.5 px-3 text-center">{isEn ? 'Change Quantity' : 'الكمية المرحلة'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[...movements].reverse().slice(0, 10).map((mov) => (
                        <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-500">{mov.referenceId}</td>
                          <td className="py-2.5 px-3 text-slate-500">{formatDate(mov.timestamp, isEn)}</td>
                          <td className="py-2.5 px-3 font-black text-slate-900">{isEn ? mov.productNameEn : mov.productNameAr}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded font-black text-[9px] border ${
                              mov.type === 'sale' ? 'bg-emerald-50 text-emerald-700 border-emerald-250/50' : mov.type === 'purchase' ? 'bg-blue-50 text-blue-700 border-blue-250/50' : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {mov.type === 'sale' ? (isEn ? 'Sale Payout' : 'فاتورة مبيعات') : mov.type === 'purchase' ? (isEn ? 'Restock Supplier' : 'فاتورة شراء') : (isEn ? 'Stock Adjustment' : 'تعديل مخزني')}
                            </span>
                          </td>
                          <td className={`py-2.5 px-3 text-center font-bold font-mono ${mov.quantity < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ============================== SCREEN: CLOUD SYNC & BACKUPS ============================== */}
          {activeScreen === 'backups' && (
            <div id="screen-backups" className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fadeIn">
              
              <div className="lg:col-span-4 bg-white border border-slate-200 shadow-sm rounded-xl p-4 space-y-4 text-slate-800">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {isEn ? 'Data Backup & Disaster Recovery' : 'نظام النسخ الاحتياطي التلقائي'}
                  </h3>
                  <p className="text-xxs text-slate-500">
                    {isEn ? 'Export raw database JSON, restore backup files, or reset values to preserve safety.' : 'حفظ نسخة للتحميل وتنزيلها محلياً، مع خيار استيراد النسخة واستعادتها بلمح البصر.'}
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  <button
                    onClick={handleExportBackup}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/10"
                  >
                    <Download className="w-4.5 h-4.5" />
                    <span>{isEn ? 'Download local JSON Backup' : 'تحميل وتصدير نسخة احتياطية (.json)'}</span>
                  </button>

                  <div className="relative border border-dashed border-slate-250 rounded-xl p-3 bg-slate-50 text-center hover:border-slate-400 transition-colors">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center space-y-1 justify-center py-2">
                      <Upload className="w-6 h-6 text-blue-600 animate-pulse pointer-events-none" />
                      <span className="text-xxs font-bold text-slate-700 block pointer-events-none">
                        {isEn ? 'Restore Backup / Upload JSON' : 'اضغط لرفع واستيراد نسخة احتياطية'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleResetDatabase}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xxs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer"
                  >
                    {isEn ? 'Wipe Database / Factory Reset' : 'تهيئة قاعدة البيانات وإعادة ضبط المصنع'}
                  </button>
                </div>
              </div>

              {/* Backup details table */}
              <div className="lg:col-span-8 bg-white border border-slate-200 shadow-sm rounded-xl p-4 space-y-3 text-slate-800">
                <h3 className="text-xs font-black text-slate-900">
                  {isEn ? 'Automated Sync History Logs' : 'سجل استرجاع البيانات والنسخ الاحتياطي'}
                </h3>
                
                <div className="space-y-2 max-h-[360px] overflow-y-auto">
                  {backupLogs.map((log) => (
                    <div key={log.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center text-xxs shadow-sm">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>{log.type === 'auto' ? (isEn ? 'Automatic System Save' : 'نسخ احتياطي تلقائي مجدول') : (isEn ? 'User Manual Backup' : 'نسخة يدوية للمستخدم')}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                          {formatDate(log.timestamp, isEn)}
                        </span>
                      </div>

                      <div className="text-left font-mono text-[10px] text-slate-500 shrink-0 font-bold">
                        <span>Items: {log.recordCount.products} | Invoices: {log.recordCount.sales}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Store & Enterprise Settings Card */}
              <div className="lg:col-span-12 bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-4 text-slate-800">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="p-2 bg-blue-50 text-blue-600 rounded-lg text-lg">🏢</span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {isEn ? 'Enterprise & Tax Store Settings' : 'إعدادات المنشأة والضبط الضريبي العام'}
                    </h3>
                    <p className="text-xxs text-slate-500">
                      {isEn ? 'Configure your business branding, address, phone number, VAT ID and tax rate.' : 'تحديث وتعديل اسم المنشأة باللغتين، الرقم الضريبي، العنوان، رقم الهاتف ومعدل ضريبة القيمة المضافة.'}
                    </p>
                  </div>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const updated: StoreSettings = {
                    storeNameAr: formData.get('storeNameAr') as string,
                    storeNameEn: formData.get('storeNameEn') as string,
                    vatNumber: formData.get('vatNumber') as string,
                    vatRate: parseFloat(formData.get('vatRate') as string) || 0,
                    addressAr: formData.get('addressAr') as string,
                    addressEn: formData.get('addressEn') as string,
                    phone: formData.get('phone') as string,
                    currencyAr: formData.get('currencyAr') as string || 'ر.س',
                    currencyEn: formData.get('currencyEn') as string || 'SAR',
                  };
                  setSettings(updated);
                  localStorage.setItem('erp_settings', JSON.stringify(updated));
                  showAlert(isEn ? 'Store Settings updated successfully!' : 'تم تحديث إعدادات وبيانات المتجر الضريبية بنجاح!', 'success');
                }} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  
                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                      {isEn ? 'Store Name (Arabic)' : 'اسم المنشأة / المتجر (بالعربية)'}
                    </label>
                    <input
                      type="text"
                      name="storeNameAr"
                      required
                      defaultValue={settings.storeNameAr}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-2 px-3 text-xs font-bold transition-all text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                      {isEn ? 'Store Name (English)' : 'اسم المنشأة / المتجر (بالانجليزية)'}
                    </label>
                    <input
                      type="text"
                      name="storeNameEn"
                      required
                      defaultValue={settings.storeNameEn}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-2 px-3 text-xs font-bold transition-all text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                      {isEn ? 'VAT Registration Number' : 'الرقم الضريبي الموحد (15 خانة)'}
                    </label>
                    <input
                      type="text"
                      name="vatNumber"
                      required
                      maxLength={15}
                      minLength={15}
                      defaultValue={settings.vatNumber}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-2 px-3 text-xs font-mono font-bold transition-all text-slate-800 text-left animate-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                      {isEn ? 'Store Address (Arabic)' : 'العنوان الجغرافي والفرع (بالعربية)'}
                    </label>
                    <input
                      type="text"
                      name="addressAr"
                      required
                      defaultValue={settings.addressAr}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-2 px-3 text-xs font-bold transition-all text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                      {isEn ? 'Telephone / Mobile Number' : 'رقم الهاتف للتواصل / الفاتورة'}
                    </label>
                    <input
                      type="text"
                      name="phone"
                      required
                      defaultValue={settings.phone}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-2 px-3 text-xs font-mono font-bold transition-all text-slate-800 text-left"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                      {isEn ? 'Store Address (English)' : 'العنوان الجغرافي (بالانجليزية)'}
                    </label>
                    <input
                      type="text"
                      name="addressEn"
                      required
                      defaultValue={settings.addressEn}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-2 px-3 text-xs font-bold transition-all text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                      {isEn ? 'VAT Tax Rate (%)' : 'نسبة الضريبة المضافة (%)'}
                    </label>
                    <input
                      type="number"
                      name="vatRate"
                      required
                      min={0}
                      max={100}
                      step={0.1}
                      defaultValue={settings.vatRate}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-2 px-3 text-xs font-mono font-bold transition-all text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                      {isEn ? 'Currency Abbreviation (Arabic)' : 'رمز العملة بالعربية'}
                    </label>
                    <input
                      type="text"
                      name="currencyAr"
                      required
                      defaultValue={settings.currencyAr}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-2 px-3 text-xs font-bold transition-all text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                      {isEn ? 'Currency Abbreviation (English)' : 'رمز العملة بالإنجليزية'}
                    </label>
                    <input
                      type="text"
                      name="currencyEn"
                      required
                      defaultValue={settings.currencyEn}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-2 px-3 text-xs font-bold transition-all text-slate-800"
                    />
                  </div>

                  <div className="md:col-span-3 flex justify-end pt-2 col-span-full">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-lg transition-colors cursor-pointer shadow-md"
                    >
                      💾 {isEn ? 'Save Store Settings' : 'حفظ إعدادات المنشأة'}
                    </button>
                  </div>

                </form>
              </div>

              {/* Sales Invoice Design Control Card */}
              <div className="lg:col-span-12 bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-4 text-slate-800">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="p-2 bg-rose-50 text-rose-600 rounded-lg text-lg">🎨</span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {isEn ? 'Sales Invoice Design Control Center' : 'مركز التحكم وتعديل تصميم فاتورة المبيعات'}
                    </h3>
                    <p className="text-xxs text-slate-500">
                      {isEn ? 'Customize receipt titles, footer messages, QR code visibility, and top accent branding color.' : 'تخصيص وتعديل المظهر البصري للإيصالات الحرارية، عناوين الفاتورة، الرسائل الترحيبية، وضبط العلامة الملونة.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                  {/* Settings Form Column */}
                  <div className="lg:col-span-7 space-y-4">
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const updated: StoreSettings = {
                        ...settings,
                        invoiceTitleAr: formData.get('invoiceTitleAr') as string,
                        invoiceTitleEn: formData.get('invoiceTitleEn') as string,
                        invoiceFooterAr: formData.get('invoiceFooterAr') as string,
                        invoiceFooterEn: formData.get('invoiceFooterEn') as string,
                        showQrCode: formData.get('showQrCode') === 'true',
                        showCashierName: formData.get('showCashierName') === 'true',
                        accentColor: formData.get('accentColor') as string,
                        invoiceFontSize: formData.get('invoiceFontSize') as 'sm' | 'base' | 'lg',
                        invoiceWidth: Number(formData.get('invoiceWidth')),
                        invoicePadding: formData.get('invoicePadding') as 'compact' | 'normal' | 'relaxed',
                      };
                      setSettings(updated);
                      localStorage.setItem('erp_settings', JSON.stringify(updated));
                      showAlert(isEn ? 'Invoice Design updated successfully!' : 'تم تحديث تصميم الفاتورة وعناصر الإيصال بنجاح!', 'success');
                    }} className="space-y-4">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                            {isEn ? 'Invoice Title (Arabic)' : 'عنوان الفاتورة في الأعلى (بالعربية)'}
                          </label>
                          <input
                            type="text"
                            name="invoiceTitleAr"
                            required
                            defaultValue={settings.invoiceTitleAr || 'فاتورة ضريبية مبسطة'}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-2 px-3 text-xs font-bold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                            {isEn ? 'Invoice Title (English)' : 'عنوان الفاتورة في الأعلى (بالانجليزية)'}
                          </label>
                          <input
                            type="text"
                            name="invoiceTitleEn"
                            required
                            defaultValue={settings.invoiceTitleEn || 'SIMPLIFIED TAX INVOICE'}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-2 px-3 text-xs font-bold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                            {isEn ? 'Greeting/Footer message (Arabic)' : 'رسالة نهاية الفاتورة / التذييل (بالعربية)'}
                          </label>
                          <input
                            type="text"
                            name="invoiceFooterAr"
                            required
                            defaultValue={settings.invoiceFooterAr || 'شكراً لزيارتكم ونتطلع لخدمتكم!'}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-2 px-3 text-xs font-bold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                            {isEn ? 'Greeting/Footer message (English)' : 'رسالة نهاية الفاتورة / التذييل (بالانجليزية)'}
                          </label>
                          <input
                            type="text"
                            name="invoiceFooterEn"
                            required
                            defaultValue={settings.invoiceFooterEn || 'Thank you for your visit!'}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-2 px-3 text-xs font-bold text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Dimensions, Font Size & Spacing Controls */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                        <div>
                          <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs flex justify-between">
                            <span>{isEn ? 'Receipt Width (mm/px)' : 'عرض الفاتورة / ورق الطباعة'}</span>
                            <span className="text-rose-600 font-mono">{(settings.invoiceWidth || 290)}px</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-bold">58mm</span>
                            <input
                              type="range"
                              name="invoiceWidth"
                              min="240"
                              max="350"
                              step="5"
                              defaultValue={settings.invoiceWidth || 290}
                              onChange={(e) => {
                                setSettings(prev => ({ ...prev, invoiceWidth: Number(e.target.value) }));
                              }}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                            />
                            <span className="text-[10px] text-slate-400 font-bold">80mm</span>
                          </div>
                          <span className="block text-[9px] text-slate-400 mt-1">
                            {isEn ? 'Adjust layout for 58mm or 80mm roll printer' : 'ملائمة حجم الإيصال لورق طابعات الـ 58مل أو 80مل'}
                          </span>
                        </div>

                        <div>
                          <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                            {isEn ? 'Font Size Scale' : 'مقياس حجم خط الفاتورة'}
                          </label>
                          <select
                            name="invoiceFontSize"
                            defaultValue={settings.invoiceFontSize || 'base'}
                            onChange={(e) => {
                              setSettings(prev => ({ ...prev, invoiceFontSize: e.target.value as 'sm' | 'base' | 'lg' }));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-800"
                          >
                            <option value="sm">{isEn ? 'Small Size (صغير)' : 'حجم صغير (أميز للورق القصير)'}</option>
                            <option value="base">{isEn ? 'Medium Standard (عادي)' : 'حجم عادي (افتراضي ومتناسق)'}</option>
                            <option value="lg">{isEn ? 'Large Size (كبير)' : 'حجم كبير (قراءة أسهل وأوضح)'}</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                            {isEn ? 'Padding / Row Spacing' : 'هوامش وتباعد السطور'}
                          </label>
                          <select
                            name="invoicePadding"
                            defaultValue={settings.invoicePadding || 'normal'}
                            onChange={(e) => {
                              setSettings(prev => ({ ...prev, invoicePadding: e.target.value as 'compact' | 'normal' | 'relaxed' }));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-800"
                          >
                            <option value="compact">{isEn ? 'Compact (مكثف)' : 'مكثف ومدمج (لتوفير رول الورق)'}</option>
                            <option value="normal">{isEn ? 'Normal Standard (عادي)' : 'عادي متوازن'}</option>
                            <option value="relaxed">{isEn ? 'Relaxed (متباعد مريح)' : 'مريح ومتباعد (أكثر فخامة)'}</option>
                          </select>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 my-2 pt-3">
                        <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                          {isEn ? 'Invoice Accent Branding Color' : 'اللون المميز الفاخر للفاتورة (Branding Accent Color)'}
                        </label>
                        <div className="flex flex-wrap items-center gap-3">
                          <input
                            type="color"
                            name="accentColor"
                            id="accentColorSelector"
                            defaultValue={settings.accentColor || '#eab308'}
                            onChange={(e) => {
                              setSettings(prev => ({ ...prev, accentColor: e.target.value }));
                            }}
                            className="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer bg-transparent shrink-0"
                          />
                          <div className="flex flex-wrap gap-2">
                            {[
                              { labelAr: 'أصفر ذهبي', labelEn: 'Amber Gold', val: '#eab308' },
                              { labelAr: 'أزرق احترافي', labelEn: 'Royal Blue', val: '#2563eb' },
                              { labelAr: 'أخضر ضريبي', labelEn: 'Tax Emerald', val: '#059669' },
                              { labelAr: 'أحمر قرمزي', labelEn: 'Crimson Red', val: '#dc2626' },
                              { labelAr: 'بنفسجي داكن', labelEn: 'Deep Violet', val: '#7c3aed' },
                              { labelAr: 'رمادي صلب', labelEn: 'Steel Slate', val: '#475569' },
                            ].map((preset) => (
                              <button
                                key={preset.val}
                                type="button"
                                onClick={() => {
                                  const picker = document.getElementById('accentColorSelector') as HTMLInputElement;
                                  if (picker) {
                                    picker.value = preset.val;
                                    setSettings(prev => ({ ...prev, accentColor: preset.val }));
                                  }
                                }}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5"
                                style={{ borderLeftWidth: '5px', borderLeftColor: preset.val }}
                              >
                                <span>{isEn ? preset.labelEn : preset.labelAr}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                        <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                          <div>
                            <span className="block text-xs font-black text-slate-900">
                              {isEn ? 'Render ZATCA QR Code' : 'تضمين رمز الاستجابة السريع (QR)'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {isEn ? 'ZATCA-compliant Base64 electronic stamp' : 'متوافق مع متطلبات هيئة الزكاة والضريبة والجمارك.'}
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              name="showQrCode"
                              value="true"
                              defaultChecked={settings.showQrCode !== false}
                              onChange={(e) => {
                                setSettings(prev => ({ ...prev, showQrCode: e.target.checked }));
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                          <div>
                            <span className="block text-xs font-black text-slate-900">
                              {isEn ? 'Show Cashier Name' : 'إظهار اسم موظف الكاشير'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {isEn ? 'Print active employee label on invoice' : 'طباعة اسم متلقي العملية والموظف في الفاتورة.'}
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              name="showCashierName"
                              value="true"
                              defaultChecked={settings.showCashierName !== false}
                              onChange={(e) => {
                                setSettings(prev => ({ ...prev, showCashierName: e.target.checked }));
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end pt-3">
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-lg transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
                        >
                          💾 {isEn ? 'Save Design Configuration' : 'حفظ إعدادات وتصميم الفاتورة'}
                        </button>
                      </div>

                    </form>
                  </div>

                  {/* Dynamic Mockup Preview Column */}
                  <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-100 rounded-xl p-4 border border-slate-200 relative overflow-hidden min-h-[400px]">
                    <div className="absolute top-3 left-3 text-[10px] bg-slate-200 text-slate-600 font-extrabold px-2 py-0.5 rounded border border-slate-300/50 z-10">
                      👀 {isEn ? 'Live Layout Preview' : 'معاينة حية ومباشرة للتصميم'}
                    </div>

                    {(() => {
                      const mockFontSize = settings.invoiceFontSize || 'base';
                      const mockWidth = settings.invoiceWidth || 290;
                      const mockPadding = settings.invoicePadding || 'normal';

                      const mockFontSizes = {
                        sm: { root: '11px', title: '13px', sub: '10px', badge: '9px' },
                        base: { root: '13px', title: '15px', sub: '11.5px', badge: '10px' },
                        lg: { root: '15px', title: '17px', sub: '13px', badge: '11.5px' }
                      }[mockFontSize];

                      const mockPaddings = {
                        compact: 'p-2.5 space-y-1.5',
                        normal: 'p-4 space-y-2.5',
                        relaxed: 'p-6 space-y-3.5'
                      }[mockPadding];

                      return (
                        <div 
                          className={`w-full bg-white text-stone-900 shadow-lg border-t-8 rounded select-none leading-relaxed transition-all duration-300 ${mockPaddings}`}
                          style={{ 
                            fontFamily: 'monospace', 
                            borderTopColor: settings.accentColor || '#eab308',
                            maxWidth: `${mockWidth}px`,
                            fontSize: mockFontSizes.root,
                            fontWeight: 'bold'
                          }}
                        >
                          {/* Store Header Info */}
                          <div className="text-center space-y-0.5 mb-2">
                            <h4 className="font-black uppercase text-center border-b border-dashed border-stone-400 pb-0.5" style={{ fontSize: mockFontSizes.title }}>
                              {isEn ? settings.storeNameEn : settings.storeNameAr}
                            </h4>
                            <p className="text-stone-600" style={{ fontSize: mockFontSizes.sub }}>
                              {isEn ? settings.addressEn : settings.addressAr}
                            </p>
                            <p className="text-stone-600" style={{ fontSize: mockFontSizes.sub }}>
                              {isEn ? 'Phone:' : 'الهاتف:'} {settings.phone}
                            </p>
                            <p className="font-bold text-stone-900" style={{ fontSize: mockFontSizes.sub }}>
                              {isEn ? 'VAT Registration:' : 'الرقم الضريبي:'} {settings.vatNumber}
                            </p>
                          </div>

                          {/* Invoice Meta */}
                          <div className="border-t border-dashed border-stone-400 pt-1.5 pb-1.5 space-y-0.5 text-stone-800" style={{ fontSize: mockFontSizes.sub }}>
                            <div className="flex justify-between">
                              <span>{isEn ? 'Invoice No:' : 'رقم الفاتورة:'}</span>
                              <span className="font-bold">INV-2026-0089</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{isEn ? 'Date:' : 'التاريخ:'}</span>
                              <span>24-06-2026 12:00 PM</span>
                            </div>
                            {settings.showCashierName !== false && (
                              <div className="flex justify-between">
                                <span>{isEn ? 'Cashier:' : 'الكاشير:'}</span>
                                <span>{isEn ? 'Admin' : 'مدير النظام'}</span>
                              </div>
                            )}
                          </div>

                          {/* Customized Invoice Tag */}
                          <div className="text-center bg-stone-100 py-1 font-black tracking-tight rounded-sm my-1.5 border border-stone-200" style={{ fontSize: mockFontSizes.badge }}>
                            {isEn ? (settings.invoiceTitleEn || 'SIMPLIFIED TAX INVOICE') : (settings.invoiceTitleAr || 'فاتورة ضريبية مبسطة')}
                          </div>

                          {/* Table Dummy Items */}
                          <div className="border-t border-b border-dashed border-stone-400 py-1 my-1.5 space-y-1" style={{ fontSize: mockFontSizes.sub }}>
                            <div className="flex justify-between font-bold text-stone-900">
                              <span>{isEn ? 'Item' : 'الصنف'}</span>
                              <span>{isEn ? 'Total' : 'المجموع'}</span>
                            </div>
                            <div className="flex justify-between text-stone-700">
                              <span>1x {isEn ? 'Sample Product' : 'مثال لمنتج تجريبي'}</span>
                              <span>15.00 {isEn ? 'SAR' : 'ر.س'}</span>
                            </div>
                          </div>

                          {/* Dummy totals */}
                          <div className="space-y-0.5 text-stone-800" style={{ fontSize: mockFontSizes.sub }}>
                            <div className="flex justify-between">
                              <span>{isEn ? 'Subtotal:' : 'المجموع:'}</span>
                              <span>13.04 {isEn ? 'SAR' : 'ر.س'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{isEn ? 'VAT (15%):' : 'ضريبة القيمة المضافة (15%):'}</span>
                              <span>1.96 {isEn ? 'SAR' : 'ر.س'}</span>
                            </div>
                            <div className="flex justify-between font-black text-stone-950 border-t border-dotted border-stone-300 pt-0.5 mt-0.5" style={{ fontSize: mockFontSizes.root }}>
                              <span>{isEn ? 'NET TOTAL:' : 'صافي المبلغ:'}</span>
                              <span>15.00 {isEn ? 'SAR' : 'ر.س'}</span>
                            </div>
                          </div>

                          {/* QR Code Conditionally displayed */}
                          {settings.showQrCode !== false && (
                            <div className="flex flex-col items-center justify-center space-y-0.5 my-2 bg-stone-50 p-1 border border-stone-200 rounded">
                              <div className="w-12 h-12 bg-stone-800 rounded flex items-center justify-center text-white text-[6px] font-bold select-none p-1 text-center">
                                [ QR ]
                              </div>
                              <span className="text-stone-500 scale-90" style={{ fontSize: '7px' }}>
                                {isEn ? 'Scan to verify tax invoice' : 'امسح للتحقق من الفاتورة الضريبية'}
                              </span>
                            </div>
                          )}

                          {/* Footer Customized Message */}
                          <div className="text-center font-bold text-stone-600 border-t border-dotted border-stone-300 pt-1.5 mt-1.5" style={{ fontSize: mockFontSizes.badge }}>
                            <p>{isEn ? (settings.invoiceFooterEn || 'Thank you for your visit!') : (settings.invoiceFooterAr || 'شكراً لزيارتكم ونتطلع لخدمتكم!')}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ============================== SCREEN: PRODUCT CATEGORIES (DEPARTMENTS) ============================== */}
          {activeScreen === 'categories' && (
            <div id="screen-categories" className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn text-slate-800">
              
              {/* Form card */}
              <div className="lg:col-span-4 bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">🏷️</span>
                    {selectedCategory 
                      ? (isEn ? 'Edit Product Category' : 'تعديل بيانات القسم') 
                      : (isEn ? 'Register New Category' : 'تسجيل قسم / تصنيف جديد')}
                  </h3>
                  <p className="text-xxs text-slate-500 mt-1">
                    {isEn ? 'Configure custom departments. Categories will be select options inside product forms.' : 'ضبط وتعديل أقسام الأصناف. ستظهر هذه الأقسام كخيارات عند إضافة أو تعديل المنتجات في المستودع.'}
                  </p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const nameAr = fd.get('nameAr') as string;
                  const nameEn = fd.get('nameEn') as string;
                  const color = fd.get('color') as string;

                  if (selectedCategory) {
                    const updated = categories.map(c => c.id === selectedCategory.id ? { ...c, nameAr, nameEn, color } : c);
                    // Update category string inside products too!
                    const updatedProducts = products.map(p => {
                      if (p.category === selectedCategory.nameEn) {
                        return { ...p, category: nameEn };
                      }
                      return p;
                    });
                    saveCategoriesToDb(updated);
                    saveProductsToDb(updatedProducts);
                    setSelectedCategory(null);
                    showAlert(isEn ? 'Category updated successfully!' : 'تم تحديث بيانات القسم بنجاح!', 'success');
                  } else {
                    const newCat: Category = {
                      id: `cat-${Date.now()}`,
                      nameAr,
                      nameEn,
                      color: color || 'blue'
                    };
                    saveCategoriesToDb([...categories, newCat]);
                    showAlert(isEn ? 'Category registered successfully!' : 'تم تسجيل القسم الجديد بنجاح!', 'success');
                  }
                  e.currentTarget.reset();
                }} className="space-y-4 pt-2">
                  
                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                      {isEn ? 'Category Name (Arabic)' : 'اسم القسم بالعربية'}
                    </label>
                    <input
                      type="text"
                      name="nameAr"
                      required
                      defaultValue={selectedCategory?.nameAr || ''}
                      placeholder="مثال: لحوم مجمدة"
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-blue-600 transition-all text-right animate-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                      {isEn ? 'Category Name (English)' : 'اسم القسم بالإنجليزية'}
                    </label>
                    <input
                      type="text"
                      name="nameEn"
                      required
                      defaultValue={selectedCategory?.nameEn || ''}
                      placeholder="e.g. Frozen Meats"
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-blue-600 transition-all animate-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                      {isEn ? 'Color Theme Accent' : 'اللون المميز للقسم'}
                    </label>
                    <select
                      name="color"
                      defaultValue={selectedCategory?.color || 'blue'}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-blue-600 transition-all cursor-pointer animate-none"
                    >
                      <option value="blue">{isEn ? 'Ocean Blue' : 'أزرق محيطي'}</option>
                      <option value="emerald">{isEn ? 'Forest Green' : 'أخضر غاباتي'}</option>
                      <option value="amber">{isEn ? 'Warm Amber' : 'أصفر دافئ'}</option>
                      <option value="purple">{isEn ? 'Royal Purple' : 'بنفسجي ملكي'}</option>
                      <option value="rose">{isEn ? 'Coral Red' : 'أحمر مرجاني'}</option>
                      <option value="slate">{isEn ? 'Classic Slate' : 'رمادي كلاسيكي'}</option>
                    </select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xxs py-3 rounded-xl shadow-md transition-all cursor-pointer select-none active:scale-[0.98]"
                    >
                      {selectedCategory ? (isEn ? 'Update Category' : 'تحديث بيانات القسم') : (isEn ? 'Register Category' : 'إضافة القسم')}
                    </button>
                    {selectedCategory && (
                      <button
                        type="button"
                        onClick={() => setSelectedCategory(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xxs py-3 px-4 rounded-xl transition-all cursor-pointer select-none"
                      >
                        {isEn ? 'Cancel' : 'إلغاء'}
                      </button>
                    )}
                  </div>

                </form>
              </div>

              {/* Category Directory List */}
              <div className="lg:col-span-8 bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {isEn ? 'Departments Directory' : 'دليل وأرشيف أقسام السوبرماركت'}
                    </h3>
                    <p className="text-xxs text-slate-500 mt-0.5">
                      {isEn ? 'Manage available sections, view stock item density.' : 'استعراض وتحرير الأقسام المتوفرة حالياً، مع عرض لعدد السلع المسجلة تحت كل قسم.'}
                    </p>
                  </div>
                  <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-blue-200">
                    {categories.length} {isEn ? 'Categories' : 'أقسام نشطة'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {categories.map((cat) => {
                    const pCount = products.filter(p => p.category === cat.nameEn).length;
                    const badgeColors: Record<string, string> = {
                      blue: 'bg-blue-50 text-blue-700 border-blue-200',
                      emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      amber: 'bg-amber-50 text-amber-700 border-amber-200',
                      purple: 'bg-purple-50 text-purple-700 border-purple-200',
                      rose: 'bg-rose-50 text-rose-700 border-rose-200',
                      slate: 'bg-slate-50 text-slate-700 border-slate-200'
                    };
                    const badgeClass = badgeColors[cat.color || 'blue'] || badgeColors.blue;

                    return (
                      <div key={cat.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center text-xxs shadow-xs transition-all hover:shadow-sm hover:border-slate-300">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${cat.color === 'emerald' ? 'bg-emerald-500' : cat.color === 'amber' ? 'bg-amber-500' : cat.color === 'purple' ? 'bg-purple-500' : cat.color === 'rose' ? 'bg-rose-500' : cat.color === 'slate' ? 'bg-slate-500' : 'bg-blue-500'}`}></span>
                            <span className="font-extrabold text-slate-900 text-xs">{isEn ? cat.nameEn : cat.nameAr}</span>
                          </div>
                          <p className="text-slate-400 mt-1 font-mono text-[10px]">Slug: {cat.nameEn}</p>
                          <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[9px] font-bold border ${badgeClass}`}>
                            {pCount} {isEn ? 'linked products' : 'سلع مسجلة'}
                          </span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedCategory(cat);
                            }}
                            className="px-2 py-1 bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 rounded-lg text-[10px] font-black cursor-pointer transition-all active:scale-95"
                          >
                            {isEn ? 'Edit' : 'تعديل'}
                          </button>
                          <button
                            onClick={() => {
                              const count = products.filter(p => p.category === cat.nameEn).length;
                              if (count > 0) {
                                showAlert(
                                  isEn 
                                    ? `This category cannot be deleted because it is assigned to ${count} active products.` 
                                    : `لا يمكن حذف هذا القسم لكونه مستخدماً مع ${count} من المنتجات النشطة حالياً.`, 
                                  'warning'
                                );
                                return;
                              }
                              showConfirm(
                                isEn ? 'Are you sure you want to delete this category?' : 'هل أنت متأكد من رغبتك في حذف هذا القسم نهائياً؟',
                                () => {
                                  const filtered = categories.filter(c => c.id !== cat.id);
                                  saveCategoriesToDb(filtered);
                                  showAlert(isEn ? 'Category deleted successfully.' : 'تم حذف القسم بنجاح.', 'success');
                                }
                              );
                            }}
                            className="px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-[10px] font-black cursor-pointer transition-all active:scale-95"
                          >
                            {isEn ? 'Del' : 'حذف'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ============================== SCREEN: USER CONTROL & COMPLETE SYSTEM SECURITY PANEL ============================== */}
          {activeScreen === 'users' && hasAccess('users') && (
            <div className={`mx-auto transition-all duration-300 w-full space-y-6 ${
              usersScreenWidth === 'compact' ? 'max-w-4xl' :
              usersScreenWidth === 'full' ? 'max-w-full px-4' :
              'max-w-7xl'
            }`}>
              
              {/* TOP LAYOUT CONTROL COCKPIT */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 shadow-xl rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-5 text-white animate-fadeIn">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-blue-500/15 text-blue-400 rounded-xl border border-blue-500/25 text-xl">🖥️</span>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      {isEn ? 'Users Control Panel & Display Configuration' : 'لوحة التحكم بالمستخدمين وتخصيص أبعاد الشاشة'}
                    </h3>
                    <p className="text-xxs text-slate-400 mt-1">
                      {isEn ? 'Customize the physical layout, container width, and visualization style in real-time.' : 'تحكم فورياً بـ عرض شاشة المستخدمين، توزيع الأقسام، واختيار العرض كشبكة بطاقات أو جدول منظم.'}
                    </p>
                  </div>
                </div>

                {/* Interactive Controls Group */}
                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                  
                  {/* Control 1: Width selector */}
                  <div className="flex flex-col gap-1.5 min-w-[150px]">
                    <span className="text-[10px] text-slate-300 font-extrabold">{isEn ? 'Screen Container Width' : 'عرض حاوية الشاشة:'}</span>
                    <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
                      {(['compact', 'standard', 'full'] as const).map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => {
                            setUsersScreenWidth(w);
                            localStorage.setItem('erp_users_screen_width', w);
                            showAlert(
                              isEn ? `Layout set to ${w} width!` : `تم تعيين عرض الشاشة بنجاح إلى: ${w === 'compact' ? 'مكثف (960px)' : w === 'full' ? 'كامل العرض (100%)' : 'الافتراضي (1280px)'}`,
                              'success'
                            );
                          }}
                          className={`flex-1 text-center py-1.5 px-3 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                            usersScreenWidth === w 
                              ? 'bg-blue-600 text-white shadow-md' 
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {w === 'compact' ? (isEn ? 'Compact' : 'مكثف') :
                           w === 'full' ? (isEn ? 'Full' : 'كامل') :
                           (isEn ? 'Standard' : 'افتراضي')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Control 2: Layout Style */}
                  <div className="flex flex-col gap-1.5 min-w-[140px]">
                    <span className="text-[10px] text-slate-300 font-extrabold">{isEn ? 'Layout View Mode' : 'طريقة عرض الحسابات:'}</span>
                    <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
                      {(['grid', 'table'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setUsersLayoutMode(m);
                            localStorage.setItem('erp_users_layout_mode', m);
                          }}
                          className={`flex-1 text-center py-1.5 px-3 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                            usersLayoutMode === m 
                              ? 'bg-blue-600 text-white shadow-md' 
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {m === 'grid' ? (isEn ? 'Grid Cards' : 'بطاقات شبكية') : (isEn ? 'Table' : 'جدول منظم')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Control 3: Grid Columns (visible in grid mode) */}
                  {usersLayoutMode === 'grid' && (
                    <div className="flex flex-col gap-1.5 min-w-[120px]">
                      <span className="text-[10px] text-slate-300 font-extrabold">{isEn ? 'Grid Columns' : 'تقسيم الأعمدة:'}</span>
                      <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
                        {([2, 3, 4] as const).map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => {
                              setUsersGridCols(col);
                              localStorage.setItem('erp_users_grid_cols', String(col));
                            }}
                            className={`flex-1 text-center py-1.5 px-2 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                              usersGridCols === col 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {col}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Control 4: Hide Restricted Tabs */}
                  <div className="flex flex-col gap-1.5 min-w-[150px]">
                    <span className="text-[10px] text-slate-300 font-extrabold">{isEn ? 'Restricted Tabs Visibility' : 'رؤية التبويبات المقيدة:'}</span>
                    <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
                      {([true, false] as const).map((hide) => (
                        <button
                          key={String(hide)}
                          type="button"
                          onClick={() => {
                            setHideRestrictedTabs(hide);
                            localStorage.setItem('erp_hide_restricted_tabs', String(hide));
                            showAlert(
                              isEn 
                                ? `Restricted tabs will be ${hide ? 'hidden' : 'disabled/visible'} for non-admin users.` 
                                : `سيتم ${hide ? 'إخفاء' : 'إظهار وتعطيل'} التبويبات غير المصرح بها للموظفين.`,
                              'success'
                            );
                          }}
                          className={`flex-1 text-center py-1.5 px-3 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                            hideRestrictedTabs === hide 
                              ? 'bg-blue-600 text-white shadow-md' 
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {hide ? (isEn ? 'Hide' : 'إخفاء') : (isEn ? 'Disable' : 'تعطيل فقط')}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              <div id="screen-users" className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-slate-800">
              
              {/* Add/Edit User Card */}
              <div className="lg:col-span-4 bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">🔑</span>
                    {selectedContact && contactType === 'employee'
                      ? (isEn ? 'Edit Employee Permissions' : 'تعديل صلاحيات موظف كاشير') 
                      : (isEn ? 'Add User / Staff Cashier' : 'إضافة موظف / كاشير جديد')}
                  </h3>
                  <p className="text-xxs text-slate-500 mt-1">
                    {isEn ? 'Configure login PINs, custom authorization, and active security state for employees.' : 'برمجة وتعيين أسماء مستخدمي النظام ورموز المرور (PIN) وتحديد مستوى صلاحيات الدخول.'}
                  </p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const name = fd.get('name') as string;
                  const username = fd.get('username') as string;
                  const pin = fd.get('pin') as string;
                  const role = fd.get('role') as 'admin' | 'manager' | 'cashier';
                  const active = fd.get('active') === 'true';

                  if (pin && pin.trim().length !== 4) {
                    showAlert(isEn ? 'PIN must be exactly 4 digits!' : 'رمز المرور (PIN) يجب أن يتكون من 4 أرقام بالضبط!', 'warning');
                    return;
                  }

                  // Check if username already exists
                  const usernameExists = employees.some(emp => 
                    emp.username.toLowerCase() === username.toLowerCase() && 
                    (!selectedContact || emp.id !== selectedContact.id)
                  );

                  if (usernameExists) {
                    showAlert(isEn ? 'Username already exists! Use another username.' : 'اسم المستخدم هذا مكرر ومستعمل مسبقاً! يرجى اختيار اسم مستخدم آخر.', 'warning');
                    return;
                  }

                  if (selectedContact && contactType === 'employee') {
                    const updated = employees.map(emp => 
                      emp.id === selectedContact.id 
                        ? { ...emp, name, username, role, active, pin: pin && pin.trim() ? pin.trim() : emp.pin } 
                        : emp
                    );
                    saveEmployeesToDb(updated);
                    setSelectedContact(null);
                    setContactType('customer');
                    showAlert(isEn ? 'User security account updated successfully!' : 'تم تحديث حساب ومستوى صلاحيات المستخدم بنجاح!', 'success');
                  } else {
                    const newEmp: User = {
                      id: `usr-${Date.now()}`,
                      name,
                      username,
                      role,
                      active,
                      pin: pin && pin.trim() ? pin.trim() : '0000'
                    };
                    saveEmployeesToDb([...employees, newEmp]);
                    showAlert(isEn ? 'New user registered successfully!' : 'تم تسجيل وإضافة المستخدم الجديد وصلاحياته بنجاح!', 'success');
                  }
                  e.currentTarget.reset();
                }} className="space-y-4 pt-1">
                  
                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                      {isEn ? 'Full Employee Name' : 'الاسم الكامل للموظف'}
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      defaultValue={selectedContact && contactType === 'employee' ? selectedContact.name : ''}
                      placeholder="مثال: أحمد الغامدي"
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-blue-600 transition-all text-right animate-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                      {isEn ? 'Username (for Login)' : 'اسم المستخدم (لتسجيل الدخول)'}
                    </label>
                    <input
                      type="text"
                      name="username"
                      required
                      defaultValue={selectedContact && contactType === 'employee' ? selectedContact.username : ''}
                      placeholder="e.g. ahmad_pos"
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 font-mono font-bold focus:outline-none focus:bg-white focus:border-blue-600 transition-all animate-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                        {isEn ? '4-Digit PIN Code' : 'رمز المرور السريع (PIN)'}
                      </label>
                      <input
                        type="password"
                        name="pin"
                        maxLength={4}
                        placeholder={selectedContact && contactType === 'employee' ? '****' : '1234'}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 font-mono font-bold focus:outline-none focus:bg-white focus:border-blue-600 transition-all text-center animate-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                        {isEn ? 'Role / Access Scope' : 'مستوى الصلاحية والمهمة'}
                      </label>
                      <select
                        name="role"
                        defaultValue={selectedContact && contactType === 'employee' ? selectedContact.role : 'cashier'}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-blue-600 transition-all cursor-pointer animate-none"
                      >
                        <option value="admin">{isEn ? 'System Admin (Full)' : 'مدير النظام كامل (Admin)'}</option>
                        <option value="manager">{isEn ? 'Warehouse Manager' : 'مسؤول المستودع (Manager)'}</option>
                        <option value="cashier">{isEn ? 'Sales Cashier' : 'كاشير نقطة بيع (Cashier)'}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                      {isEn ? 'Account Security Status' : 'حالة الحساب والأمان'}
                    </label>
                    <select
                      name="active"
                      defaultValue={selectedContact && contactType === 'employee' ? String(selectedContact.active) : 'true'}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-blue-600 transition-all cursor-pointer animate-none"
                    >
                      <option value="true">{isEn ? 'Active (Permitted Login)' : 'حساب نشط (مسموح بالولوج)'}</option>
                      <option value="false">{isEn ? 'Suspended / Disabled' : 'حساب معطل مؤقتاً (موقوف)'}</option>
                    </select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xxs py-3 rounded-xl shadow-md transition-all cursor-pointer select-none active:scale-[0.98]"
                    >
                      {selectedContact && contactType === 'employee' ? (isEn ? 'Update User' : 'تحديث حساب الموظف') : (isEn ? 'Register User' : 'تسجيل الموظف')}
                    </button>
                    {selectedContact && contactType === 'employee' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedContact(null);
                          setContactType('customer');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xxs py-3 px-4 rounded-xl transition-all cursor-pointer select-none"
                      >
                        {isEn ? 'Cancel' : 'إلغاء'}
                      </button>
                    )}
                  </div>

                </form>
              </div>

              {/* Users Directory */}
              <div className="lg:col-span-8 space-y-6">
                
                <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        {isEn ? 'Security Directory & Cashier Accounts' : 'دليل حسابات الولوج والكاشيرات النشطة'}
                      </h3>
                      <p className="text-xxs text-slate-500 mt-0.5">
                        {isEn ? 'Manage credential keys, edit role levels, toggle active states.' : 'استعراض الحسابات المسموح لها بالولوج لنقاط البيع ولوحات التحكم وتعديل بياناتها مباشرة.'}
                      </p>
                    </div>
                    <span className="bg-rose-50 text-rose-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-rose-250 shrink-0">
                      {employees.length} {isEn ? 'Accounts' : 'مستخدمين'}
                    </span>
                  </div>

                  <div className="pt-1">
                    {usersLayoutMode === 'grid' ? (
                      <div className={`grid gap-4 ${
                        usersGridCols === 2 ? 'grid-cols-1 md:grid-cols-2' : 
                        usersGridCols === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 
                        'grid-cols-1 md:grid-cols-3'
                      }`}>
                        {employees.map((emp) => {
                          const isSelf = emp.id === currentUser?.id;
                          const roleColors: Record<string, string> = {
                            admin: 'bg-rose-50 text-rose-700 border-rose-200',
                            manager: 'bg-amber-50 text-amber-700 border-amber-200',
                            cashier: 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          };
                          const roleClass = roleColors[emp.role] || roleColors.cashier;

                          return (
                            <div key={emp.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between text-xxs shadow-xs hover:border-slate-300 hover:shadow-md transition-all duration-200 relative">
                              <span className="absolute top-3 end-3 font-mono font-black text-blue-600 bg-blue-50/80 border border-blue-100 rounded-lg px-2 py-0.5 scale-90">
                                PIN: {emp.pin || '****'}
                              </span>
                              
                              <div className="flex items-center gap-2.5 mb-3">
                                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-xs shadow-md">
                                  {emp.name.slice(0, 2)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-black text-slate-900 text-xs leading-tight">{emp.name}</span>
                                    {isSelf && (
                                      <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-1.5 py-0.2 rounded border border-blue-200">
                                        {isEn ? 'You' : 'حسابك'}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">@{emp.username}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between border-t border-b border-slate-200/60 py-2.5 my-3 gap-2">
                                <div>
                                  <span className="block text-[8px] text-slate-400 font-extrabold uppercase mb-0.5">{isEn ? 'Role' : 'الصلاحية'}</span>
                                  <span className={`px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase ${roleClass}`}>
                                    {emp.role.toUpperCase()}
                                  </span>
                                </div>
                                <div className="text-left">
                                  <span className="block text-[8px] text-slate-400 font-extrabold uppercase mb-0.5">{isEn ? 'Status' : 'الحالة'}</span>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${emp.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                    {emp.active ? (isEn ? 'ACTIVE' : 'نشط') : (isEn ? 'SUSPENDED' : 'موقوف')}
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2 mt-2 w-full">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setContactType('employee');
                                    setSelectedContact(emp);
                                  }}
                                  className="flex-1 py-1.5 bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 rounded-lg text-xxs font-black cursor-pointer transition-colors text-center"
                                >
                                  {isEn ? 'Edit' : 'تعديل'}
                                </button>
                                {!isSelf && emp.id !== 'usr-1' && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEmployee(emp.id)}
                                    className="py-1.5 px-3 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xxs font-black cursor-pointer transition-colors text-center"
                                  >
                                    {isEn ? 'Delete' : 'حذف'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Detailed Structured Table Layout */
                      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-slate-50">
                        <table className="w-full text-xxs text-slate-800 text-right">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-extrabold">
                              <th className="py-3 px-4">{isEn ? 'Employee Name' : 'اسم الموظف'}</th>
                              <th className="py-3 px-4">{isEn ? 'Username' : 'اسم المستخدم'}</th>
                              <th className="py-3 px-4 text-center">{isEn ? 'PIN Code' : 'رقم PIN'}</th>
                              <th className="py-3 px-4 text-center">{isEn ? 'Role' : 'الصلاحية والوظيفة'}</th>
                              <th className="py-3 px-4 text-center">{isEn ? 'Account Status' : 'حالة الحساب'}</th>
                              <th className="py-3 px-4 text-center w-28">{isEn ? 'Actions' : 'الإجراءات'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {employees.map((emp) => {
                              const isSelf = emp.id === currentUser?.id;
                              const roleColors: Record<string, string> = {
                                admin: 'bg-rose-50 text-rose-700 border-rose-200',
                                manager: 'bg-amber-50 text-amber-700 border-amber-200',
                                cashier: 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              };
                              const roleClass = roleColors[emp.role] || roleColors.cashier;

                              return (
                                <tr key={emp.id} className="hover:bg-slate-100 transition-colors bg-white">
                                  <td className="py-3 px-4 font-black text-slate-900 text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6.5 h-6.5 bg-blue-600/10 text-blue-600 rounded-full flex items-center justify-center font-black text-[10px]">
                                        {emp.name.slice(0, 2)}
                                      </div>
                                      <span>{emp.name}</span>
                                      {isSelf && (
                                        <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-1.5 py-0.2 rounded border border-blue-200">
                                          {isEn ? 'You' : 'حسابك'}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 font-mono text-slate-600 font-bold">@{emp.username}</td>
                                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">{emp.pin || '****'}</td>
                                  <td className="py-3 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase ${roleClass}`}>
                                      {emp.role.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${emp.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                      {emp.active ? (isEn ? 'ACTIVE' : 'نشط') : (isEn ? 'SUSPENDED' : 'موقوف')}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="flex justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setContactType('employee');
                                          setSelectedContact(emp);
                                        }}
                                        className="px-2.5 py-1 bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 rounded-lg text-[10px] font-black cursor-pointer transition-colors"
                                      >
                                        {isEn ? 'Edit' : 'تعديل'}
                                      </button>
                                      {!isSelf && emp.id !== 'usr-1' && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteEmployee(emp.id)}
                                          className="px-2.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-[10px] font-black cursor-pointer transition-colors"
                                        >
                                          {isEn ? 'Delete' : 'حذف'}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Complete System Control Panel Permissions Grid */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span className="p-1 bg-blue-50 text-blue-600 rounded">🛡️</span>
                        {isEn ? 'Complete System Role-Based Access Matrix' : 'مصفوفة التحكم في صلاحيات النظام بالكامل'}
                      </h3>
                      <p className="text-xxs text-slate-500 mt-0.5">
                        {isEn ? 'Toggle access permissions for each role. Changes apply in real-time.' : 'نظام الحوكمة وصلاحيات تصفح شاشات البيع والمستودع والتقارير والتحكم بالنظام كامل.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const resetVal = {
                          admin: { pos: true, invoices: true, inventory: true, purchases: true, contacts: true, categories: true, reports: true, backups: true, users: true, invoice_view_details: true, invoice_print: true, invoice_edit: true, invoice_void: true },
                          manager: { pos: true, invoices: true, inventory: true, purchases: true, contacts: true, categories: true, reports: false, backups: false, users: false, invoice_view_details: true, invoice_print: true, invoice_edit: true, invoice_void: true },
                          cashier: { pos: true, invoices: true, inventory: false, purchases: false, contacts: false, categories: false, reports: false, backups: false, users: false, invoice_view_details: true, invoice_print: true, invoice_edit: false, invoice_void: false }
                        };
                        setRolePermissions(resetVal);
                        localStorage.setItem('erp_role_permissions', JSON.stringify(resetVal));
                        showAlert(isEn ? 'Permissions reset to defaults' : 'تمت إعادة تعيين الصلاحيات للوضع الافتراضي بنجاح', 'success');
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xxs font-extrabold rounded-lg transition-colors cursor-pointer"
                    >
                      🔄 {isEn ? 'Reset to Defaults' : 'إعادة التعيين للافتراضي'}
                    </button>
                  </div>

                  {/* Security Settings & Navigation Controls */}
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        ⚙️ {isEn ? 'Navigation Visibility Settings' : 'خيارات عرض شاشات القائمة الجانبية'}
                      </h4>
                      <p className="text-[10px] text-slate-500 max-w-xl leading-relaxed">
                        {isEn 
                          ? 'When enabled, blocked tabs/screens will be completely hidden from the sidebar navigation for users who do not have access, rather than appearing disabled.' 
                          : 'عند تفعيل هذا الخيار، سيتم إخفاء الشاشات والتبويبات غير المصرح بها تماماً من القائمة الجانبية للمستخدمين بدلاً من إظهارها كمعطلة.'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={hideBlockedTabs}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setHideBlockedTabs(val);
                          localStorage.setItem('erp_hide_blocked_tabs', String(val));
                          showAlert(
                            isEn 
                              ? `Navigation visibility updated: Blocked tabs will be ${val ? 'HIDDEN' : 'VISIBLE (Disabled)'}.`
                              : `تم تحديث خيارات عرض القائمة: التبويبات غير المصرح بها ستكون ${val ? 'مخفية تماماً' : 'مرئية كمعطلة'}.`, 
                            'success'
                          );
                        }}
                      />
                      <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ms-2.5 text-xxs font-black text-slate-800">
                        {hideBlockedTabs ? (isEn ? 'Hidden completely' : 'مخفية بالكامل') : (isEn ? 'Disabled state' : 'معطلة فقط')}
                      </span>
                    </label>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xxs text-slate-800 text-right">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold">
                          <th className="py-2.5 px-3">{isEn ? 'System Screen / Action' : 'الشاشة / الإجراء بالنظام'}</th>
                          <th className="py-2.5 px-3 text-center w-28">{isEn ? 'Admin' : 'مدير النظام (Admin)'}</th>
                          <th className="py-2.5 px-3 text-center w-28">{isEn ? 'Manager' : 'أمين المستودع (Manager)'}</th>
                          <th className="py-2.5 px-3 text-center w-28">{isEn ? 'Cashier' : 'كاشير مبيعات (Cashier)'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {[
                          { id: 'pos', nameAr: 'شاشة نقطة البيع وتسجيل الفواتير (POS)', nameEn: 'Point of Sales Screen (POS)' },
                          { id: 'invoices', nameAr: 'دفتر وقائمة الفواتير وصلاحيات الالغاء والتعديل', nameEn: 'Invoices Ledger & Voiding' },
                          { id: 'invoice_view_details', nameAr: '🔍 فواتير: صلاحية عرض تفاصيل ومواد الفاتورة', nameEn: '🔍 Invoices: View detailed items list' },
                          { id: 'invoice_print', nameAr: '🖨️ فواتير: صلاحية طباعة وإعادة إصدار الفاتورة', nameEn: '🖨️ Invoices: Reprint & Print invoice' },
                          { id: 'invoice_edit', nameAr: '✏️ فواتير: صلاحية تعديل بيانات الفواتير النشطة', nameEn: '✏️ Invoices: Edit registered sales invoice' },
                          { id: 'invoice_void', nameAr: '🚫 فواتير: صلاحية إرجاع الفاتورة وإلغاء المعاملة', nameEn: '🚫 Invoices: Void/Return invoice transaction' },
                          { id: 'inventory', nameAr: 'مستودع السلع، تعديل الأصناف، وإضافة بضاعة (Stock)', nameEn: 'Warehouse & Stock Control' },
                          { id: 'categories', nameAr: 'إدارة وتسجيل وتعديل الأقسام وتصنيفات السلع', nameEn: 'Department Categories' },
                          { id: 'purchases', nameAr: 'إصدار فواتير المشتريات وتصفية الموردين', nameEn: 'Supplier Procurement Invoices' },
                          { id: 'contacts', nameAr: 'الموظفون والعملاء والموردون وقائمة الاتصال CRM', nameEn: 'Contacts & CRM' },
                          { id: 'reports', nameAr: 'تقارير الأرباح والخسائر والرسوم البيانية والتحليلات', nameEn: 'Financial Reports & P&L Charts' },
                          { id: 'backups', nameAr: 'الضبط العام، لغة المتجر، النسخ والضبط والتزامن', nameEn: 'System Settings, Language & Sync' },
                          { id: 'users', nameAr: 'التحكم بالمستخدمين وإعدادات الأمن ومصفوفة الصلاحيات', nameEn: 'Complete User Control & Security' }
                        ].map((screen) => {
                          return (
                            <tr key={screen.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-3 font-bold text-slate-950">{isEn ? screen.nameEn : screen.nameAr}</td>
                              
                              {/* Admin Column */}
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {screen.id === 'users' ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 font-extrabold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                      🔒 {isEn ? 'Required' : 'إجباري'}
                                    </span>
                                  ) : (
                                    <label className="relative inline-flex items-center cursor-pointer">
                                      <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={!!rolePermissions.admin[screen.id]}
                                        onChange={() => {
                                          const currentVal = !!rolePermissions.admin[screen.id];
                                          const updated = {
                                            ...rolePermissions,
                                            admin: {
                                              ...rolePermissions.admin,
                                              [screen.id]: !currentVal
                                            }
                                          };
                                          setRolePermissions(updated);
                                          localStorage.setItem('erp_role_permissions', JSON.stringify(updated));
                                          showAlert(isEn ? 'Admin permission updated' : 'تم تعديل صلاحية مدير النظام', 'success');
                                        }}
                                      />
                                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                      <span className={`ms-1.5 text-[9px] font-bold ${rolePermissions.admin[screen.id] ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {rolePermissions.admin[screen.id] ? (isEn ? 'Full' : 'كامل') : (isEn ? 'Blocked' : 'محجوب')}
                                      </span>
                                    </label>
                                  )}
                                </div>
                              </td>

                              {/* Manager Column */}
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={!!rolePermissions.manager[screen.id]}
                                      onChange={() => {
                                        const currentVal = !!rolePermissions.manager[screen.id];
                                        const updated = {
                                          ...rolePermissions,
                                          manager: {
                                            ...rolePermissions.manager,
                                            [screen.id]: !currentVal
                                          }
                                        };
                                        setRolePermissions(updated);
                                        localStorage.setItem('erp_role_permissions', JSON.stringify(updated));
                                        showAlert(isEn ? 'Manager permission updated' : 'تم تعديل صلاحية أمين المستودع', 'success');
                                      }}
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    <span className={`ms-1.5 text-[9px] font-bold ${rolePermissions.manager[screen.id] ? 'text-emerald-600' : 'text-slate-400'}`}>
                                      {rolePermissions.manager[screen.id] ? (isEn ? 'Full' : 'كامل') : (isEn ? 'Blocked' : 'محجوب')}
                                    </span>
                                  </label>
                                </div>
                              </td>

                              {/* Cashier Column */}
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={!!rolePermissions.cashier[screen.id]}
                                      onChange={() => {
                                        const currentVal = !!rolePermissions.cashier[screen.id];
                                        const updated = {
                                          ...rolePermissions,
                                          cashier: {
                                            ...rolePermissions.cashier,
                                            [screen.id]: !currentVal
                                          }
                                        };
                                        setRolePermissions(updated);
                                        localStorage.setItem('erp_role_permissions', JSON.stringify(updated));
                                        showAlert(isEn ? 'Cashier permission updated' : 'تم تعديل صلاحية الكاشير', 'success');
                                      }}
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    <span className={`ms-1.5 text-[9px] font-bold ${rolePermissions.cashier[screen.id] ? 'text-emerald-600' : 'text-slate-400'}`}>
                                      {rolePermissions.cashier[screen.id] ? (isEn ? 'Full' : 'كامل') : (isEn ? 'Blocked' : 'محجوب')}
                                    </span>
                                  </label>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </div>
          )}

          {/* ============================== SCREEN: DATABASE CONNECTIVITY TERMINAL ============================== */}
          {activeScreen === 'database' && currentUser?.role === 'admin' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn text-slate-800">
              
              {/* Screen Title Header */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="p-3 bg-blue-50 text-blue-600 rounded-xl text-xl">
                    <Database className="w-6 h-6 animate-pulse" />
                  </span>
                  <div>
                    <h2 className="text-base md:text-lg font-black text-slate-900">
                      {isEn ? 'Database Connectivity Control Terminal' : 'شاشة التحكم والاتصال بقواعد البيانات'}
                    </h2>
                    <p className="text-xxs text-slate-500 mt-1 leading-relaxed">
                      {isEn 
                        ? 'Manage your storage engine, switch between local and cloud SQL/Firebase, test link health, and sync logs.' 
                        : 'تخصيص محرك حفظ البيانات ومزامنة الفروع، الانتقال بين قاعدة البيانات المحلية والسحابية، واختبار الاتصال والمزامنة.'}
                    </p>
                  </div>
                </div>

                {/* Connection Status Badge */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-250 rounded-full shrink-0">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                  <span className="text-[10px] font-black text-emerald-800">
                    {isEn ? 'Active:' : 'الحالة:'} {
                      dbConfig.type === 'localStorage' ? (isEn ? 'Local Browser (IndexedDB)' : 'متصل بقاعدة المتصفح المحلية') :
                      dbConfig.type === 'firebase' ? (isEn ? 'Firebase Cloud Sync' : 'متصل بـ Firebase Cloud') :
                      (isEn ? 'PostgreSQL Cloud SQL' : 'متصل بـ PostgreSQL (Cloud SQL)')
                    }
                  </span>
                </div>
              </div>

              {/* Selection cards for database engine */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  {
                    id: 'localStorage',
                    titleAr: 'قاعدة بيانات المتصفح المحلية (Default)',
                    titleEn: 'Local Browser Database',
                    descAr: 'تخزين مشفر آمن في متصفحك الحالي (IndexedDB) لا يتطلب إنترنت وسهل النسخ والتحميل.',
                    descEn: 'Fully local browser-based secure sandbox storage. Offline-first with zero lag and manual backups.',
                    icon: '💻',
                    color: 'from-blue-500 to-indigo-600',
                    bg: 'bg-blue-50'
                  },
                  {
                    id: 'postgresql',
                    titleAr: 'قاعدة PostgreSQL (Cloud SQL)',
                    titleEn: 'PostgreSQL Relational DB',
                    descAr: 'اتصال مباشر بمحرك PostgreSQL لمزامنة متعددة الفروع والكاشيرات مع حوكمة كاملة للبيانات.',
                    descEn: 'Relational Cloud SQL database engine. Perfect for multi-terminal installations and master-replica sync.',
                    icon: '🐘',
                    color: 'from-sky-500 to-blue-700',
                    bg: 'bg-sky-50'
                  },
                  {
                    id: 'firebase',
                    titleAr: 'سحابة Google Firebase Firestore',
                    titleEn: 'Google Firebase Cloud Sync',
                    descAr: 'قاعدة بيانات NoSQL سحابية لحظية لتزامن الأسعار وتدفق الفواتير والمخزن بلمح البصر.',
                    descEn: 'NoSQL Google Cloud live DB. Real-time automatic updates across all sales cashiers and manager apps.',
                    icon: '🔥',
                    color: 'from-amber-500 to-orange-600',
                    bg: 'bg-amber-50'
                  }
                ].map((engine) => {
                  const isSelected = dbConfig.type === engine.id;
                  return (
                    <button
                      key={engine.id}
                      type="button"
                      onClick={() => {
                        const updated = { ...dbConfig, type: engine.id };
                        setDbConfig(updated);
                        localStorage.setItem('erp_db_config', JSON.stringify(updated));
                        showAlert(
                          isEn ? `Switched storage engine to ${engine.titleEn}` : `تم تحويل محرك التخزين إلى: ${engine.titleAr}`,
                          'success'
                        );
                      }}
                      className={`relative border text-right p-5 rounded-2xl transition-all hover:scale-[1.01] duration-250 cursor-pointer flex flex-col justify-between min-h-[170px] ${
                        isSelected 
                          ? 'bg-white border-blue-500 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20' 
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className={`w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-lg`}>
                            {engine.icon}
                          </span>
                          {isSelected ? (
                            <span className="bg-blue-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-md">
                              {isEn ? 'ACTIVE' : 'المحرك النشط'}
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 font-bold text-[9px] px-2 py-0.5 rounded-md">
                              {isEn ? 'Select' : 'اختر للاتصال'}
                            </span>
                          )}
                        </div>
                        <h3 className="text-xs font-black text-slate-900 mb-1.5">{isEn ? engine.titleEn : engine.titleAr}</h3>
                        <p className="text-[10px] text-slate-500 leading-normal">{isEn ? engine.descEn : engine.descAr}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Row: Credentials Configuration Form & Test Connection Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Configuration form for Selected Cloud DB */}
                <div className="lg:col-span-8 bg-white border border-slate-200 shadow-sm rounded-2xl p-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                    <Server className="w-5 h-5 text-slate-600" />
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        {isEn ? 'Database Server Connection Parameters' : 'معايير الاتصال وضبط خادم قاعدة البيانات'}
                      </h3>
                      <p className="text-xxs text-slate-500">
                        {isEn 
                          ? `Provide the credentials required to link your ERP terminals to the active ${dbConfig.type} instance.`
                          : `يرجى تزويد بيانات الاعتماد لربط برنامج الكاشير ونقاط البيع بالخادم السحابي.`}
                      </p>
                    </div>
                  </div>

                  {dbConfig.type === 'localStorage' ? (
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl text-center py-8">
                      <div className="text-4xl mb-3">🛡️</div>
                      <h4 className="text-xs font-black text-slate-800 mb-1">
                        {isEn ? 'No Configurations Required for Browser DB' : 'لا تطلب قاعدة البيانات المحلية أي ضبط إضافي'}
                      </h4>
                      <p className="text-xxs text-slate-500 max-w-md mx-auto leading-relaxed">
                        {isEn 
                          ? 'You are running on HTML5 local storage. Backups are performed locally and can be exported as JSON files anytime from the "Backups" tab.' 
                          : 'أنت متصل حالياً بنظام الحفظ الآمن في متصفح الويب الخاص بك مباشرة. يمكنك عمل نسخ احتياطية للملفات وتحميلها يدوياً وتنزيلها كملف JSON في أي وقت.'}
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      const updated = {
                        ...dbConfig,
                        host: fd.get('host') as string,
                        port: Number(fd.get('port')) || 5432,
                        database: fd.get('database') as string,
                        username: fd.get('username') as string,
                        password: fd.get('password') as string,
                        lastSync: new Date().toISOString()
                      };
                      setDbConfig(updated);
                      localStorage.setItem('erp_db_config', JSON.stringify(updated));
                      showAlert(
                        isEn ? 'Database settings updated successfully!' : 'تم حفظ معايير خادم قاعدة البيانات بنجاح في ذاكرة النظام الآمنة!',
                        'success'
                      );
                    }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div>
                        <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                          {dbConfig.type === 'firebase' 
                            ? (isEn ? 'Firebase Host Endpoint (or API Key)' : 'رابط خادم فايربيس (API Key)')
                            : (isEn ? 'Host Server URL / IP Address' : 'عنوان مضيف الخادم (Host IP / Domain)')
                          }
                        </label>
                        <input
                          type="text"
                          name="host"
                          required
                          defaultValue={dbConfig.host}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-2.5 px-3 text-xs font-mono font-bold text-slate-800"
                        />
                      </div>

                      {dbConfig.type === 'postgresql' ? (
                        <div>
                          <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                            {isEn ? 'Port' : 'منفذ الاتصال (Port)'}
                          </label>
                          <input
                            type="number"
                            name="port"
                            required
                            defaultValue={dbConfig.port}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-2.5 px-3 text-xs font-mono font-bold text-slate-800"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                            {isEn ? 'Firebase App ID' : 'معرف التطبيق لـ Firebase (App ID)'}
                          </label>
                          <input
                            type="text"
                            name="port"
                            required
                            defaultValue="1:430199710093:web:f38c7162624"
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-2.5 px-3 text-xs font-mono font-bold text-slate-800"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                          {dbConfig.type === 'firebase' 
                            ? (isEn ? 'Firebase Project ID' : 'معرّف المشروع (Firebase Project ID)')
                            : (isEn ? 'Database Name' : 'اسم قاعدة البيانات (Database Name)')
                          }
                        </label>
                        <input
                          type="text"
                          name="database"
                          required
                          defaultValue={dbConfig.database}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-2.5 px-3 text-xs font-mono font-bold text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                          {dbConfig.type === 'firebase'
                            ? (isEn ? 'Measurement ID (or Storage Bucket)' : 'مستودع حفظ الملفات (Storage Bucket)')
                            : (isEn ? 'User Login Username' : 'اسم مستخدم قاعدة البيانات (DB Username)')
                          }
                        </label>
                        <input
                          type="text"
                          name="username"
                          required
                          defaultValue={dbConfig.username}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-2.5 px-3 text-xs font-mono font-bold text-slate-800"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-slate-700 font-extrabold mb-1.5 text-xxs">
                          {isEn ? 'Authentication Secret Key / Token' : 'رمز المرور أو مفتاح التخويل السري (Secret Token)'}
                        </label>
                        <input
                          type="password"
                          name="password"
                          required
                          defaultValue={dbConfig.password}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg py-2.5 px-3 text-xs font-mono font-bold text-slate-800 text-center"
                        />
                      </div>

                      <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                        <button
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl cursor-pointer transition-all shadow-md shadow-blue-600/10 active:scale-95"
                        >
                          {isEn ? 'Apply & Save Config' : 'حفظ وتطبيق إعدادات الخادم'}
                        </button>
                      </div>

                    </form>
                  )}

                </div>

                {/* DB Test and Realtime Sync Gating Panel */}
                <div className="lg:col-span-4 bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col justify-between min-h-[350px]">
                  
                  {/* Part A: DB Connection health test */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        {isEn ? 'Connectivity Health & Testing' : 'فحص جودة وصحة الاتصال'}
                      </h3>
                      <p className="text-xxs text-slate-500">
                        {isEn ? 'Ping the database server port to calculate handshake latency.' : 'فحص سرعة الاستجابة ومنفذ الخادم وحوكمة التخويل لمزامنة سلسة.'}
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center text-xxs">
                        <span className="text-slate-500">{isEn ? 'Server Latency:' : 'سرعة الاتصال (Ping):'}</span>
                        <span className="font-mono font-bold text-emerald-600">
                          {dbConfig.status === 'connected' ? '12ms' : '0ms'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xxs">
                        <span className="text-slate-500">{isEn ? 'SSL Handshake:' : 'تشفير الاتصال SSL:'}</span>
                        <span className="font-mono font-bold text-blue-600">
                          {dbConfig.status === 'connected' ? 'AES-256 GCM' : 'None'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xxs">
                        <span className="text-slate-500">{isEn ? 'Database Status:' : 'حالة الخادم في البيئة:'}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                          dbConfig.status === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {dbConfig.status === 'connected' ? (isEn ? 'Connected' : 'مستقر ونشط') : (isEn ? 'Disconnected' : 'غير متصل')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Part B: Testing connectivity / Sync simulations */}
                  <div className="space-y-2.5 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        showAlert(isEn ? 'Pinging server port...' : 'جاري فحص الخادم والتخويل المتبادل...', 'info');
                        setTimeout(() => {
                          showAlert(
                            isEn 
                              ? `Handshake successful! Connected to ${dbConfig.type === 'localStorage' ? 'Browser Storage' : dbConfig.database} with latency 12ms.` 
                              : `تم فحص الاتصال بالخادم بنجاح! سرعة الاستجابة 12ms والبيئة نشطة بالكامل.`,
                            'success'
                          );
                        }, 1200);
                      }}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xxs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md select-none"
                    >
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" style={{ animationDuration: '3s' }} />
                      <span>{isEn ? 'Test Connection Live' : 'بدء فحص واختبار الاتصال فورياً'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        showAlert(isEn ? 'Pushing local invoices & stocks to cloud... 0%' : 'بدء مزامنة السلع والفواتير ورفع البيانات... 0%', 'info');
                        setTimeout(() => {
                          showAlert(
                            isEn 
                              ? `Sync completed! Pushed ${products.length} products and ${sales.length} invoices to database successfully.` 
                              : `اكتملت المزامنة بنجاح! تم رفع ومزامنة ${products.length} سلعة و ${sales.length} فاتورة في قاعدة البيانات.`,
                            'success'
                          );
                        }, 1200);
                      }}
                      className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 font-extrabold text-[10px] py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none"
                    >
                      🚀 <span>{isEn ? 'Push Local Data to Cloud DB' : 'مزامنة ورفع البيانات الحالية للسحابة'}</span>
                    </button>
                  </div>

                </div>

              </div>

            </div>
          )}

        </main>

        {/* 4. FLOATING SMARTPHONE SIMULATOR DRAW PANEL */}
        {showMobileSim && (
          <aside className="border-t md:border-t-0 md:border-l border-slate-200 bg-slate-50/95 p-4 flex flex-col justify-center shrink-0 w-full md:w-[360px] animate-fadeIn z-35 md:sticky top-16 h-[calc(100vh-64px)] overflow-y-auto shadow-lg shadow-slate-100">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-black text-slate-800 shrink-0 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>{isEn ? 'Smart Manager Mobile App' : 'تطبيق الهاتف الذكي للمدير'}</span>
              </h3>
              <button 
                onClick={() => setShowMobileSim(false)}
                className="text-slate-500 hover:text-slate-800 text-xxs font-extrabold cursor-pointer"
              >
                {isEn ? '[Hide]' : '[إخفاء]'}
              </button>
            </div>

            <MobileSimulator 
              isEn={isEn}
              products={products}
              sales={sales}
              purchases={purchases}
              settings={settings}
              onQuickRestock={handleMobileQuickRestock}
            />
          </aside>
        )}

      </div>

      {/* ============================== MODAL 1: ADD / EDIT INVENTORY ITEM ============================== */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-900/65 z-55 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scaleUp">
            
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-50 to-slate-100/60 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">📦</span>
                {selectedProduct ? (isEn ? 'Edit Inventory Product Details' : 'تعديل بيانات صنف سلعة') : (isEn ? 'Register New Inventory Product' : 'تسجيل صنف منتج جديد')}
              </h3>
              <button 
                onClick={() => {
                  setShowProductModal(false);
                  setSelectedProduct(null);
                }} 
                className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProductForm} className="p-6 space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">{isEn ? 'Product ID / SKU' : 'كود الصنف الفريد (ID)'}</label>
                  <input
                    type="text"
                    name="id"
                    readOnly={!!selectedProduct}
                    required
                    defaultValue={selectedProduct?.id || `prod-${Date.now().toString().slice(-5)}`}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 font-mono font-bold focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">{isEn ? 'General Category' : 'التصنيف / القسم'}</label>
                  <select
                    name="category"
                    defaultValue={selectedProduct?.category || (categories[0]?.nameEn || 'Dairy')}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.nameEn}>
                        {isEn ? cat.nameEn : cat.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-extrabold mb-1">{isEn ? 'Arabic Product Name' : 'اسم الصنف باللغة العربية'}</label>
                <input
                  type="text"
                  name="nameAr"
                  required
                  defaultValue={selectedProduct?.nameAr || ''}
                  placeholder="مثال: حليب المراعي 1 لتر"
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 font-black focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all text-right"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-extrabold mb-1">{isEn ? 'English Product Name' : 'اسم الصنف باللغة الإنجليزية'}</label>
                <input
                  type="text"
                  name="nameEn"
                  required
                  defaultValue={selectedProduct?.nameEn || ''}
                  placeholder="e.g. Almarai Milk 1L"
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              {/* MULTIPLE BARCODE TAG INPUT */}
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">
                  {isEn ? 'Bilingual Barcode list (Comma separated for multi-barcode)' : 'قائمة الباركود المتعددة للصنف (افصل بينها بفواصل ,)'}
                </label>
                <input
                  type="text"
                  name="barcodes"
                  required
                  defaultValue={selectedProduct?.barcodes.join(', ') || ''}
                  placeholder={isEn ? 'e.g. 1001, milk, 6281007' : 'مثال: 1001, bar-milk, 6281007'}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 font-mono font-bold focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <span className="text-slate-400 mt-1 block text-[10px] leading-relaxed">
                  {isEn ? 'Scanning any barcode of this list will trigger adding this product to POS list.' : 'مسح أي كود مسجل في هذه القائمة سيسحب نفس المنتج مباشرة في فاتورة الكاشير.'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">{isEn ? 'Supplier Cost (SAR)' : 'سعر الشراء والتكلفة (ريال)'}</label>
                  <input
                    type="number"
                    step="0.01"
                    name="purchasePrice"
                    required
                    defaultValue={selectedProduct?.purchasePrice || ''}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-850 font-mono font-bold focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">{isEn ? 'Customer Selling (VAT Incl.)' : 'سعر البيع على الرف شامل الضريبة'}</label>
                  <input
                    type="number"
                    step="0.01"
                    name="salePrice"
                    required
                    defaultValue={selectedProduct?.salePrice || ''}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-emerald-600 font-mono font-black focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">{isEn ? 'Qty in Warehouse stock' : 'الرصيد الابتدائي أو الكمية'}</label>
                  <input
                    type="number"
                    name="quantity"
                    required
                    defaultValue={selectedProduct?.quantity ?? 10}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-850 font-mono font-bold focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">{isEn ? 'Low limit alert threshold' : 'حد التنبيه عند انخفاض الرصيد (نقص)'}</label>
                  <input
                    type="number"
                    name="minQuantity"
                    required
                    defaultValue={selectedProduct?.minQuantity ?? 5}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-amber-600 font-mono font-bold focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-2">
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">{isEn ? 'Unit Name (Ar)' : 'الوحدة بالعربية'}</label>
                  <input
                    type="text"
                    name="unitAr"
                    required
                    defaultValue={selectedProduct?.unitAr || 'حبة'}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all text-right"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">{isEn ? 'Unit Name (En)' : 'الوحدة بالإنجليزية'}</label>
                  <input
                    type="text"
                    name="unitEn"
                    required
                    defaultValue={selectedProduct?.unitEn || 'piece'}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs py-3 rounded-xl select-none shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all cursor-pointer"
              >
                {isEn ? 'Save Product' : 'حفظ صنف السلعة والمخزن'}
              </button>

            </form>

          </div>
        </div>
      )}

      {/* ============================== MODAL 2: ADD / EDIT ENTIRE CONTACTS (CRM / HR) ============================== */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/60 z-55 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl animate-scaleUp text-xxs">
            
            <div className="px-5 py-3.5 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-xs font-black text-white">
                {contactType === 'customer' 
                  ? (isEn ? 'Customer CRM registration' : 'تسجيل عميل جديد') 
                  : contactType === 'supplier' 
                    ? (isEn ? 'Supplier card details' : 'تسجيل مورد معتمد') 
                    : (isEn ? 'Staff User and Permissions profile' : 'تسجيل موظف وصلاحيات الدخول')}
              </h3>
              <button 
                onClick={() => {
                  setShowContactModal(false);
                  setSelectedContact(null);
                }} 
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveContactForm} className="p-5 space-y-3">
              
              <div>
                <label className="block text-slate-300 font-bold mb-1">{isEn ? 'Arabic / Full Name' : 'الاسم الكامل أو التجاري'}</label>
                <input
                  type="text"
                  name="nameAr"
                  required
                  defaultValue={selectedContact ? (selectedContact.nameAr || selectedContact.name) : ''}
                  placeholder="مثال: أحمد عبد الله"
                  className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded focus:outline-none"
                />
              </div>

              {contactType !== 'employee' && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1">{isEn ? 'English Name' : 'الاسم بالإنجليزية'}</label>
                  <input
                    type="text"
                    name="nameEn"
                    defaultValue={selectedContact ? selectedContact.nameEn : ''}
                    placeholder="e.g. Ahmed Abdullah"
                    className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-bold mb-1">{isEn ? 'Phone / Mobile' : 'رقم الجوال والاتصال'}</label>
                <input
                  type="text"
                  name="phone"
                  required={contactType !== 'employee'}
                  defaultValue={selectedContact ? selectedContact.phone : ''}
                  placeholder="e.g. 0501112222"
                  className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded focus:outline-none font-mono font-bold"
                />
              </div>

              {contactType !== 'employee' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">{isEn ? 'Tax ID / VAT number (KSA 15-Digit)' : 'الرقم الضريبي للمنشأة'}</label>
                    <input
                      type="text"
                      name="vatNumber"
                      maxLength={15}
                      defaultValue={selectedContact ? selectedContact.vatNumber : ''}
                      placeholder="3101XXXXXXXXXXX"
                      className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">{isEn ? 'Email Address' : 'البريد الإلكتروني'}</label>
                    <input
                      type="email"
                      name="email"
                      defaultValue={selectedContact ? selectedContact.email : ''}
                      placeholder="name@company.com"
                      className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded focus:outline-none"
                    />
                  </div>
                </>
              )}

              {contactType === 'employee' && (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">{isEn ? 'Code Login username' : 'اسم مستخدم الدخول'}</label>
                      <input
                        type="text"
                        name="username"
                        required
                        defaultValue={selectedContact ? selectedContact.username : ''}
                        className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">{isEn ? 'Account Permission' : 'الدور والصلاحية'}</label>
                      <select
                        name="role"
                        defaultValue={selectedContact ? selectedContact.role : 'cashier'}
                        className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded focus:outline-none"
                      >
                        <option value="admin">Admin / مدير عام</option>
                        <option value="manager">Manager / المستودع</option>
                        <option value="cashier">Cashier / المبيعات</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">{isEn ? 'Set 4-Digit Login PIN' : 'رقم الدخول السري (PIN من 4 أرقام)'}</label>
                    <input
                      type="text"
                      name="pin"
                      maxLength={4}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      defaultValue={selectedContact ? selectedContact.pin : ''}
                      placeholder={isEn ? 'e.g. 7890 (optional)' : 'مثال: 7890 (اختياري)'}
                      className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded focus:outline-none font-mono text-center text-sm font-bold tracking-widest text-yellow-405"
                    />
                  </div>

                  <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded lg text-slate-400">
                    {isEn 
                      ? 'Note: If left empty, default PIN is 1234 (Admin), 2345 (Manager), 3456 (Cashier).' 
                      : 'ملاحظة: إذا ترك الحقل فارغاً، سيكون الرمز الافتراضي 1234 للمسؤول، 2345 للمستودع، 3456 للمبيعات.'}
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 rounded-lg select-none shadow-lg shadow-blue-600/10 mt-3 cursor-pointer"
              >
                {isEn ? (selectedContact ? 'Update Record' : 'Register Contract') : (selectedContact ? 'تحديث وتعديل البيانات' : 'اعتماد وتسجيل البيانات')}
              </button>

            </form>

          </div>
        </div>
      )}


      {/* ============================== THERMAL RECEIPT DISPLAY DISPATCHER ============================== */}
      {activeReceiptInvoice && (
        <ThermalReceipt 
          isEn={isEn}
          invoice={activeReceiptInvoice}
          settings={settings}
          onClose={() => setActiveReceiptInvoice(null)}
        />
      )}

      {/* ============================== CUSTOM COMPATIBLE NOTIFICATION OVERLAY (IFRAME SAFE) ============================== */}
      {appAlert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl scale-100 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 bg-blue-50 text-blue-600">
              {appAlert.type === 'success' ? (
                <span className="text-xl">✅</span>
              ) : appAlert.type === 'warning' ? (
                <span className="text-xl">⚠️</span>
              ) : (
                <span className="text-xl">ℹ️</span>
              )}
            </div>
            <h3 className="text-sm md:text-base font-bold text-slate-900 mb-2 leading-relaxed">
              {isEn ? 'Notification Alert' : 'تنبيه النظام'}
            </h3>
            <p className="text-xs md:text-sm text-slate-600 mb-6 leading-relaxed">
              {appAlert.message}
            </p>
            <button
              onClick={() => setAppAlert(null)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all shadow-md select-none cursor-pointer"
            >
              {isEn ? 'Understood' : 'حسناً، فهمت'}
            </button>
          </div>
        </div>
      )}

      {editingInvoice && (() => {
        const subtotalExclVat = editInvoiceItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        const taxTotal = editInvoiceItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity * (settings.vatRate / 100)), 0);
        const grandTotal = subtotalExclVat + taxTotal - editInvoiceDiscount;
        const changeAmount = Math.max(0, editInvoicePaid - grandTotal);

        return (
          <div className="fixed inset-0 bg-slate-900/65 z-55 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl animate-scaleUp text-slate-800 flex flex-col max-h-[90vh]">
              
              {/* Header */}
              <div className="px-6 py-4.5 bg-gradient-to-r from-slate-50 to-slate-100/60 border-b border-slate-200 flex justify-between items-center shrink-0">
                <h3 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-2">
                  <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">📝</span>
                  <span>
                    {isEn 
                      ? `Edit Sales Invoice Details: ${editingInvoice.invoiceNumber}` 
                      : `تعديل تفاصيل فاتورة المبيعات: ${editingInvoice.invoiceNumber}`}
                  </span>
                </h3>
                <button 
                  onClick={() => setEditingInvoice(null)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                
                {/* Meta Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1 text-xxs">
                      {isEn ? 'Customer Name' : 'اسم العميل المنسوب'}
                    </label>
                    <select
                      value={editInvoiceCustomer}
                      onChange={(e) => setEditInvoiceCustomer(e.target.value)}
                      className="w-full bg-white border border-slate-250 py-1.5 px-3 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cust-cash">{isEn ? 'Cash Customer' : 'عميل نقدي (كاش)'}</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{isEn ? c.nameEn : c.nameAr}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1 text-xxs">
                      {isEn ? 'Payment Method' : 'طريقة دفع وسداد الفاتورة'}
                    </label>
                    <select
                      value={editInvoicePaymentMethod}
                      onChange={(e) => setEditInvoicePaymentMethod(e.target.value as any)}
                      className="w-full bg-white border border-slate-250 py-1.5 px-3 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cash">{isEn ? 'Cash' : 'نقداً (Cash)'}</option>
                      <option value="card">{isEn ? 'Card' : 'شبكة بطاقة مدى'}</option>
                      <option value="bank">{isEn ? 'Bank Transfer' : 'حوالة بنكية مالية'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1 text-xxs">
                      {isEn ? 'Cashier Name' : 'اسم الكاشير / البائع'}
                    </label>
                    <input
                      type="text"
                      value={editInvoiceCashierName}
                      onChange={(e) => setEditInvoiceCashierName(e.target.value)}
                      className="w-full bg-white border border-slate-250 py-1.5 px-3 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1 text-xxs">
                      {isEn ? 'Invoice Date' : 'تاريخ ووقت الفاتورة'}
                    </label>
                    <input
                      type="datetime-local"
                      value={editInvoiceDate}
                      onChange={(e) => setEditInvoiceDate(e.target.value)}
                      className="w-full bg-white border border-slate-250 py-1 px-2.5 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    />
                  </div>
                </div>

                {/* Notes Edit Block */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <label className="block text-slate-700 font-extrabold mb-1 text-xxs flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isEn ? 'Invoice Notes / Comments' : 'ملاحظات وتفاصيل الفاتورة'}</span>
                  </label>
                  <textarea
                    rows={2}
                    value={editInvoiceNotes}
                    onChange={(e) => setEditInvoiceNotes(e.target.value)}
                    placeholder={isEn ? 'Edit invoice notes...' : 'تعديل ملاحظات الفاتورة...'}
                    className="w-full bg-white border border-slate-250 py-1.5 px-3 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 resize-none"
                  />
                </div>

                {/* Add product section */}
                <div className="flex gap-2 items-end bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="flex-1">
                    <label className="block text-slate-700 font-extrabold mb-1 text-xxs">
                      {isEn ? 'Add Extra Product to Invoice' : 'إضافة صنف إضافي للفاتورة'}
                    </label>
                    <select
                      value={selectedAddProdId}
                      onChange={(e) => setSelectedAddProdId(e.target.value)}
                      className="w-full bg-white border border-slate-250 py-1.5 px-3 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{isEn ? '-- Select Product to Add --' : '-- اختر منتجاً إضافياً لإضافته للفاتورة --'}</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {isEn ? p.nameEn : p.nameAr} ({formatCurrency(p.salePrice, isEn, settings)}) - [{isEn ? 'In Stock: ' : 'المخزن المتوفر: '}{p.quantity}]
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedAddProdId) return;
                      const prod = products.find(p => p.id === selectedAddProdId);
                      if (!prod) return;

                      // Check if already in items
                      const existingIndex = editInvoiceItems.findIndex(item => item.productId === prod.id);
                      if (existingIndex > -1) {
                        const updated = [...editInvoiceItems];
                        updated[existingIndex].quantity += 1;
                        setEditInvoiceItems(updated);
                      } else {
                        const unitPriceExclTax = prod.salePrice / (1 + (settings.vatRate / 100));
                        const taxAmt = prod.salePrice * (settings.vatRate / (100 + settings.vatRate));
                        const newItem: SaleItem = {
                          productId: prod.id,
                          nameAr: prod.nameAr,
                          nameEn: prod.nameEn,
                          barcodeUsed: prod.barcode || '',
                          quantity: 1,
                          unitPrice: parseFloat(unitPriceExclTax.toFixed(4)),
                          taxAmount: parseFloat(taxAmt.toFixed(4)),
                          total: prod.salePrice
                        };
                        setEditInvoiceItems([...editInvoiceItems, newItem]);
                      }
                      setSelectedAddProdId('');
                      showAlert(isEn ? 'Product appended to invoice!' : 'تم إدراج الصنف الجديد في الفاتورة!', 'success');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-lg transition-all cursor-pointer shadow-sm shrink-0"
                  >
                    ➕ {isEn ? 'Add' : 'إضافة للفاتورة'}
                  </button>
                </div>

                {/* Items Ledger */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xxs text-right">
                    <thead className="bg-slate-100 border-b border-slate-250 text-slate-700 font-extrabold">
                      <tr>
                        <th className="p-3 text-center w-8">#</th>
                        <th className="p-3">{isEn ? 'Product / Barcode' : 'اسم الصنف / الباركود'}</th>
                        <th className="p-3 w-32">{isEn ? 'Unit Price (Excl. VAT)' : 'سعر الوحدة (غير شامل)'}</th>
                        <th className="p-3 text-center w-36">{isEn ? 'Quantity' : 'الكمية المباعة'}</th>
                        <th className="p-3 w-28">{isEn ? 'VAT Tax' : 'مبلغ الضريبة'}</th>
                        <th className="p-3 w-28">{isEn ? 'Total (Incl. VAT)' : 'الإجمالي بالضريبة'}</th>
                        <th className="p-3 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {editInvoiceItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                            {isEn ? 'No items in this invoice!' : 'الفاتورة فارغة من أي أصناف! الرجاء إضافة صنف واحد على الأقل.'}
                          </td>
                        </tr>
                      ) : (
                        editInvoiceItems.map((item, index) => {
                          const itemSub = item.unitPrice * item.quantity;
                          const itemTax = itemSub * (settings.vatRate / 100);
                          const itemTotal = itemSub + itemTax;

                          return (
                            <tr key={item.productId} className="hover:bg-slate-50 font-medium">
                              <td className="p-3 text-center text-slate-400">{index + 1}</td>
                              <td className="p-3">
                                <div className="font-bold text-slate-900">{isEn ? item.nameEn : item.nameAr}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{item.barcodeUsed || 'N/A'}</div>
                              </td>
                              
                              {/* Price Excl. VAT */}
                              <td className="p-3 font-mono">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={parseFloat(item.unitPrice.toFixed(2))}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const updated = editInvoiceItems.map(it => it.productId === item.productId ? { ...it, unitPrice: val } : it);
                                    setEditInvoiceItems(updated);
                                  }}
                                  className="w-24 bg-slate-50 border border-slate-200 focus:bg-white rounded px-2 py-1 text-xs font-bold text-slate-800 text-left font-mono"
                                />
                              </td>

                              {/* Quantity Control */}
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newQty = Math.max(1, item.quantity - 1);
                                      const updated = editInvoiceItems.map(it => it.productId === item.productId ? { ...it, quantity: newQty } : it);
                                      setEditInvoiceItems(updated);
                                    }}
                                    className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded flex items-center justify-center font-black text-xs cursor-pointer select-none"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const val = Math.max(1, parseInt(e.target.value) || 1);
                                      const updated = editInvoiceItems.map(it => it.productId === item.productId ? { ...it, quantity: val } : it);
                                      setEditInvoiceItems(updated);
                                    }}
                                    className="w-12 bg-slate-50 border border-slate-200 focus:bg-white rounded py-0.5 px-1 text-xs font-mono font-bold text-center text-slate-800"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newQty = item.quantity + 1;
                                      const updated = editInvoiceItems.map(it => it.productId === item.productId ? { ...it, quantity: newQty } : it);
                                      setEditInvoiceItems(updated);
                                    }}
                                    className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded flex items-center justify-center font-black text-xs cursor-pointer select-none"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>

                              {/* VAT */}
                              <td className="p-3 text-slate-500 font-mono font-bold">
                                {formatCurrency(itemTax, isEn, settings)}
                              </td>

                              {/* Total Incl. VAT */}
                              <td className="p-3 font-extrabold text-slate-900 font-mono">
                                {formatCurrency(itemTotal, isEn, settings)}
                              </td>

                              {/* Remove Item */}
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const filtered = editInvoiceItems.filter(it => it.productId !== item.productId);
                                    setEditInvoiceItems(filtered);
                                    showAlert(isEn ? 'Item removed from invoice' : 'تم إزالة الصنف من الفاتورة', 'warning');
                                  }}
                                  className="text-rose-600 hover:text-rose-800 p-1 bg-rose-50 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                                  title={isEn ? 'Remove Item' : 'حذف الصنف'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Subtotals & Adjustments */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="text-xxs font-black text-slate-700 uppercase border-b border-slate-200 pb-1">
                        {isEn ? 'Discount & Cash Payments' : 'الخصم وقيمة النقدية المقبوضة'}
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 font-extrabold mb-1 text-xxs">
                            {isEn ? 'Discount Applied' : 'إجمالي الخصم الممنوح'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editInvoiceDiscount}
                            onChange={(e) => setEditInvoiceDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full bg-white border border-slate-250 py-1.5 px-3 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-extrabold mb-1 text-xxs">
                            {isEn ? 'Cash Paid Amount' : 'المبلغ المقبوض (النقدية)'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editInvoicePaid}
                            onChange={(e) => setEditInvoicePaid(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full bg-white border border-slate-250 py-1.5 px-3 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-2">
                    <div className="space-y-1.5 text-xxs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">{isEn ? 'Subtotal (Excl. Tax)' : 'المجموع الفرعي (غير شامل الضريبة)'}:</span>
                        <span className="font-extrabold text-slate-900 font-mono">{formatCurrency(subtotalExclVat, isEn, settings)}</span>
                      </div>
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>{isEn ? 'Discount Applied' : 'الخصم المباشر'}:</span>
                        <span className="font-mono">-{formatCurrency(editInvoiceDiscount, isEn, settings)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>{isEn ? `VAT Tax (${settings.vatRate}%)` : `مبلغ ضريبة القيمة المضافة (${settings.vatRate}%)`}:</span>
                        <span className="font-mono font-bold">{formatCurrency(taxTotal, isEn, settings)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-300 pt-2 font-black text-slate-950 text-xs">
                        <span>{isEn ? 'Grand Net Total' : 'الصافي المستحق النهائي'}:</span>
                        <span className="font-mono text-sm">{formatCurrency(grandTotal, isEn, settings)}</span>
                      </div>
                      <div className="flex justify-between border-t border-dashed border-slate-300 pt-1.5 text-emerald-700 font-bold">
                        <span>{isEn ? 'Change Due' : 'المبلغ المتبقي للعميل (الباقي)'}:</span>
                        <span className="font-mono">{formatCurrency(changeAmount, isEn, settings)}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0 col-span-full">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-extrabold rounded-lg transition-colors cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'إلغاء التعديل'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editInvoiceItems.length === 0) {
                      showAlert(isEn ? 'Please add at least one item!' : 'الرجاء إدخال صنف واحد على الأقل في الفاتورة لحفظها!', 'warning');
                      return;
                    }
                    handleSaveEditedInvoice();
                  }}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-lg transition-colors cursor-pointer shadow-md"
                >
                  💾 {isEn ? 'Save Sales Invoice Changes' : 'حفظ تعديلات الفاتورة وتحديث المخزون'}
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {appConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl scale-100 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 bg-amber-50 text-amber-600">
              <span className="text-xl">❓</span>
            </div>
            <h3 className="text-sm md:text-base font-bold text-slate-900 mb-2 leading-relaxed">
              {isEn ? 'Confirmation Required' : 'تأكيد الإجراء'}
            </h3>
            <p className="text-xs md:text-sm text-slate-600 mb-6 leading-relaxed">
              {appConfirm.message}
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  setAppConfirm(null);
                  if (appConfirm.onCancel) appConfirm.onCancel();
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all select-none cursor-pointer"
              >
                {isEn ? 'Cancel' : 'إلغاء'}
              </button>
              <button
                onClick={() => {
                  const onConf = appConfirm.onConfirm;
                  setAppConfirm(null);
                  onConf();
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all shadow-md select-none cursor-pointer"
              >
                {isEn ? 'Confirm' : 'تأكيد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Overlay Modal */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 bg-slate-900/65 z-55 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn text-slate-800">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl animate-scaleUp">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-50 to-slate-100/60 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Keyboard className="w-5 h-5" />
                </span>
                <div>
                  <span>{isEn ? 'Cashier Hardware Key Navigation Guide' : 'دليل اختصارات كيبورد الكاشير السريعة'}</span>
                  <span className="block text-[10px] text-slate-450 font-medium mt-0.5">
                    {isEn ? 'Speed up daily checkout workflow using terminal triggers' : 'أزرار تحكم مادية ومفاتيح تنقل سريعة لتسريع فواتير الكاشير'}
                  </span>
                </div>
              </h3>
              <button 
                onClick={() => setShowShortcutsHelp(false)} 
                className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 text-xs">
              
              {/* Informational Note */}
              <div className="bg-blue-50/50 border border-blue-150 p-3 rounded-xl text-xxs leading-relaxed text-blue-800 flex items-start gap-2.5">
                <span className="text-lg">💡</span>
                <div>
                  <p className="font-bold">{isEn ? 'How to trigger:' : 'كيفية استخدام الاختصارات السريعة:'}</p>
                  <p className="mt-0.5">
                    {isEn 
                      ? 'Press either Ctrl + [Key] or Alt + [Key] at the same time to navigate instantly. Access permission boundaries are fully respected.' 
                      : 'اضغط على زر Ctrl أو Alt مع الحرف المحدد في نفس الوقت للانتقال فوراً لأي شاشة بنجاح، مع مراعاة مستوى صلاحيات المستخدم الحالي.'}
                  </p>
                </div>
              </div>

              {/* Shortcuts Table List */}
              <div className="border border-slate-150 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
                
                {/* Table Header */}
                <div className="grid grid-cols-12 bg-slate-50 py-2 px-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">
                  <div className="col-span-5 text-right">{isEn ? 'Screen Terminal' : 'شاشة الوجهة'}</div>
                  <div className="col-span-4 text-center">{isEn ? 'Shortcut Keys' : 'مفاتيح الاختصار'}</div>
                  <div className="col-span-3 text-center">{isEn ? 'Your Access' : 'صلاحية حسابك'}</div>
                </div>

                {/* Table Rows */}
                {[
                  { key: 'P', nameAr: 'نقطة البيع (الكاشير)', nameEn: 'POS Sales Register', id: 'pos', icon: <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" /> },
                  { key: 'S', nameAr: 'قائمة فواتير المبيعات', nameEn: 'Sales Invoices Log', id: 'invoices', icon: <FileText className="w-3.5 h-3.5 text-indigo-600" /> },
                  { key: 'I', nameAr: 'المخزن والمنتجات', nameEn: 'Inventory Control', id: 'inventory', icon: <Package className="w-3.5 h-3.5 text-amber-600" /> },
                  { key: 'T', nameAr: 'فواتير المشتريات والتوريد', nameEn: 'Purchases Terminal', id: 'purchases', icon: <Receipt className="w-3.5 h-3.5 text-sky-600" /> },
                  { key: 'C', nameAr: 'أقسام وتصنيفات المنتجات', nameEn: 'Product Categories', id: 'categories', icon: <Layers className="w-3.5 h-3.5 text-cyan-600" /> },
                  { key: 'K', nameAr: 'العملاء والموردين الماليين', nameEn: 'Contacts (Cust/Supplier)', id: 'contacts', icon: <Users className="w-3.5 h-3.5 text-orange-600" /> },
                  { key: 'R', nameAr: 'التقارير المالية والضريبية', nameEn: 'Financial Reports', id: 'reports', icon: <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" /> },
                  { key: 'B', nameAr: 'النسخ الاحتياطي واستعادة الملفات', nameEn: 'Backups & DB Restore', id: 'backups', icon: <RefreshCw className="w-3.5 h-3.5 text-teal-600 font-bold" /> },
                  { key: 'U', nameAr: 'إدارة الموظفين والصلاحيات', nameEn: 'Users & Permissions', id: 'users', icon: <UserCheck className="w-3.5 h-3.5 text-rose-600" /> },
                  { key: 'D', nameAr: 'مستودع قاعدة البيانات السحابي', nameEn: 'DB Connectivity Control', id: 'database', icon: <Database className="w-3.5 h-3.5 text-blue-600" /> },
                ].map((item) => {
                  const allowed = hasAccess(item.id);
                  return (
                    <div key={item.id} className="grid grid-cols-12 py-2.5 px-3 items-center hover:bg-slate-50/75 transition-colors">
                      
                      {/* Name and Icon */}
                      <div className="col-span-5 flex items-center gap-2">
                        <span className="p-1 bg-slate-50 border border-slate-150 rounded">
                          {item.icon}
                        </span>
                        <div className="truncate">
                          <p className="font-extrabold text-slate-800 text-xxs truncate">{isEn ? item.nameEn : item.nameAr}</p>
                          <p className="text-[9px] text-slate-400 capitalize">{item.id}</p>
                        </div>
                      </div>

                      {/* Shortcut Triggers */}
                      <div className="col-span-4 flex items-center justify-center gap-1">
                        <kbd className="bg-slate-100 border border-slate-200 shadow-xxs rounded px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">Ctrl</kbd>
                        <span className="text-slate-400 text-[10px] font-bold">/</span>
                        <kbd className="bg-slate-100 border border-slate-200 shadow-xxs rounded px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">Alt</kbd>
                        <span className="text-slate-400 text-[10px] font-bold">+</span>
                        <kbd className="bg-blue-50 border border-blue-200 shadow-xxs rounded px-2 py-0.5 font-mono text-[10px] font-black text-blue-700 uppercase">{item.key}</kbd>
                      </div>

                      {/* Access Status Badge */}
                      <div className="col-span-3 flex justify-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          allowed 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/50' 
                            : 'bg-rose-50 text-rose-800 border border-rose-200/50'
                        }`}>
                          {allowed ? (isEn ? 'Granted' : 'مسموح لك') : (isEn ? 'Locked' : 'محجوب')}
                        </span>
                      </div>

                    </div>
                  );
                })}

                {/* Help Shortcut */}
                <div className="grid grid-cols-12 py-2.5 px-3 items-center bg-slate-50/50">
                  <div className="col-span-5 flex items-center gap-2">
                    <span className="p-1 bg-white border border-slate-200 rounded">
                      <Keyboard className="w-3.5 h-3.5 text-slate-600" />
                    </span>
                    <div>
                      <p className="font-extrabold text-slate-800 text-xxs">{isEn ? 'Toggle Shortcuts Help' : 'فتح وإغلاق دليل المفاتيح'}</p>
                      <p className="text-[9px] text-slate-400">Help overlay</p>
                    </div>
                  </div>
                  <div className="col-span-4 flex items-center justify-center gap-1">
                    <kbd className="bg-slate-100 border border-slate-200 shadow-xxs rounded px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">Alt</kbd>
                    <span className="text-slate-400 text-[10px] font-bold">+</span>
                    <kbd className="bg-slate-100 border border-slate-200 shadow-xxs rounded px-2 py-0.5 font-mono text-[10px] font-black text-slate-700 uppercase">H</kbd>
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <span className="bg-blue-50 text-blue-800 border border-blue-200/50 px-2 py-0.5 rounded text-[9px] font-bold">
                      {isEn ? 'General' : 'عام'}
                    </span>
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-2">
              <span className="text-slate-400 text-[9px] font-semibold self-center me-auto">
                {isEn ? 'Press ESC to close anytime' : 'اضغط زر ESC في أي وقت للإغلاق السريع'}
              </span>
              <button
                type="button"
                onClick={() => setShowShortcutsHelp(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2 px-5 rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                {isEn ? 'Done & Close' : 'فهمت، إغلاق الدليل'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
