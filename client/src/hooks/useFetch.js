import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

/**
 * Custom hook: loads data from the API and tracks loading / error state.
 * Re-runs when `path` changes; call reload() to fetch again. Pass null to skip.
 */
export function useFetch(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!path) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api(path, { signal: controller.signal })
      .then(setData)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort(); // cancel if the component unmounts or path changes
  }, [path, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, loading, reload, setData };
}
