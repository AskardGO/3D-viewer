import React, { useState } from 'react';
import { HistoryItem } from '../lib/modelHistoryService';
import { UseModelHistoryReturn } from '../hooks/useModelHistory';
import './ModelHistoryPanel.scss';

export interface ModelHistoryPanelProps {
  history: UseModelHistoryReturn;
  onLoadModel: (id: string) => Promise<void>;
  className?: string;
}

export const ModelHistoryPanel: React.FC<ModelHistoryPanelProps> = ({
  history,
  onLoadModel,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const handleLoad = async (id: string) => {
    await onLoadModel(id);
    setSelectedItemId(null);
  };

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm('Are you sure you want to delete this model from history?')) {
      const success = await history.deleteFromHistory(id);
      if (success) {
        await history.refreshHistory();
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all history?')) {
      await history.clearHistory();
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

  if (!history.isSupported) {
    return (
      <div className={`model-history-panel ${className}`}>
        <div className="history-unsupported">
          <h3>Model History</h3>
          <p>History storage is not supported in your browser.</p>
          <p>Models will only be available during the current session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`model-history-panel ${className}`}>
      <div className="history-header">
        <h3>Model History</h3>
        <div className="header-actions">
          {history.history.length > 0 && (
            <span className="history-count">{history.history.length}</span>
          )}
          <button
            className="toggle-button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="history-content">
          {history.history.length === 0 ? (
            <div className="no-history">
              <p>No models in history yet.</p>
              <p>Load a 3D model to start building your history.</p>
            </div>
          ) : (
            <>
              <div className="history-actions">
                <button
                  className="clear-all-button"
                  onClick={handleClearAll}
                  title="Clear all history"
                >
                  Clear All
                </button>
              </div>

              <div className="history-list">
                {history.history.map((item: HistoryItem) => (
                  <div
                    key={item.id}
                    className={`history-item ${selectedItemId === item.id ? 'selected' : ''}`}
                    onClick={() => handleLoad(item.id)}
                  >
                    <div className="item-thumbnail">
                      {item.thumbnail ? (
                        <img 
                          src={item.thumbnail} 
                          alt={item.name}
                          className="thumbnail-image"
                        />
                      ) : (
                        <div className="thumbnail-placeholder">
                          <span className="file-icon">📦</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="item-info">
                      <div className="item-name" title={item.name}>
                        {item.name}
                      </div>
                      <div className="item-details">
                        <span className="item-format">{item.format.toUpperCase()}</span>
                        <span className="item-size">{formatFileSize(item.size)}</span>
                        <span className="item-date">{formatDate(item.timestamp)}</span>
                      </div>
                    </div>
                    
                    <div className="item-actions">
                      <button
                        className="load-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoad(item.id);
                        }}
                        disabled={history.isLoading}
                        title="Load this model"
                      >
                        {history.isLoading ? '⏳' : '▶'}
                      </button>
                      
                      <button
                        className="delete-button"
                        onClick={(e) => handleDelete(item.id, e)}
                        title="Delete from history"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
