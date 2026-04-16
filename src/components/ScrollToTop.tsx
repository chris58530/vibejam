import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const SCROLL_TARGET_SELECTOR =
  '[data-scroll-root], [class*="overflow-y-auto"], [class*="overflow-auto"], [class*="overflow-scroll"]';
const RESET_TICK_MS = 50;
const RESET_TICK_LIMIT = 40;
const RESET_OBSERVER_WINDOW_MS = 2500;

function disableScrollRestoration() {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }
}

function stripHash(pathname: string, search: string) {
  if (!window.location.hash) return;
  const hash = window.location.hash;
  if (hash.includes('access_token') || hash.includes('error_description') || hash.includes('refresh_token')) return;
  window.history.replaceState(window.history.state, document.title, `${pathname}${search}`);
}

function resetAllScrollPositions() {
  const targets = new Set<HTMLElement>();

  if (document.scrollingElement instanceof HTMLElement) {
    targets.add(document.scrollingElement);
  }
  targets.add(document.documentElement);
  if (document.body) targets.add(document.body);

  document.querySelectorAll<HTMLElement>(SCROLL_TARGET_SELECTOR).forEach((el) => {
    targets.add(el);
  });

  targets.forEach((el) => {
    el.scrollTop = 0;
    el.scrollLeft = 0;
    el.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  });

  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

export default function ScrollToTop() {
  const location = useLocation();
  const handledInitialLoadRef = useRef(false);

  useLayoutEffect(() => {
    disableScrollRestoration();
    if (!handledInitialLoadRef.current) {
      handledInitialLoadRef.current = true;
      stripHash(location.pathname, location.search);
    }

    let stoppedByUser = false;
    let lastObserverReset = 0;
    const stopOnUserInput = () => {
      stoppedByUser = true;
    };
    const reset = () => {
      if (!stoppedByUser) resetAllScrollPositions();
    };
    const scheduleReset = () => {
      if (stoppedByUser) return;

      const now = window.performance.now();
      if (now - lastObserverReset < 32) return;
      lastObserverReset = now;
      window.requestAnimationFrame(reset);
    };

    reset();
    const raf = window.requestAnimationFrame(reset);
    const raf2 = window.requestAnimationFrame(() => window.requestAnimationFrame(reset));
    const t0 = window.setTimeout(reset, 0);
    const t1 = window.setTimeout(reset, 120);
    const t2 = window.setTimeout(reset, 600);
    const handlePageShow = () => reset();
    const handleLoad = () => reset();

    const mutationObserver = new MutationObserver(scheduleReset);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleReset);
    resizeObserver?.observe(document.documentElement);
    const scrollRoot = document.querySelector<HTMLElement>('[data-scroll-root]');
    if (scrollRoot) resizeObserver?.observe(scrollRoot);
    const observerTimeout = window.setTimeout(() => {
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
    }, RESET_OBSERVER_WINDOW_MS);

    void document.fonts?.ready.then(() => reset()).catch(() => undefined);

    let ticks = 0;
    const interval = window.setInterval(() => {
      if (stoppedByUser || ticks >= RESET_TICK_LIMIT) {
        window.clearInterval(interval);
        return;
      }
      ticks += 1;
      reset();
    }, RESET_TICK_MS);

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('load', handleLoad);
    window.addEventListener('wheel', stopOnUserInput, { passive: true });
    window.addEventListener('touchstart', stopOnUserInput, { passive: true });
    window.addEventListener('keydown', stopOnUserInput);

    return () => {
      window.cancelAnimationFrame(raf);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(observerTimeout);
      window.clearInterval(interval);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('load', handleLoad);
      window.removeEventListener('wheel', stopOnUserInput);
      window.removeEventListener('touchstart', stopOnUserInput);
      window.removeEventListener('keydown', stopOnUserInput);
    };
  }, [location.key, location.pathname, location.search, location.hash]);

  return null;
}