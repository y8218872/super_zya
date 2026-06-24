import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { PRESET_USERS, ADMIN_PIN, MANAGER_PIN, CASHIER_PIN } from '../initialData';
import { Shield, Key, Eye, EyeOff, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface LoginScreenProps {
  isEn: boolean;
  onLoginSuccess: (user: User) => void;
  employees?: User[];
}

export default function LoginScreen({ isEn, onLoginSuccess, employees }: LoginScreenProps) {
  const userList = employees && employees.length > 0 ? employees : PRESET_USERS;
  const [selectedUserId, setSelectedUserId] = useState<string>(userList[0]?.id || 'usr-1');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [welcomeAnimation, setWelcomeAnimation] = useState(false);

  const selectedUser = userList.find(u => u.id === selectedUserId) || userList[0] || PRESET_USERS[0];

  const getCorrectPin = (user: User) => {
    if (user.pin && user.pin.trim().length === 4) {
      return user.pin.trim();
    }
    if (user.role === 'admin') return ADMIN_PIN;
    if (user.role === 'manager') return MANAGER_PIN;
    return CASHIER_PIN;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = getCorrectPin(selectedUser);
    
    if (pin === correctPin) {
      setError('');
      setWelcomeAnimation(true);
      setTimeout(() => {
        onLoginSuccess(selectedUser);
      }, 700);
    } else {
      setError(isEn ? 'Invalid PIN code. Please try again.' : 'رمز PIN غير صحيح. يرجى المحاولة مرة أخرى.');
    }
  };

  const currentPinHint = getCorrectPin(selectedUser);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorative Rings */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl opacity-10"></div>
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-emerald-550 rounded-full filter blur-3xl opacity-10"></div>

      <div className={`w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xl transition-all duration-500 scale-100 ${welcomeAnimation ? 'scale-95 opacity-0' : ''}`}>
        
        {/* Localization Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-blue-50 rounded-full text-blue-600 mb-3 border border-blue-200">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isEn ? 'Integrated ERP & POS Portal' : 'نظام المبيعات والمخزون المتكامل'}
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1.5 font-medium">
            {isEn ? 'Secure Offline & CRM Unified Management' : 'إدارة موحدة للمبيعات والمشتريات والمستودعات'}
          </p>
        </div>

        {/* Demo Helper Alert Block */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 text-slate-700">
          <div className="flex gap-2 items-start text-xs md:text-sm">
            <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900 mb-1">
                {isEn ? 'Demo Credentials Info:' : 'بيانات الدخول التجريبية:'}
              </p>
              <ul className={`list-disc list-inside space-y-0.5 text-xs text-slate-600 ${isEn ? 'text-left' : 'text-right'}`}>
                {userList.map((usr) => (
                  <li key={usr.id}>
                    <span className="font-bold text-slate-800">{usr.name}:</span> PIN <code className="bg-slate-200 px-1 py-0.5 rounded text-blue-700 font-mono select-all">{getCorrectPin(usr)}</code>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* User Selection Grid */}
          <div>
            <label className="block text-slate-700 text-sm font-semibold mb-2">
              {isEn ? 'Select User Account' : 'اختر حساب المستخدم'}
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1">
              {userList.map((usr) => {
                const isSelected = selectedUser.id === usr.id;
                return (
                  <button
                    key={usr.id}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(usr.id);
                      setError('');
                      setPin('');
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border text-right transition-all duration-200 ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-500 text-slate-900 shadow-md'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350 hover:text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                          {isEn ? (usr.role === 'admin' ? 'Administrator' : usr.role === 'manager' ? 'Inventory Manager' : 'Sales Cashier') : usr.name}
                        </p>
                        <p className="text-xxs text-slate-500">
                          {isEn ? `Role: ${usr.role.toUpperCase()}` : `الصلاحية: ${usr.role === 'admin' ? 'كامل الصلاحيات' : usr.role === 'manager' ? 'إدارة الأصناف' : 'شاشة البيع فقط'}`}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Password (PIN) Form */}
          <div>
            <label className="block text-slate-700 text-sm font-semibold mb-1.5" htmlFor="pin-input">
              {isEn ? `Enter ${selectedUser.username.toUpperCase()} PIN` : `أدخل رمز PIN لحساب (${selectedUser.username})`}
            </label>
            <div className="relative">
              <input
                id="pin-input"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''));
                  setError('');
                }}
                placeholder="••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-center text-xl font-bold tracking-widest text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex gap-2 items-center text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-md py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/20 active:scale-[0.98]"
          >
            {isEn ? 'Unlock System' : 'تسجيل الدخول الآمن'}
          </button>
        </form>

        <div className="mt-6 text-center text-slate-400 text-xxs font-mono">
          <span>{isEn ? 'SYSTEM VER: 4.1.0 (OFFLINE SYNC ENFORCED)' : 'إصدار النظام الحالي: 4.1.0'}</span>
        </div>
      </div>
    </div>
  );
}
