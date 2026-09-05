import { ViewState } from '../../types';

export interface RouteState {
  view: ViewState;
  subTab?: string;
  sectionId?: string;
  rawPath: string;
}

// Maps paths to ViewState and subTabs
const pathToRouteMap: Record<string, { view: ViewState; subTab?: string }> = {
  '/': { view: 'dashboard' },
  '/rabbai': { view: 'rabbai' },
  '/dashboard': { view: 'dashboard' },
  '/transactions': { view: 'history' },
  '/history': { view: 'history' },
  '/analytics': { view: 'analytics' },
  '/debts': { view: 'debts' },
  '/budgets': { view: 'control' },
  '/control': { view: 'control' },
  '/upcoming': { view: 'provisions' },
  '/provisions': { view: 'provisions' },
  '/subscriptions': { view: 'subscriptions' },
  '/settings': { view: 'identity', subTab: 'general' },
  '/settings/general': { view: 'identity', subTab: 'general' },
  '/settings/wallets': { view: 'identity', subTab: 'wallets' },
  '/settings/security': { view: 'identity', subTab: 'data_security' },
  '/settings/privacy': { view: 'identity', subTab: 'privacy' },
  '/profile': { view: 'identity', subTab: 'general' },
};

// Maps ViewState and subTab to canonical path
export function getRoutePath(view: ViewState, subTab?: string): string {
  switch (view) {
    case 'rabbai':
      return '/rabbai';
    case 'dashboard':
      return '/';
    case 'history':
      return '/transactions';
    case 'analytics':
      return '/analytics';
    case 'debts':
      return '/debts';
    case 'control':
      return '/budgets';
    case 'provisions':
      return '/upcoming';
    case 'subscriptions':
      return '/subscriptions';
    case 'identity':
      if (subTab === 'wallets') return '/settings/wallets';
      if (subTab === 'data_security' || subTab === 'security') return '/settings/security';
      if (subTab === 'privacy') return '/settings/privacy';
      return '/settings/general';
    default:
      return '/';
  }
}

// Determines if hash-based routing is needed (e.g. file:// protocol or Capacitor)
function isHashRouting(): boolean {
  return typeof window !== 'undefined' && (
    window.location.protocol === 'file:' || 
    window.location.origin === 'null' ||
    window.location.hash.startsWith('#/')
  );
}

export function parseCurrentRoute(): RouteState {
  if (typeof window === 'undefined') {
    return { view: 'dashboard', rawPath: '/' };
  }

  let fullPath = window.location.pathname;
  let hash = window.location.hash;

  if (isHashRouting() && hash.startsWith('#/')) {
    fullPath = hash.slice(1);
    hash = '';
  } else if (hash.startsWith('#') && hash.length > 1 && !hash.startsWith('#/')) {
    // Check if legacy hash like #security or #identity was used
    const cleanHash = hash.slice(1);
    if (cleanHash === 'security') {
      return { view: 'identity', subTab: 'data_security', rawPath: '/settings/security' };
    }
    if (cleanHash === 'history') {
      return { view: 'history', rawPath: '/transactions' };
    }
    if (cleanHash in pathToRouteMap) {
      return { ...pathToRouteMap[cleanHash], rawPath: `/${cleanHash}` };
    }
    if (`/${cleanHash}` in pathToRouteMap) {
      return { ...pathToRouteMap[`/${cleanHash}`], rawPath: `/${cleanHash}` };
    }
  }

  // Normalize path
  const normalized = fullPath.toLowerCase().replace(/\/$/, '') || '/';
  
  if (normalized in pathToRouteMap) {
    return {
      ...pathToRouteMap[normalized],
      rawPath: normalized,
      sectionId: hash ? hash.slice(1) : undefined
    };
  }

  // Check prefix match for /settings or /analytics
  if (normalized.startsWith('/settings')) {
    if (normalized.includes('security')) {
      return { view: 'identity', subTab: 'data_security', rawPath: '/settings/security' };
    }
    if (normalized.includes('wallet')) {
      return { view: 'identity', subTab: 'wallets', rawPath: '/settings/wallets' };
    }
    return { view: 'identity', subTab: 'general', rawPath: '/settings/general' };
  }

  if (normalized.startsWith('/analytics')) {
    return { view: 'analytics', rawPath: '/analytics' };
  }

  return { view: 'dashboard', rawPath: '/' };
}

type RouteListener = (route: RouteState) => void;
const listeners = new Set<RouteListener>();

if (typeof window !== 'undefined') {
  const notifyListeners = () => {
    const route = parseCurrentRoute();
    listeners.forEach(fn => fn(route));
  };

  window.addEventListener('popstate', notifyListeners);
  window.addEventListener('hashchange', notifyListeners);
}

export function subscribeToRoutes(listener: RouteListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function navigateTo(view: ViewState, subTab?: string, options?: { replace?: boolean; sectionId?: string }) {
  if (typeof window === 'undefined') return;

  const targetPath = getRoutePath(view, subTab);
  const hashSuffix = options?.sectionId ? `#${options.sectionId}` : '';

  if (isHashRouting()) {
    const targetHash = `#${targetPath}${hashSuffix}`;
    if (window.location.hash !== targetHash) {
      if (options?.replace) {
        window.history.replaceState(null, '', targetHash);
      } else {
        window.location.hash = targetHash;
      }
    }
  } else {
    const fullUrl = `${targetPath}${hashSuffix}`;
    if (window.location.pathname !== targetPath || (options?.sectionId && window.location.hash !== `#${options.sectionId}`)) {
      if (options?.replace) {
        window.history.replaceState(null, '', fullUrl);
      } else {
        window.history.pushState(null, '', fullUrl);
      }
    }
  }

  const routeState: RouteState = {
    view,
    subTab,
    sectionId: options?.sectionId,
    rawPath: targetPath
  };

  listeners.forEach(fn => fn(routeState));
}
