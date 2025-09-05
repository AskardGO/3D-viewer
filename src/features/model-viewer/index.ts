export { ModelViewer } from './ui/ModelViewer';
export type { ModelViewerProps } from './ui/ModelViewer';

export { ModelHistoryPanel } from './ui/ModelHistoryPanel';
export type { ModelHistoryPanelProps } from './ui/ModelHistoryPanel';

export type { SupportedFileExtension, FileFormat, LoaderType } from './config/fileFormats';

export type {
  LoadingProgress,
} from './lib/modelLoader';

export type {
  ModelViewerError,
} from './lib/fileValidation';

export type { LoadingState } from './hooks/useModelViewer';

export type {
  HistoryItem,
  ModelHistoryService,
  ModelHistoryServiceOptions
} from './lib/modelHistoryService';

export type {
  UseModelHistoryReturn,
  UseModelHistoryOptions
} from './hooks/useModelHistory';

export { 
  FILE_FORMATS,
  getFileExtension,
  getSupportedExtensions,
  getAcceptedFileTypes
} from './config/fileFormats';

export { useModelViewer } from './hooks/useModelViewer';
export { useModelHistory } from './hooks/useModelHistory';
export { createModelHistoryService } from './lib/modelHistoryService';