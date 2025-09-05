import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CommentsSheet } from '@/components/comments/CommentsSheet';

interface CommentsContextType {
  showComments: (postId: number) => void;
  hideComments: () => void;
  isVisible: boolean;
  currentPostId: number | null;
}

const CommentsContext = createContext<CommentsContextType | undefined>(undefined);

interface CommentsProviderProps {
  children: ReactNode;
}

export function CommentsProvider({ children }: CommentsProviderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentPostId, setCurrentPostId] = useState<number | null>(null);

  const showComments = (postId: number) => {
    setCurrentPostId(postId);
    setIsVisible(true);
  };

  const hideComments = () => {
    setIsVisible(false);
    setCurrentPostId(null);
  };

  const contextValue: CommentsContextType = {
    showComments,
    hideComments,
    isVisible,
    currentPostId
  };

  return (
    <CommentsContext.Provider value={contextValue}>
      {children}
      
      {/* Global Comments Modal */}
      {currentPostId && (
        <CommentsSheet
          isVisible={isVisible}
          onClose={hideComments}
          postId={currentPostId}
        />
      )}
    </CommentsContext.Provider>
  );
}

export function useCommentsModal() {
  const context = useContext(CommentsContext);
  
  if (context === undefined) {
    throw new Error('useCommentsModal must be used within a CommentsProvider');
  }
  
  return context;
}