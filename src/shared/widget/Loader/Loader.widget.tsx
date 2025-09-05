import React from 'react';
import styles from './Loader.module.scss';

export interface LoaderProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({
  size = 'medium',
  color = '#4f46e5',
  className,
}) => {
  return (
    <div className={`${styles.loader} ${styles[size]} ${className || ''}`}>
      <div 
        className={styles.spinner}
        style={{ borderTopColor: color }}
      />
    </div>
  );
};