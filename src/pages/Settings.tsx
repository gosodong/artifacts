import React, { useState, useEffect } from 'react';
import {
  Cog6ToothIcon,
  UserIcon,
  BellIcon,
  PaintBrushIcon,
  CloudArrowUpIcon,
  TrashIcon,
  InformationCircleIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { Toaster, toast } from 'sonner';

interface SettingsSection {
  id: string;
  name: string;
  icon: React.ReactNode;
}

const Settings: React.FC = () => {
  const [activeSection, setActiveSection] = useState('general');
  
  // 설정 상태
  const [settings, setSettings] = useState({
    // 일반 설정
    systemName: '유물 관리시스템',
    organization: '',
    defaultProject: '',
    
    // 알림 설정
    emailNotifications: true,
    browserNotifications: false,
    notifyOnNewArtifact: true,
    notifyOnStatusChange: true,
    
    // 표시 설정
    itemsPerPage: 20,
    defaultView: 'grid',
    showThumbnails: true,
    darkMode: false,
    
    // 백업 설정
    autoBackup: false,
    backupFrequency: 'daily',
    keepBackups: 7,
  });

  useEffect(() => {
    const raw = localStorage.getItem('appSettings');
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        setSettings(prev => ({ ...prev, ...saved }));
      } catch {
        // ignore parse error
      }
    }
  }, []);

  useEffect(() => {
    const theme = settings.darkMode ? 'dark' : 'light';
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [settings.darkMode]);

  const sections: SettingsSection[] = [
    { id: 'general', name: '일반', icon: <Cog6ToothIcon className="h-5 w-5" /> },
    { id: 'notifications', name: '알림', icon: <BellIcon className="h-5 w-5" /> },
    { id: 'display', name: '표시', icon: <PaintBrushIcon className="h-5 w-5" /> },
    { id: 'backup', name: '백업', icon: <CloudArrowUpIcon className="h-5 w-5" /> },
    { id: 'account', name: '계정', icon: <UserIcon className="h-5 w-5" /> },
    { id: 'about', name: '정보', icon: <InformationCircleIcon className="h-5 w-5" /> },
  ];

  const handleSave = () => {
    // 로컬 스토리지에 설정 저장
    localStorage.setItem('appSettings', JSON.stringify(settings));
    toast.success('설정이 저장되었습니다.');
  };

  const handleReset = () => {
    if (window.confirm('모든 설정을 초기화하시겠습니까?')) {
      localStorage.removeItem('appSettings');
      toast.success('설정이 초기화되었습니다.');
      window.location.reload();
    }
  };

  // 토글 스위치 컴포넌트
  const Toggle: React.FC<{
    enabled: boolean;
    onChange: (value: boolean) => void;
    label: string;
    description?: string;
  }> = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-amber-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">설정</h1>
          <p className="text-gray-600 mt-1">시스템 환경설정을 관리합니다</p>
        </div>

        <div className="flex gap-8">
          {/* 사이드 메뉴 */}
          <div className="w-56 flex-shrink-0">
            <nav className="space-y-1">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-amber-100 text-amber-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {section.icon}
                  {section.name}
                </button>
              ))}
            </nav>
          </div>

          {/* 설정 내용 */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              
              {/* 일반 설정 */}
              {activeSection === 'general' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 pb-4 border-b border-gray-200">
                    일반 설정
                  </h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      시스템 이름
                    </label>
                    <input
                      type="text"
                      value={settings.systemName}
                      onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      기관명
                    </label>
                    <input
                      type="text"
                      value={settings.organization}
                      onChange={(e) => setSettings({ ...settings, organization: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                      placeholder="기관명을 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      기본 사업
                    </label>
                    <input
                      type="text"
                      value={settings.defaultProject}
                      onChange={(e) => setSettings({ ...settings, defaultProject: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                      placeholder="새 보존카드 등록 시 기본 사업명"
                    />
                  </div>
                </div>
              )}

              {/* 알림 설정 */}
              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 pb-4 border-b border-gray-200">
                    알림 설정
                  </h2>
                  
                  <Toggle
                    enabled={settings.emailNotifications}
                    onChange={(v) => setSettings({ ...settings, emailNotifications: v })}
                    label="이메일 알림"
                    description="중요한 변경사항을 이메일로 받습니다"
                  />
                  
                  <Toggle
                    enabled={settings.browserNotifications}
                    onChange={(v) => setSettings({ ...settings, browserNotifications: v })}
                    label="브라우저 알림"
                    description="브라우저 푸시 알림을 받습니다"
                  />

                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-700 mb-3">알림 받을 이벤트</p>
                    <Toggle
                      enabled={settings.notifyOnNewArtifact}
                      onChange={(v) => setSettings({ ...settings, notifyOnNewArtifact: v })}
                      label="새 보존카드 등록"
                    />
                    <Toggle
                      enabled={settings.notifyOnStatusChange}
                      onChange={(v) => setSettings({ ...settings, notifyOnStatusChange: v })}
                      label="보존 상태 변경"
                    />
                  </div>
                </div>
              )}

              {/* 표시 설정 */}
              {activeSection === 'display' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 pb-4 border-b border-gray-200">
                    표시 설정
                  </h2>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      페이지당 항목 수
                    </label>
                    <select
                      value={settings.itemsPerPage}
                      onChange={(e) => setSettings({ ...settings, itemsPerPage: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value={10}>10개</option>
                      <option value={20}>20개</option>
                      <option value={50}>50개</option>
                      <option value={100}>100개</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      기본 보기 방식
                    </label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSettings({ ...settings, defaultView: 'grid' })}
                        className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                          settings.defaultView === 'grid'
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        그리드
                      </button>
                      <button
                        onClick={() => setSettings({ ...settings, defaultView: 'list' })}
                        className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                          settings.defaultView === 'list'
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        리스트
                      </button>
                    </div>
                  </div>

                  <Toggle
                    enabled={settings.showThumbnails}
                    onChange={(v) => setSettings({ ...settings, showThumbnails: v })}
                    label="썸네일 표시"
                    description="목록에서 이미지 미리보기를 표시합니다"
                  />

                  <Toggle
                    enabled={settings.darkMode}
                    onChange={(v) => setSettings({ ...settings, darkMode: v })}
                    label="다크 모드"
                    description="어두운 테마를 사용합니다"
                  />
                </div>
              )}

              {/* 백업 설정 */}
              {activeSection === 'backup' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 pb-4 border-b border-gray-200">
                    백업 설정
                  </h2>

                  <Toggle
                    enabled={settings.autoBackup}
                    onChange={(v) => setSettings({ ...settings, autoBackup: v })}
                    label="자동 백업"
                    description="데이터를 자동으로 백업합니다"
                  />

                  {settings.autoBackup && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          백업 주기
                        </label>
                        <select
                          value={settings.backupFrequency}
                          onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                        >
                          <option value="daily">매일</option>
                          <option value="weekly">매주</option>
                          <option value="monthly">매월</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          백업 보관 기간
                        </label>
                        <select
                          value={settings.keepBackups}
                          onChange={(e) => setSettings({ ...settings, keepBackups: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                        >
                          <option value={7}>7일</option>
                          <option value={14}>14일</option>
                          <option value={30}>30일</option>
                          <option value={90}>90일</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div className="pt-4 border-t border-gray-100">
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <CloudArrowUpIcon className="h-4 w-4" />
                      지금 백업하기
                    </button>
                  </div>
                </div>
              )}

              {/* 계정 설정 */}
              {activeSection === 'account' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 pb-4 border-b border-gray-200">
                    계정 설정
                  </h2>

                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                      <UserIcon className="h-8 w-8 text-amber-700" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">관리자</p>
                      <p className="text-sm text-gray-500">admin@example.com</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이름
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                      placeholder="이름을 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이메일
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                      placeholder="이메일을 입력하세요"
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <button className="text-sm text-blue-600 hover:text-blue-800">
                      비밀번호 변경
                    </button>
                  </div>
                </div>
              )}

              {/* 정보 */}
              {activeSection === 'about' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 pb-4 border-b border-gray-200">
                    시스템 정보
                  </h2>

                  <div className="space-y-4">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">시스템 이름</span>
                      <span className="font-medium text-gray-900">유물 관리시스템</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">버전</span>
                      <span className="font-medium text-gray-900">1.0.0</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">빌드 날짜</span>
                      <span className="font-medium text-gray-900">2024-11-27</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">개발</span>
                      <span className="font-medium text-gray-900">Kiro AI</span>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-800">
                      이 시스템은 문화재 보존처리 업무를 위한 유물 관리 시스템입니다.
                      보존카드 관리, 이미지 어노테이션, 노트 작성 등의 기능을 제공합니다.
                    </p>
                  </div>
                </div>
              )}

              {/* 저장 버튼 */}
              {activeSection !== 'about' && (
                <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <TrashIcon className="h-4 w-4" />
                    초기화
                  </button>
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800"
                  >
                    <CheckIcon className="h-4 w-4" />
                    저장
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
