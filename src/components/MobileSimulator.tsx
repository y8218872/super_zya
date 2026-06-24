import { useState } from 'react';
import { Product, SaleInvoice, StoreSettings, PurchaseInvoice } from '../types';
import { formatCurrency } from '../initialData';
import { 
  Smartphone, Bell, Signal, Wifi, Battery, Home, 
  TrendingUp, AlertTriangle, RefreshCw, Layers, DollarSign, ArrowUpRight, ShoppingBag
} from 'lucide-react';

interface MobileSimulatorProps {
  isEn: boolean;
  products: Product[];
  sales: SaleInvoice[];
  purchases: PurchaseInvoice[];
  settings: StoreSettings;
  onQuickRestock: (productId: string, qty: number) => void;
}

export default function MobileSimulator({ 
  isEn, products, sales, purchases, settings, onQuickRestock 
}: MobileSimulatorProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'sales' | 'alerts'>('home');
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync animation
  const triggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 800);
  };

  // Calculations that feed the smartphone reports
  const totalSalesVal = sales.filter(s => !s.isVoided).reduce((sum, s) => sum + s.grandTotal, 0);
  const totalCostVal = sales.filter(s => !s.isVoided).reduce((sum, s) => {
    return sum + s.items.reduce((itemSum, item) => {
      // Find purchase price of product
      const pObj = products.find(p => p.id === item.productId);
      const cost = pObj ? pObj.purchasePrice : item.unitPrice * 0.7;
      return itemSum + (cost * item.quantity);
    }, 0);
  }, 0);
  
  const profitVal = totalSalesVal - totalCostVal;
  const currentStockItems = products.reduce((sum, p) => sum + p.quantity, 0);
  const alertCount = products.filter(p => p.quantity <= p.minQuantity).length;
  
  // Latest 4 invoices for activity feed
  const recentSales = [...sales].reverse().slice(0, 4);
  const alertedProducts = products.filter(p => p.quantity <= p.minQuantity);

  return (
    <div className="w-full max-w-[340px] bg-slate-900 border-x-8 border-y-12 border-slate-950 rounded-[40px] shadow-2xl relative overflow-hidden h-[540px] flex flex-col mx-auto shrink-0 mb-4 ring-4 ring-slate-800/80">
      
      {/* Phone Notch/Ear Speaker */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-910 rounded-b-2xl z-20 flex justify-center items-center gap-2">
        <div className="w-12 h-1 bg-stone-700 rounded-full"></div>
        <div className="w-2.5 h-2.5 bg-sky-950 rounded-full border border-sky-800/50"></div>
      </div>

      {/* Hardware Status Bar */}
      <div className="bg-slate-950 px-5 pt-7 pb-1 text-white text-[10px] flex justify-between items-center z-10 shrink-0 font-sans select-none">
        <span className="font-bold">07:21</span>
        <div className="flex items-center gap-1.5 opacity-85">
          <Signal className="w-3 h-3 text-white" />
          <Wifi className="w-3 h-3 text-white" />
          <div className="flex items-center gap-0.5">
            <Battery className="w-4 h-4 text-emerald-400" />
            <span className="scale-90 font-mono font-bold">100%</span>
          </div>
        </div>
      </div>

      {/* Mobile Top App Header */}
      <div className="bg-white border-b border-slate-200/80 px-4 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <h4 className="text-[10px] text-slate-800 font-black leading-none uppercase tracking-wider">
              {isEn ? settings.storeNameEn : settings.storeNameAr}
            </h4>
            <span className="text-[9px] text-slate-400 font-bold">
              {isEn ? 'Mobile Companion App' : 'تطبيق المدير اللحظي'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={triggerSync} 
            className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
          <div className="relative cursor-pointer">
            <Bell className="w-4 h-4 text-slate-600" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white flex items-center justify-center text-[7px] text-white font-black animate-pulse">
                {alertCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SCREEN SCROLLABLE AREA */}
      <div className="flex-1 overflow-y-auto bg-slate-55 p-3 flex flex-col font-sans">
        
        {activeTab === 'home' && (
          <div className="space-y-3.5 animate-fadeIn">
            {/* Quick Greeting */}
            <div className="text-right flex flex-col">
              <p className="text-xxs text-slate-500 font-bold">
                {isEn ? 'Welcome back, Admin' : 'مرحباً، المشرف العام'}
              </p>
              <h2 className="text-xs font-black text-slate-900">
                {isEn ? 'Real-time Sales Radar' : 'تقرير العمليات المباشر'}
              </h2>
            </div>

            {/* Simulated Live Profit Card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-850 rounded-2xl p-4 text-white relative overflow-hidden border border-blue-500/20 shadow-lg shadow-indigo-950/5">
              <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/5 rounded-full filter blur-md"></div>
              <p className="text-[10px] text-blue-100 uppercase font-black tracking-wide">
                {isEn ? 'Net Sales Margin (Profit)' : 'هامش الأرباح الصافي'}
              </p>
              <h3 className="text-lg font-black mt-1">
                {formatCurrency(profitVal, isEn, settings)}
              </h3>
              <div className="flex justify-between items-center mt-3.5 border-t border-white/10 pt-2 text-[9px] text-blue-100">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                  <span>+{isEn ? '15.4% growth' : '15.4% نمو إيجابي'}</span>
                </div>
                <span>{isEn ? 'Offline-Synced' : 'سحابة تزامنت الآن'}</span>
              </div>
            </div>

            {/* Quick Metrics grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white border border-slate-200 p-3 rounded-xl flex items-center gap-2 shadow-sm">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <span className="text-[8px] text-slate-400 font-extrabold uppercase truncate block">
                    {isEn ? 'Total Revenue' : 'إجمالي المبيعات'}
                  </span>
                  <span className="text-[11px] font-black text-slate-900 block font-mono">
                    {formatCurrency(totalSalesVal, isEn, settings)}
                  </span>
                </div>
              </div>
              
              <div className="bg-white border border-slate-200 p-3 rounded-xl flex items-center gap-2 shadow-sm">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 font-extrabold uppercase truncate block">
                    {isEn ? 'Stock Volume' : 'حجم المخزون'}
                  </span>
                  <span className="text-[11px] font-black text-slate-900 block font-mono">
                    {currentStockItems} {isEn ? 'Items' : 'قطعة'}
                  </span>
                </div>
              </div>
            </div>

            {/* Latest Sales Activity list */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] text-slate-450 font-extrabold uppercase">
                  {isEn ? 'Real-time Activity Stream' : 'آخر عمليات المبيعات'}
                </span>
                <button 
                  onClick={() => setActiveTab('sales')}
                  className="text-[9px] text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  {isEn ? 'See All' : 'شاهد الكل'}
                </button>
              </div>

              {recentSales.length === 0 ? (
                <div className="text-center py-6 bg-white rounded-xl border border-slate-200 text-[10px] text-slate-400 font-medium shadow-sm">
                  {isEn ? 'No sales completed today' : 'لا توجد فواتير مبيعات اليوم بعد'}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {recentSales.map((sale) => (
                    <div key={sale.id} className="bg-white border border-slate-200/80 rounded-xl p-2.5 flex justify-between items-center shadow-sm">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 text-xxs font-mono font-bold">
                          POS
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[10px] font-bold text-slate-800 truncate font-mono">
                            {sale.invoiceNumber}
                          </p>
                          <span className="text-[8px] text-slate-500 font-medium">
                            {sale.items.length} {isEn ? 'items' : 'أصناف'} • {sale.paymentMethod.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="text-left font-black text-[10px] text-slate-900 shrink-0 font-mono">
                        {formatCurrency(sale.grandTotal, isEn, settings)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="space-y-3.5 animate-fadeIn">
            <h3 className="text-xs font-black text-slate-900 border-b border-slate-200 pb-1.5 flex justify-between items-center">
              <span>{isEn ? 'All Synced Sales Invoices' : 'جميع الفواتير المتزامنة'}</span>
              <span className="bg-blue-50 border border-blue-200 text-blue-700 px-1.5 py-0.5 rounded-full text-[8px] font-bold">
                {sales.length} {isEn ? 'Invoices' : 'فاتورة'}
              </span>
            </h3>

            <div className="space-y-2 max-h-[340px] overflow-y-auto">
              {sales.length === 0 ? (
                <div className="text-center py-12 text-[10px] text-slate-400">
                  {isEn ? 'Store records empty' : 'سجل الفواتير فارغ حالياً'}
                </div>
              ) : (
                [...sales].reverse().map((sale) => (
                  <div key={sale.id} className="bg-white border border-slate-200/80 rounded-xl p-3 flex flex-col gap-1.5 hover:border-slate-300 transition-colors shadow-sm">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-900 font-mono">{sale.invoiceNumber}</span>
                      <span className="text-slate-400 text-[8px]">
                        {new Date(sale.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-0.5 border-t border-slate-100 pt-1.5">
                      <div className="text-[9px] text-slate-500 font-medium">
                        <span className="font-bold block text-slate-800">{sale.customerName}</span>
                        <span className="text-slate-400 block text-[8px]">By {sale.cashierName}</span>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 font-mono">
                        {formatCurrency(sale.grandTotal, isEn, settings)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-3 animate-fadeIn">
            <h3 className="text-xs font-black text-slate-900 border-b border-slate-200 pb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1 text-amber-600 font-black">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{isEn ? 'Low Stock Alerts' : 'تنبيهات انخفاض الكميات'}</span>
              </span>
              <span className="bg-rose-50 border border-rose-200 text-rose-700 px-1.5 py-0.5 rounded-full text-[8px] font-bold font-mono shadow-sm">
                {alertCount}
              </span>
            </h3>

            <div className="space-y-2 max-h-[340px] overflow-y-auto font-sans">
              {alertedProducts.length === 0 ? (
                <div className="text-center py-12 text-[10px] text-slate-400 font-medium">
                  {isEn ? 'All products are fully stocked!' : 'جميع كميات الأصناف آمنة وممتازة!'}
                </div>
              ) : (
                alertedProducts.map((p) => (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2 hover:border-slate-350 duration-150 transition-colors shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="overflow-hidden pr-2">
                        <p className="text-[10px] font-bold text-slate-800 truncate">
                          {isEn ? p.nameEn : p.nameAr}
                        </p>
                        <p className="text-[8px] text-slate-400 font-mono">BC: {p.barcodes[0]}</p>
                      </div>
                      <span className="bg-rose-50 border border-rose-200 text-rose-750 text-[8px] px-1.5 py-0.5 rounded font-black shrink-0 font-mono font-bold">
                        {p.quantity} {isEn ? 'left' : 'متبقي'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                      <div className="text-[8px] text-slate-500 font-bold">
                        {isEn ? 'Alert limit:' : 'حد التنبيه:'} {p.minQuantity} {isEn ? p.unitEn : p.unitAr}
                      </div>

                      <button
                        onClick={() => onQuickRestock(p.id, 50)}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-[8px] font-black px-2 py-1 rounded flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                      >
                        <ShoppingBag className="w-2.5 h-2.5" />
                        <span>{isEn ? '+50 Order' : '+50 تزويد'}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* HARDWARE HOME BUTTON BAR (Tabs for screen control) */}
      <div className="bg-white border-t border-slate-200 px-4 py-2 flex justify-around items-center shrink-0">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer ${activeTab === 'home' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}
        >
          <Home className="w-4.5 h-4.5" />
          <span className="text-[8px] font-bold font-sans">
            {isEn ? 'Home' : 'الرئيسية'}
          </span>
        </button>
        
        <button 
          onClick={() => setActiveTab('sales')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer relative ${activeTab === 'sales' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}
        >
          <ArrowUpRight className="w-4.5 h-4.5" />
          <span className="text-[8px] font-bold font-sans">
            {isEn ? 'Sales' : 'المبيعات'}
          </span>
        </button>

        <button 
          onClick={() => setActiveTab('alerts')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer relative ${activeTab === 'alerts' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}
        >
          <AlertTriangle className="w-4.5 h-4.5" />
          {alertCount > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
          )}
          <span className="text-[8px] font-bold font-sans">
            {isEn ? 'Alerts' : 'التنبيهات'}
          </span>
        </button>
      </div>

      {/* Android Screen Touch Handle */}
      <div className="bg-slate-950 py-1.5 flex justify-center items-center shrink-0">
        <div className="w-24 h-1 bg-stone-700 rounded-full"></div>
      </div>

    </div>
  );
}
