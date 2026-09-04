import { useEffect } from 'react';
import { ViewState } from '../types';
import { Haptics } from '../services/haptics';

interface UseKeyboardShortcutsOptions {
  isDesktop: boolean;
  stealthModeEnabled?: boolean;
  stealthHotkey?: string;
  isStealthActive: boolean;
  setIsStealthActive: (active: boolean | ((prev: boolean) => boolean)) => void;
  onOpenAdd: () => void;
  onNavigate: (view: ViewState) => void;
  onToggleCommandPalette?: () => void;
}

export function useKeyboardShortcuts({
  isDesktop,
  stealthModeEnabled,
  stealthHotkey,
  isStealthActive,
  setIsStealthActive,
  onOpenAdd,
  onNavigate,
  onToggleCommandPalette
}: UseKeyboardShortcutsOptions) {
  // Desktop Navigation Hotkeys
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if ((e.metaKey || e.ctrlKey) && key === 'k') {
        e.preventDefault();
        onToggleCommandPalette?.();
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);
      if (isInput || !isDesktop) return;

      if (key === 'n') { e.preventDefault(); onOpenAdd(); }
      if (key === 'd') { e.preventDefault(); onNavigate('dashboard'); }
      if (key === 'h') { e.preventDefault(); onNavigate('history'); }
      if (key === 'a') { e.preventDefault(); onNavigate('analytics'); }
      if (key === 'l') { e.preventDefault(); onNavigate('debts'); }
    };

    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [isDesktop, onOpenAdd, onNavigate]);

  // Global Stealth & Panic Listeners (Hotkey + 4-Finger Touch)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (stealthModeEnabled && e.key === (stealthHotkey || 'Escape')) {
        setIsStealthActive(prev => !prev);
        if (!isStealthActive) Haptics.warning();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 4) {
        setIsStealthActive(prev => !prev);
        if (!isStealthActive) Haptics.warning();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [stealthModeEnabled, stealthHotkey, isStealthActive, setIsStealthActive]);
}
