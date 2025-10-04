import { useAnalytics } from '@/hooks/useAnalytics';
import { createContext, useContext, ReactNode } from 'react';

interface AnalyticsContextType {
  trackMilestone: (milestone: 'signedUp' | 'createdBook' | 'startedProfile' | 'startedConversation') => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const { trackMilestone } = useAnalytics();

  return (
    <AnalyticsContext.Provider value={{ trackMilestone }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalyticsContext() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalyticsContext must be used within AnalyticsProvider');
  }
  return context;
}
