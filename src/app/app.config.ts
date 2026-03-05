import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  ViewTransitionInfo,
  withViewTransitions,
} from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

const AUTH_ROUTE_PATHS = new Set(['login', 'register']);

const getDeepestPath = (snapshot: ActivatedRouteSnapshot | null): string => {
  let current: ActivatedRouteSnapshot | null = snapshot;
  while (current?.firstChild) current = current.firstChild;
  return current?.routeConfig?.path ?? '';
};

const getAuthTransitionDirection = (fromPath: string, toPath: string): 'forward' | 'backward' | null => {
  if (fromPath === 'login' && toPath === 'register') return 'forward';
  if (fromPath === 'register' && toPath === 'login') return 'backward';
  return null;
};

const handleViewTransition = (info: ViewTransitionInfo) => {
  const fromPath = getDeepestPath(info.from);
  const toPath = getDeepestPath(info.to);
  const isAuthToAuth = AUTH_ROUTE_PATHS.has(fromPath) && AUTH_ROUTE_PATHS.has(toPath);

  if (!isAuthToAuth) {
    info.transition.skipTransition();
    return;
  }

  if (typeof document === 'undefined') return;
  const direction = getAuthTransitionDirection(fromPath, toPath);
  if (!direction) return;

  const root = document.documentElement;
  root.dataset['authTransition'] = direction;
  void info.transition.finished.finally(() => {
    if (root.dataset['authTransition'] === direction) {
      delete root.dataset['authTransition'];
    }
  });
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: handleViewTransition,
      })
    ),
    provideHttpClient(
      withInterceptors([authInterceptor])
    )
  ]
};
