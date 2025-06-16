// Performance Monitoring Extension
//
// Tree-shakable named exports for performance monitoring

// Performance Core
export {
  initializePerformanceMonitor,
  getPerformanceMonitor,
  Trace,
  performance,
  ResourcePool,
  Lazy,
  BatchProcessor,
} from './performance/performance'

// Performance Types (types are tree-shaken automatically)
export type * from './performance/performance'