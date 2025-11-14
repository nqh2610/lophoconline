/**
 * Hook for auto-saving form data to localStorage
 * Prevents data loss when user closes browser or refreshes page
 * 
 * Features:
 * - Auto-save on form value changes (debounced)
 * - Manual save capability
 * - Load saved data on mount
 * - Clear saved data on successful submit
 * - Support for file metadata (files are not saved, only metadata)
 */

import { useEffect, useRef, useCallback } from 'react';
import { UseFormReturn, FieldValues } from 'react-hook-form';

export interface AutoSaveOptions<T extends FieldValues> {
  /**
   * Unique key for localStorage
   */
  key: string;

  /**
   * Form instance from react-hook-form
   */
  form: UseFormReturn<T>;

  /**
   * Auto-save delay in milliseconds (default: 2000ms)
   */
  delay?: number;

  /**
   * Enable/disable auto-save (default: true)
   */
  enabled?: boolean;

  /**
   * Callback when data is saved
   */
  onSave?: (data: T) => void;

  /**
   * Callback when data is loaded
   */
  onLoad?: (data: T) => void;

  /**
   * Fields to exclude from auto-save (e.g., password fields)
   */
  excludeFields?: (keyof T)[];
}

export interface SavedFormData<T> {
  data: T;
  timestamp: number;
  version: string; // For handling schema changes
}

const CURRENT_VERSION = '1.0.0';

export function useFormAutoSave<T extends FieldValues = FieldValues>({
  key,
  form,
  delay = 2000,
  enabled = true,
  onSave,
  onLoad,
  excludeFields = [],
}: AutoSaveOptions<T>) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>('');
  const hasLoadedRef = useRef(false);

  /**
   * Get storage key with prefix
   */
  const getStorageKey = useCallback(() => {
    return `form-autosave-${key}`;
  }, [key]);

  /**
   * Filter out excluded fields
   */
  const filterData = useCallback((data: T): Partial<T> => {
    if (excludeFields.length === 0) return data;
    
    const filtered = { ...data };
    excludeFields.forEach(field => {
      delete filtered[field];
    });
    return filtered;
  }, [excludeFields]);

  /**
   * Save form data to localStorage
   */
  const save = useCallback((data: T) => {
    if (!enabled) return;

    try {
      const filteredData = filterData(data);
      const dataStr = JSON.stringify(filteredData);
      
      // Only save if data has changed
      if (dataStr === lastSavedRef.current) {
        return;
      }

      const savedData: SavedFormData<Partial<T>> = {
        data: filteredData,
        timestamp: Date.now(),
        version: CURRENT_VERSION,
      };

      localStorage.setItem(getStorageKey(), JSON.stringify(savedData));
      lastSavedRef.current = dataStr;
      
      // Silent save - no console logs or callbacks
      onSave?.(data);
    } catch (error) {
      console.error('[AutoSave] Error saving form data:', error);
      // If localStorage is full, try to clear old auto-save data
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        clearOldAutoSaveData();
      }
    }
  }, [enabled, filterData, getStorageKey, onSave]);

  /**
   * Load saved form data from localStorage
   */
  const load = useCallback((): Partial<T> | null => {
    if (!enabled) return null;

    try {
      const stored = localStorage.getItem(getStorageKey());
      if (!stored) return null;

      const savedData: SavedFormData<Partial<T>> = JSON.parse(stored);
      
      // Check version compatibility (can add migration logic here)
      if (savedData.version !== CURRENT_VERSION) {
        // Silent version mismatch - still load the data
      }

      // Silent load - no console logs or callbacks
      onLoad?.(savedData.data as T);
      
      return savedData.data;
    } catch (error) {
      console.error('[AutoSave] Error loading form data:', error);
      return null;
    }
  }, [enabled, getStorageKey, onLoad]);

  /**
   * Clear saved form data
   */
  const clear = useCallback(() => {
    try {
      localStorage.removeItem(getStorageKey());
      lastSavedRef.current = '';
      // Silent clear - no console logs
    } catch (error) {
      console.error('[AutoSave] Error clearing form data:', error);
    }
  }, [getStorageKey]);

  /**
   * Clear old auto-save data from all forms (to free up space)
   */
  const clearOldAutoSaveData = useCallback(() => {
    try {
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('form-autosave-')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.timestamp && now - data.timestamp > maxAge) {
              localStorage.removeItem(key);
              // Silent cleanup
            }
          } catch (e) {
            // Invalid data, remove it
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error('[AutoSave] Error clearing old data:', error);
    }
  }, []);

  /**
   * Get saved timestamp
   */
  const getSavedTimestamp = useCallback((): number | null => {
    try {
      const stored = localStorage.getItem(getStorageKey());
      if (!stored) return null;
      
      const savedData: SavedFormData<Partial<T>> = JSON.parse(stored);
      return savedData.timestamp;
    } catch (error) {
      return null;
    }
  }, [getStorageKey]);

  /**
   * Check if there's saved data
   */
  const hasSavedData = useCallback((): boolean => {
    try {
      const stored = localStorage.getItem(getStorageKey());
      return !!stored;
    } catch (error) {
      return false;
    }
  }, [getStorageKey]);

  // Load saved data on mount (only once)
  useEffect(() => {
    if (!hasLoadedRef.current && enabled) {
      const savedData = load();
      if (savedData) {
        // Merge saved data with current form values
        const currentValues = form.getValues();
        form.reset({ ...currentValues, ...savedData } as T);
      }
      hasLoadedRef.current = true;
    }
  }, [enabled, form, load]);

  // Auto-save on form value changes (debounced)
  useEffect(() => {
    if (!enabled || !hasLoadedRef.current) return;

    const subscription = form.watch((value) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        save(value as T);
      }, delay);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, form, save, delay]);

  return {
    save: () => save(form.getValues()),
    load,
    clear,
    hasSavedData,
    getSavedTimestamp,
    clearOldAutoSaveData,
  };
}
