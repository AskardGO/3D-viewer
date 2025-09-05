import { getFileExtension, FILE_FORMATS } from '../config/fileFormats';

export interface ModelViewerError {
  message: string;
  code: 'UNSUPPORTED_FORMAT' | 'LOAD_ERROR' | 'PARSE_ERROR' | 'FILE_TOO_LARGE' | 'PERSISTENCE_ERROR';
  details?: string;
}

export interface FileValidationOptions {
  maxFileSize: number;
}

export class FileValidationService {
  private readonly maxFileSize: number;

  constructor(options: FileValidationOptions) {
    this.maxFileSize = options.maxFileSize;
  }

  validateFile = (file: File): ModelViewerError | null => {
    if (file.size > this.maxFileSize) {
      return {
        message: `File too large. Maximum size is ${this.formatFileSize(this.maxFileSize)}`,
        code: 'FILE_TOO_LARGE',
        details: `File size: ${this.formatFileSize(file.size)}`
      };
    }

    const extension = getFileExtension(file.name);
    if (!extension) {
      return {
        message: 'Unsupported file format',
        code: 'UNSUPPORTED_FORMAT',
        details: `Supported formats: ${Object.keys(FILE_FORMATS).join(', ')}`
      };
    }

    return null;
  };

  private formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };
}

export const createFileValidationService = (options: FileValidationOptions): FileValidationService => {
  return new FileValidationService(options);
};
