import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | Nabta` : 'Nabta | Plant Store';
  }, [title]);
}
