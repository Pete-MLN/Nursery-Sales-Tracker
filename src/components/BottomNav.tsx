import React from 'react';
import { ScreenType } from '../types';
import { Home, Barcode, Package, Receipt, Settings } from 'lucide-react';

interface BottomNavProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  pendingOrdersCount?: number;
  criticalAlertsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onNavigate,
  pendingOrdersCount = 3,
  criticalAlertsCount = 1
}) => {
  if (currentScreen === 'login') return null;

  const navItems: { id: ScreenType; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'scan', label: 'Scan', icon: <Barcode className="w-5 h-5" /> },
    { id: 'inventory', label: 'Inventory', icon: <Package className="w-5 h-5" /> },
    { id: 'orders', label: 'Orders', icon: <Receipt className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#e7e9e5] border-t border-[#c1c8c2] px-2 py-2 flex justify-around items-center shadow-lg">
      <div className="w-full max-w-lg mx-auto flex justify-between items-center px-1">
        {navItems.map((item) => {
          const isActive = 
            currentScreen === item.id || 
            (item.id === 'scan' && currentScreen === 'scan') ||
            (item.id === 'inventory' && currentScreen === 'inventory') ||
            (item.id === 'orders' && (currentScreen === 'orders' || currentScreen === 'finalization' || currentScreen === 'holding_location'));

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center transition-all duration-200 active:scale-95 py-1 px-2.5 cursor-pointer ${
                isActive
                  ? 'bg-[#a0f4c8] text-[#19724f] rounded-full font-bold px-3.5 shadow-xs'
                  : 'text-[#414844] hover:text-[#012d1d]'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.id === 'inventory' && criticalAlertsCount > 0 && !isActive && (
                  <span className="absolute -top-1 -right-2 bg-[#ba1a1a] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {criticalAlertsCount}
                  </span>
                )}
                {item.id === 'orders' && pendingOrdersCount > 0 && !isActive && (
                  <span className="absolute -top-1 -right-2 bg-[#ba1a1a] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {pendingOrdersCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium tracking-tight mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
