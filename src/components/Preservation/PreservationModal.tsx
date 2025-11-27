import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import ImageUpload from '../Images/ImageUpload';
import PreservationCardTemplate from './PreservationCardTemplate';
import ReactDOMServer from 'react-dom/server';
import { artifactApi } from '../../services/api';

interface PreservationLog {
  id?: string;
  action_type: string;
  description: string;
  performed_by: string;
  performed_date: string;
  before_images?: string[];
  after_images?: string[];
  status_before: string;
  status_after: string;
}

interface PreservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: PreservationLog) => void;
  artifactId: string;
  currentStatus: string;
}

const actionTypes = [
  { value: 'cleaning', label: '청소' },
  { value: 'restoration', label: '복원' },
  { value: 'documentation', label: '문서화' },
  { value: 'examination', label: '검토' },
  { value: 'storage', label: '보관' },
  { value: 'transport', label: '운송' },
  { value: 'treatment', label: '치료' },
  { value: 'analysis', label: '분석' }
];

const statusOptions = [
  { value: 'pending', label: '처리 대기' },
  { value: 'processing', label: '처리 중' },
  { value: 'completed', label: '처리 완료' }
];

const PreservationModal: React.FC<PreservationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  artifactId,
  currentStatus
}) => {
  const [formData, setFormData] = useState<PreservationLog>({
    action_type: 'cleaning',
    description: '',
    performed_by: '',
    performed_date: new Date().toISOString().split('T')[0],
    before_images: [],
    after_images: [],
    status_before: currentStatus,
    status_after: currentStatus
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white rounded-xl shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-xl font-semibold text-gray-900">
              보존 처리 기록
            </Dialog.Title>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    처리 유형 *
                  </label>
                  <select
                    name="action_type"
                    value={formData.action_type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {actionTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    처리자 *
                  </label>
                  <input
                    type="text"
                    name="performed_by"
                    value={formData.performed_by}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="처리자 이름"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    처리 일자 *
                  </label>
                  <input
                    type="date"
                    name="performed_date"
                    value={formData.performed_date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Status Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    처리 전 상태
                  </label>
                  <select
                    name="status_before"
                    value={formData.status_before}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    처리 후 상태
                  </label>
                  <select
                    name="status_after"
                    value={formData.status_after}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                처리 내용 *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="처리 내용을 상세히 입력하세요"
              />
            </div>

            {/* Images */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  처리 전 이미지
                </label>
                <ImageUpload
                  artifactId={artifactId}
                  currentImages={formData.before_images || []}
                  onImagesChange={(images) => setFormData(prev => ({ ...prev, before_images: images }))}
                  maxImages={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  처리 후 이미지
                </label>
                <ImageUpload
                  artifactId={artifactId}
                  currentImages={formData.after_images || []}
                  onImagesChange={(images) => setFormData(prev => ({ ...prev, after_images: images }))}
                  maxImages={3}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                취소
              </button>
              <button
                type="button"
                onClick={async () => {
                  const artifactSummary = {
                    id: artifactId,
                    name: formData.description ? formData.description.split('\n')[0] || '유물' : '유물',
                    number: artifactId,
                    category: '',
                    era: '',
                    processor: formData.performed_by,
                    excavation_site: ''
                  };
                  const html = ReactDOMServer.renderToStaticMarkup(
                    React.createElement(PreservationCardTemplate, { artifact: artifactSummary, log: formData })
                  );
                  try {
                    const result = await artifactApi.exportPreservationCardHTML(artifactId, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>보존처리카드</title></head><body>${html}</body></html>`, `preservation-card-${artifactId}`);
                    window.open(`${window.location.origin}${result.file_path}`, '_blank');
                  } catch {}
                }}
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-lg hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                템플릿 생성
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                기록 저장
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default PreservationModal;
