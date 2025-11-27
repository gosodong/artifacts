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
          {/* Logo - Modern Glassmorphism Design */}
          <div className="relative overflow-hidden">
            {/* 다이나믹 배경 그라데이션 */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-amber-900 to-slate-800" />
            
            {/* 애니메이션 오브 효과 */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl animate-pulse" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-orange-400/15 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
            
            {/* 미세한 노이즈 텍스처 */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }} />
            
            <div className="relative px-5 py-5">
              {/* 메인 로고 컨테이너 */}
              <div className="flex items-center gap-4">
                {/* 아이콘 - 글래스모피즘 스타일 */}
                <div className="relative group">
                  {/* 외부 글로우 링 */}
                  <div className="absolute -inset-1 bg-gradient-to-br from-amber-400/40 to-orange-500/40 rounded-2xl blur-lg opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* 메인 아이콘 박스 */}
                  <div className="relative w-12 h-12 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl">
                    {/* 내부 하이라이트 */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 via-transparent to-transparent" />
                    
                    {/* 아이콘 */}
                    <svg className="w-6 h-6 text-amber-300 relative z-10 drop-shadow-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                    </svg>
                  </div>
                </div>
                
                {/* 텍스트 영역 */}
                <div className="flex flex-col">
                  {/* 기관명 - 첫 번째 줄 */}
                  <div className="flex items-center gap-1.5">
                    <div className="h-px w-3 bg-gradient-to-r from-amber-400/80 to-transparent" />
                    <span className="text-[11px] font-semibold text-amber-300/90 tracking-wider">
                      국립중앙박물관
                    </span>
                  </div>
                  
                  {/* 시스템명 - 두 번째 줄 */}
                  <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-50 to-amber-100 tracking-tight leading-tight mt-0.5">
                    유물관리시스템
                  </h1>
                  
                  {/* 영문 서브 텍스트 */}
                  <span className="text-[9px] text-slate-400/80 font-medium mt-1 tracking-wide uppercase">
                    Heritage Management System
                  </span>
                </div>
              </div>
              
              {/* 하단 장식 - 모던 디바이더 */}
              <div className="mt-5 flex items-center gap-3">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-amber-500/40" />
                  <div className="w-2 h-2 rounded-full bg-gradient-to-br from-amber-400/60 to-orange-500/60 shadow-lg shadow-amber-500/20" />
                  <div className="w-1 h-1 rounded-full bg-amber-500/40" />
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
              </div>
            </div>
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
              국립중앙박물관 유물관리시스템 v1.0
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;