// Environment-specific configuration and feature flags

export interface EnvironmentConfig {
  features: {
    voiceConversations: boolean;
    selfConversations: boolean;
    textConversations: boolean;
    conversationHistory: boolean;
    contextCaching: boolean;
    realTimeUpdates: boolean;
    advancedAnalytics: boolean;
  };
  performance: {
    conversationHistoryLimit: number;
    contextCacheTimeout: number;
    debounceDelay: number;
    virtualScrollThreshold: number;
    maxConcurrentConversations: number;
  };
  ui: {
    animationsEnabled: boolean;
    darkModeDefault: boolean;
    compactMode: boolean;
    showDebugInfo: boolean;
  };
  api: {
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
}

const developmentConfig: EnvironmentConfig = {
  features: {
    voiceConversations: true,
    selfConversations: false,
    textConversations: true,
    conversationHistory: true,
    contextCaching: true,
    realTimeUpdates: true,
    advancedAnalytics: true,
  },
  performance: {
    conversationHistoryLimit: 100,
    contextCacheTimeout: 30 * 60 * 1000, // 30 minutes
    debounceDelay: 300,
    virtualScrollThreshold: 20,
    maxConcurrentConversations: 5,
  },
  ui: {
    animationsEnabled: true,
    darkModeDefault: false,
    compactMode: false,
    showDebugInfo: true,
  },
  api: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000,
  },
};

const productionConfig: EnvironmentConfig = {
  features: {
    voiceConversations: true,
    selfConversations: false,
    textConversations: true,
    conversationHistory: true,
    contextCaching: true,
    realTimeUpdates: false, // Disabled in production for performance
    advancedAnalytics: false,
  },
  performance: {
    conversationHistoryLimit: 50,
    contextCacheTimeout: 15 * 60 * 1000, // 15 minutes
    debounceDelay: 500,
    virtualScrollThreshold: 10,
    maxConcurrentConversations: 3,
  },
  ui: {
    animationsEnabled: true,
    darkModeDefault: false,
    compactMode: false,
    showDebugInfo: false,
  },
  api: {
    timeout: 15000, // 15 seconds
    retryAttempts: 2,
    retryDelay: 2000,
  },
};

const testConfig: EnvironmentConfig = {
  features: {
    voiceConversations: false, // Disabled for testing
    selfConversations: false,
    textConversations: true,
    conversationHistory: true,
    contextCaching: false, // Disabled for predictable tests
    realTimeUpdates: false,
    advancedAnalytics: false,
  },
  performance: {
    conversationHistoryLimit: 10,
    contextCacheTimeout: 5 * 60 * 1000, // 5 minutes
    debounceDelay: 100,
    virtualScrollThreshold: 5,
    maxConcurrentConversations: 1,
  },
  ui: {
    animationsEnabled: false,
    darkModeDefault: false,
    compactMode: true,
    showDebugInfo: true,
  },
  api: {
    timeout: 5000, // 5 seconds
    retryAttempts: 1,
    retryDelay: 500,
  },
};

function getEnvironment(): 'development' | 'production' | 'test' {
  if (typeof window === 'undefined') {
    return 'production';
  }

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'development';
  }

  if (window.location.hostname.includes('test') || window.location.hostname.includes('staging')) {
    return 'test';
  }

  return 'production';
}

export const environment = getEnvironment();

export const config: EnvironmentConfig = (() => {
  switch (environment) {
    case 'development':
      return developmentConfig;
    case 'test':
      return testConfig;
    case 'production':
    default:
      return productionConfig;
  }
})();

// Feature flag helpers
export const isFeatureEnabled = (feature: keyof EnvironmentConfig['features']): boolean => {
  return config.features[feature];
};

// Performance helpers
export const getPerformanceSetting = (setting: keyof EnvironmentConfig['performance']) => {
  return config.performance[setting];
};

// UI helpers
export const getUISetting = (setting: keyof EnvironmentConfig['ui']) => {
  return config.ui[setting];
};

// API helpers
export const getAPISetting = (setting: keyof EnvironmentConfig['api']) => {
  return config.api[setting];
};

// Validation
export const validateConfig = (): boolean => {
  try {
    // Basic validation checks
    if (config.performance.conversationHistoryLimit <= 0) {
      console.warn('Invalid conversationHistoryLimit');
      return false;
    }

    if (config.performance.contextCacheTimeout <= 0) {
      console.warn('Invalid contextCacheTimeout');
      return false;
    }

    if (config.api.timeout <= 0) {
      console.warn('Invalid API timeout');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Config validation failed:', error);
    return false;
  }
};

// Initialize and validate config on startup
if (!validateConfig()) {
  console.error('Configuration validation failed. Using safe defaults.');
}