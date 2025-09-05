import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ReportModal } from '@/components/ReportModal';
import { ContentType } from '@/src/services/report.service';

interface ReportContextType {
  showReport: (contentType: ContentType, contentId: number) => void;
  hideReport: () => void;
  isVisible: boolean;
  currentContentType: ContentType | null;
  currentContentId: number | null;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

interface ReportProviderProps {
  children: ReactNode;
}

export function ReportProvider({ children }: ReportProviderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentContentType, setCurrentContentType] = useState<ContentType | null>(null);
  const [currentContentId, setCurrentContentId] = useState<number | null>(null);

  const showReport = (contentType: ContentType, contentId: number) => {
    setCurrentContentType(contentType);
    setCurrentContentId(contentId);
    setIsVisible(true);
  };

  const hideReport = () => {
    setIsVisible(false);
    setCurrentContentType(null);
    setCurrentContentId(null);
  };

  const contextValue: ReportContextType = {
    showReport,
    hideReport,
    isVisible,
    currentContentType,
    currentContentId
  };

  return (
    <ReportContext.Provider value={contextValue}>
      {children}
      
      {/* Global Report Modal */}
      {currentContentType && currentContentId && (
        <ReportModal
          visible={isVisible}
          onClose={hideReport}
          contentType={currentContentType}
          contentId={currentContentId}
        />
      )}
    </ReportContext.Provider>
  );
}

export function useReportModal() {
  const context = useContext(ReportContext);
  
  if (context === undefined) {
    throw new Error('useReportModal must be used within a ReportProvider');
  }
  
  return context;
}