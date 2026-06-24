import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { 
  ScanBarcode, Keyboard, HelpCircle, Tag, Plus, Edit2, Trash2, 
  RotateCcw, Check, X, Settings 
} from 'lucide-react';

interface PresetItem {
  id: string;
  name: string;
  barcode: string;
  category?: string;
}

interface BarcodeScannerEmulatorProps {
  isEn: boolean;
  products: Product[];
  onScan: (barcode: string) => void;
}

export default function BarcodeScannerEmulator({ isEn, products, onScan }: BarcodeScannerEmulatorProps) {
  const [typedBarcode, setTypedBarcode] = useState('');
  const [showHelper, setShowHelper] = useState(false);
  
  // Custom quick presets state
  const [presets, setPresets] = useState<PresetItem[]>(() => {
    const stored = localStorage.getItem('erp_scanner_presets');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    return [];
  });

  // Populate presets from products on mount/update if none exist
  useEffect(() => {
    if (presets.length === 0 && products.length > 0) {
      const initial = products.flatMap(p => 
        p.barcodes.slice(0, 1).map(bcd => ({
          id: `preset-${p.id}-${bcd}`,
          name: isEn ? p.nameEn : p.nameAr,
          barcode: bcd,
          category: p.category
        }))
      ).slice(0, 4);
      setPresets(initial);
      localStorage.setItem('erp_scanner_presets', JSON.stringify(initial));
    }
  }, [products]);

  // Management mode states
  const [isEditingPresets, setIsEditingPresets] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PresetItem | null>(null);

  // Form inputs
  const [formName, setFormName] = useState('');
  const [formBarcode, setFormBarcode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedBarcode.trim()) {
      onScan(typedBarcode.trim());
      setTypedBarcode('');
    }
  };

  const handleSaveAdd = () => {
    if (!formName.trim() || !formBarcode.trim()) return;
    const newPreset: PresetItem = {
      id: `preset-custom-${Date.now()}`,
      name: formName.trim(),
      barcode: formBarcode.trim()
    };
    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem('erp_scanner_presets', JSON.stringify(updated));
    // Reset form states
    setFormName('');
    setFormBarcode('');
    setIsAdding(false);
  };

  const handleSaveEdit = () => {
    if (!editingPreset || !formName.trim() || !formBarcode.trim()) return;
    const updated = presets.map(item => 
      item.id === editingPreset.id 
        ? { ...item, name: formName.trim(), barcode: formBarcode.trim() }
        : item
    );
    setPresets(updated);
    localStorage.setItem('erp_scanner_presets', JSON.stringify(updated));
    // Reset form states
    setEditingPreset(null);
    setFormName('');
    setFormBarcode('');
  };

  const handleDelete = (id: string) => {
    const updated = presets.filter(item => item.id !== id);
    setPresets(updated);
    localStorage.setItem('erp_scanner_presets', JSON.stringify(updated));
  };

  const handleReset = () => {
    const initial = products.flatMap(p => 
      p.barcodes.slice(0, 1).map(bcd => ({
        id: `preset-${p.id}-${bcd}`,
        name: isEn ? p.nameEn : p.nameAr,
        barcode: bcd,
        category: p.category
      }))
    ).slice(0, 4);
    setPresets(initial);
    localStorage.setItem('erp_scanner_presets', JSON.stringify(initial));
    setIsAdding(false);
    setEditingPreset(null);
    setFormName('');
    setFormBarcode('');
  };

  const startEdit = (item: PresetItem) => {
    setEditingPreset(item);
    setFormName(item.name);
    setFormBarcode(item.barcode);
    setIsAdding(false);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingPreset(null);
    setFormName('');
    setFormBarcode('');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm animate-fadeIn">
      
      {/* Header of Emulator */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2 text-blue-600">
          <ScanBarcode className="w-5 h-5 animate-pulse" />
          <h3 className="text-sm font-black text-slate-900">
            {isEn ? 'Hardware Barcode Emulator' : 'محاكي قارئ الباركود الرقمي'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsEditingPresets(!isEditingPresets);
              setIsAdding(false);
              setEditingPreset(null);
            }}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
              isEditingPresets 
                ? 'bg-blue-50 border-blue-200 text-blue-600' 
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
            }`}
            title={isEn ? 'Manage Quick Preset Buttons' : 'التحكم وتعديل أزرار المحاكاة السريعة'}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowHelper(!showHelper)}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            title={isEn ? 'Help Guide' : 'مساعدة'}
          >
            <HelpCircle className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {showHelper && (
        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 p-3 rounded-lg mb-4 space-y-1.5 leading-relaxed">
          <p className="font-semibold text-amber-800">
            {isEn ? '🔌 Plug & Play Scanner Integration:' : '🔌 توصيل قارئ الباركود الحقيقي:'}
          </p>
          <p>
            {isEn 
              ? 'Real USB barcode guns work by simulating keyboard input followed by "Enter". The system automatically hooks onto scanner inputs anywhere on the cashier screen.' 
              : 'القارئ الضوئي اليدوي يعمل بمحاكاة الكيبورد (Keyboard Emulation). كاشير النظام مهيأ لتسجيل الباركود تلقائياً عند مسح أي حبة بضغطة زر القارئ.'}
          </p>
          <p className="text-slate-400 mt-1">
            {isEn ? 'Try typing a barcode/ID below (e.g., 1001 or 1002) and press enter, or click the presets.' : 'جرب كتابة باركود أدناه (مثل 1001 أو 1002) واضغط تم، أو انقر الاختصارات بالأسفل.'}
          </p>
        </div>
      )}

      {/* Barcode Form Input */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={typedBarcode}
            onChange={(e) => setTypedBarcode(e.target.value)}
            placeholder={isEn ? 'Type/Scan Barcode & hit Enter...' : 'اكتب أو امسح الباركود واضغط Enter...'}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3 py-2.5 rounded-lg pl-9 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-center"
          />
          <div className="absolute left-2.5 top-2.5 text-slate-405">
            <Keyboard className="w-4 h-4 text-slate-400" />
          </div>
          <button
            type="submit"
            className="absolute right-1 top-1 bottom-1 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 rounded-md transition-colors cursor-pointer font-bold"
          >
            {isEn ? 'Scan' : 'قراءة'}
          </button>
        </div>
      </form>

      {/* Management Mode Panel */}
      {isEditingPresets ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
          
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="text-xxs font-black text-slate-700 uppercase">
              {isEn ? 'Simulation Buttons Control' : 'لوحة التحكم بأزرار المحاكاة'}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleReset}
                className="bg-white border border-slate-200 hover:border-slate-300 text-slate-600 p-1 rounded text-xxs flex items-center gap-1 cursor-pointer font-bold"
                title={isEn ? 'Reset to Defaults' : 'استعادة الافتراضي'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isEn ? 'Reset' : 'الافتراضي'}</span>
              </button>
              <button
                type="button"
                onClick={startAdd}
                className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xxs flex items-center gap-1 cursor-pointer font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isEn ? 'Add' : 'إضافة زر'}</span>
              </button>
            </div>
          </div>

          {/* Inline Add / Edit Form */}
          {(isAdding || editingPreset) && (
            <div className="bg-white border border-blue-100 rounded-lg p-2.5 space-y-2 shadow-sm animate-fadeIn">
              <p className="text-[10px] font-black text-blue-700">
                {isAdding 
                  ? (isEn ? 'Add Quick Simulation Button' : 'إضافة زر محاكاة جديد') 
                  : (isEn ? 'Edit Simulation Button' : 'تعديل زر المحاكاة')
                }
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-0.5">
                    {isEn ? 'Button Label/Name' : 'اسم الزر أو الصنف'}
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={isEn ? 'e.g. Milk' : 'مثال: حليب ممتاز'}
                    className="w-full bg-slate-50 border border-slate-200 text-xxs p-1.5 rounded text-slate-800 focus:bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-0.5">
                    {isEn ? 'Barcode Number' : 'رقم الباركود'}
                  </label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="e.g. 1001"
                    className="w-full bg-slate-50 border border-slate-200 text-xxs p-1.5 rounded text-slate-800 font-mono text-center focus:bg-white font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingPreset(null);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1 rounded text-xxs font-bold cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  type="button"
                  onClick={isAdding ? handleSaveAdd : handleSaveEdit}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xxs font-black flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>{isEn ? 'Save' : 'حفظ'}</span>
                </button>
              </div>
            </div>
          )}

          {/* List of current presets */}
          <div className="max-h-[140px] overflow-y-auto space-y-1 pr-1">
            {presets.length === 0 ? (
              <p className="text-center text-[10px] text-slate-450 py-3">
                {isEn ? 'No custom simulation buttons defined.' : 'لا توجد أزرار محاكاة مخصصة حالياً.'}
              </p>
            ) : (
              presets.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-2 flex justify-between items-center transition-all shadow-xxs"
                >
                  <div className="overflow-hidden">
                    <p className="text-xxs font-black text-slate-800 truncate">{item.name}</p>
                    <p className="text-[9px] text-slate-400 font-mono">BC: {item.barcode}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="p-1 rounded bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-150 transition-colors cursor-pointer"
                      title={isEn ? 'Edit Preset' : 'تعديل الزر'}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1 rounded bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-150 transition-colors cursor-pointer"
                      title={isEn ? 'Delete Preset' : 'حذف الزر'}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                setIsEditingPresets(false);
                setIsAdding(false);
                setEditingPreset(null);
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black px-4 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isEn ? 'Finish Controlling' : 'تم العودة للمحاكي'}</span>
            </button>
          </div>

        </div>
      ) : (
        /* Regular Presets Grid */
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <p className="text-xxs text-slate-500 font-bold uppercase tracking-wider">
              {isEn ? 'Quick Scan Mock Buttons' : 'أزرار محاكاة سريعة لباركود المنتجات'}
            </p>
            <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-full border border-slate-200">
              {presets.length} {isEn ? 'Btns' : 'أزرار'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {presets.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onScan(item.barcode)}
                className="flex items-center gap-1.5 justify-between bg-slate-50 hover:bg-slate-100 border border-slate-205 hover:border-slate-300 rounded-lg p-2 text-right transition-all group duration-150 cursor-pointer shadow-xxs hover:scale-[1.01]"
              >
                <div className="overflow-hidden">
                  <p className="text-xxs text-slate-700 font-black truncate group-hover:text-blue-600">
                    {item.name}
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono">
                    {isEn ? 'BC:' : 'كود:'} {item.barcode}
                  </p>
                </div>
                <Tag className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
