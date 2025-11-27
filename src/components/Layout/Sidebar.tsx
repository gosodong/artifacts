import React from 'react';
import { 
  HomeIcon, 
  ArchiveBoxIcon, 
  FolderIcon, 
  ChartBarIcon, 
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useLocation, useNavigate } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  current: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navigation: NavItem[] = [
    { name: '대시보드', href: '/', icon: HomeIcon, current: location.pathname === '/' },
    { name: '보존카드 관리', href: '/artifacts', icon: ArchiveBoxIcon, current: location.pathname.startsWith('/artifacts') },
    { name: '사업 관리', href: '/projects', icon: FolderIcon, current: location.pathname.startsWith('/projects') },
    { name: '보고서', href: '/reports', icon: ChartBarIcon, current: location.pathname.startsWith('/reports') },
    { name: '설정', href: '/settings', icon: Cog6ToothIcon, current: location.pathname.startsWith('/settings') },
  ];

  const handleNavigation = (href: string) => {
    navigate(href);
    onClose();
  };

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden" 
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 bg-gradient-to-r from-amber-700 to-amber-800">
            <h1 className="text-xl font-bold text-white">유물 관리시스템</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  item.current
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              유물 관리시스템 v1.0
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;