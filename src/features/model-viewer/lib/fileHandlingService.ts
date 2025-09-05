import React from 'react';
import { type FileFormat, getFileExtension, FILE_FORMATS } from '../config/fileFormats';
import { type ModelViewerError } from './fileValidation';
import { type LoadingProgress } from './modelLoader';

export interface FileHandlingOptions {
  maxFileSize: number;
  onProgress?: (progress: LoadingProgress) => void;
  onError?: (error: ModelViewerError) => void;
}

export class FileHandlingService {
  private readonly maxFileSize: number;
  private readonly onProgress?: (progress: LoadingProgress) => void;
  private readonly onError?: (error: ModelViewerError) => void;

  constructor(options: FileHandlingOptions) {
    this.maxFileSize = options.maxFileSize;
    this.onProgress = options.onProgress;
    this.onError = options.onError;
  }

  validateFile = (file: File): ModelViewerError | null => {
    if (file.size > this.maxFileSize) {
      return {
        message: 'File too large',
        code: 'FILE_TOO_LARGE',
      };
    }

    const extension = getFileExtension(file.name);
    if (!extension) {
      return {
        message: 'Unsupported file format',
        code: 'UNSUPPORTED_FORMAT',
      };
    }

    return null;
  };

  handleProgress = (progressEvent: ProgressEvent): void => {
    const progress: LoadingProgress = {
      loaded: progressEvent.loaded,
      total: progressEvent.total,
      percentage: progressEvent.total > 0 ? (progressEvent.loaded / progressEvent.total) * 100 : 0,
    };
    this.onProgress?.(progress);
  };

  readFile = (file: File): Promise<{ data: string | ArrayBuffer; format: FileFormat }> => {
    return new Promise((resolve, reject) => {
      const validationError = this.validateFile(file);
      if (validationError) {
        this.onError?.(validationError);
        reject(validationError);
        return;
      }

      const extension = getFileExtension(file.name)!;
      const format = FILE_FORMATS[extension];

      const reader = new FileReader();

      reader.onprogress = this.handleProgress;

      reader.onload = (e) => {
        const data = e.target?.result;
        if (!data) {
          const error: ModelViewerError = {
            message: 'File reading error',
            code: 'LOAD_ERROR',
          };
          this.onError?.(error);
          reject(error);
          return;
        }

        resolve({ data, format });
      };

      reader.onerror = () => {
        const error: ModelViewerError = {
          message: 'File reading error',
          code: 'LOAD_ERROR',
        };
        this.onError?.(error);
        reject(error);
      };

      if (format.readAs === 'arrayBuffer') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  handleFileDrop = (e: React.DragEvent<HTMLDivElement>): File | null => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    return files.length > 0 ? files[0] : null;
  };

  handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): File | null => {
    const files = e.target.files;
    return files && files.length > 0 ? files[0] : null;
  };
}

export const createFileHandlingService = (options: FileHandlingOptions): FileHandlingService => {
  return new FileHandlingService(options);
};
