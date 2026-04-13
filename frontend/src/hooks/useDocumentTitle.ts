/**
 * useDocumentTitle
 *
 * Sets `document.title` for the current page and restores it on unmount.
 * Provides consistent SEO-friendly page titles across all routes.
 *
 * Usage:
 *   useDocumentTitle('Dashboard');          → "Dashboard — SkillEx"
 *   useDocumentTitle('John Doe', true);     → "John Doe"  (no suffix)
 */

import { useEffect } from 'react';

const APP_NAME = 'SkillEx';
const SEPARATOR = ' — ';

export function useDocumentTitle(title: string, absolute = false) {
  useEffect(() => {
    const previous = document.title;
    document.title = absolute ? title : `${title}${SEPARATOR}${APP_NAME}`;

    return () => {
      document.title = previous;
    };
  }, [title, absolute]);
}

/**
 * withDocumentTitle HOC (convenience wrapper for class or function components)
 * Use the hook directly unless you need backwards compatibility.
 */
export function buildTitle(page: string): string {
  return `${page}${SEPARATOR}${APP_NAME}`;
}
