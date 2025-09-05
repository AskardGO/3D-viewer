import React, { useState } from 'react';
import { SavedModel } from '../lib/fileSystemService';
import { UseModelPersistenceReturn } from '../hooks/useModelPersistence';
import './ModelPersistencePanel.scss';

export interface ModelPersistencePanelProps {
  persistence: UseModelPersistenceReturn;
  onSaveModel: () => Promise<string | null>;
  onLoadModel: (id: string) => Promise<void>;
  hasCurrentModel: boolean;
  className?: string;
}

export const ModelPersistencePanel: React.FC<ModelPersistencePanelProps> = ({
  persistence,
  onSaveModel,
  onLoadModel,
  hasCurrentModel,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const handleSave = async () => {
    const id = await onSaveModel();
    if (id) {
      await persistence.refreshSavedModels();
    }
  };

  const handleLoad = async (id: string) => {
    await onLoadModel(id);
    setSelectedModelId(null);
  };

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm('Are you sure you want to delete this saved model?')) {
      const success = await persistence.deleteSavedModel(id);
      if (success) {
        await persistence.refreshSavedModels();
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete all saved models?')) {
      await persistence.clearAllModels();
    }
  };

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!persistence.isSupported) {
    return (
      <div className={`model-persistence-panel ${className}`}>
        <div className="persistence-unsupported">
          <h3>Persistent Storage</h3>
          <p>File System Access API is not supported in your browser.</p>
          <p>Try using Chrome, Edge, or another Chromium-based browser.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`model-persistence-panel ${className}`}>
      <div className="persistence-header">
        <h3>Saved Models</h3>
        <button
          className="toggle-button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      <div className="persistence-actions">
        <button
          className="save-button"
          onClick={handleSave}
          disabled={!hasCurrentModel || persistence.isSaving}
          title={hasCurrentModel ? 'Save current model' : 'Load a model first'}
        >
          {persistence.isSaving ? 'Saving...' : 'Save Current Model'}
        </button>

        {persistence.savedModels.length > 0 && (
          <button
            className="clear-all-button"
            onClick={handleClearAll}
            title="Delete all saved models"
          >
            Clear All
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="persistence-content">
          {persistence.savedModels.length === 0 ? (
            <div className="no-models">
              <p>No saved models yet.</p>
              <p>Load a 3D model and click "Save Current Model" to get started.</p>
            </div>
          ) : (
            <div className="saved-models-list">
              {persistence.savedModels.map((model: SavedModel) => (
                <div
                  key={model.id}
                  className={`saved-model-item ${selectedModelId === model.id ? 'selected' : ''}`}
                  onClick={() => setSelectedModelId(model.id)}
                >
                  <div className="model-info">
                    <div className="model-name" title={model.name}>
                      {model.name}
                    </div>
                    <div className="model-details">
                      <span className="model-format">{model.format.toUpperCase()}</span>
                      <span className="model-size">{formatFileSize(model.size)}</span>
                      <span className="model-date">{formatDate(model.timestamp)}</span>
                    </div>
                  </div>
                  
                  <div className="model-actions">
                    <button
                      className="load-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoad(model.id);
                      }}
                      disabled={persistence.isLoading}
                      title="Load this model"
                    >
                      {persistence.isLoading ? 'Loading...' : 'Load'}
                    </button>
                    
                    <button
                      className="delete-button"
                      onClick={(e) => handleDelete(model.id, e)}
                      title="Delete this model"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
