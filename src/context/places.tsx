import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import type { PlaceStats } from '@/lib/places';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/validation';

type PlacesValue = {
  places: PlaceStats[];
  /** True only before the first successful load. */
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  reload: () => PromiseLike<void>;
  refresh: () => PromiseLike<void>;
  byId: (id: string) => PlaceStats | undefined;
};

const PlacesContext = createContext<PlacesValue | null>(null);

// ponytail: the whole feed is loaded and filtered on the client — instant filters at
// tens of places; move search/filter into SQL with pagination past ~1,000 places.
const fetchPlaces = () => supabase.from('place_stats').select('*').returns<PlaceStats[]>();

export function PlacesProvider({ children }: { children: ReactNode }) {
  const [places, setPlaces] = useState<PlaceStats[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const apply = ({ data, error: e }: { data: PlaceStats[] | null; error: unknown }) => {
    if (e || !data) setError(errorMessage(e));
    else {
      setPlaces(data);
      setError(null);
    }
  };

  useEffect(() => {
    fetchPlaces().then(apply);
  }, []);

  const reload = () => {
    setError(null);
    return fetchPlaces().then(apply);
  };

  const refresh = () => {
    setRefreshing(true);
    return fetchPlaces().then((result) => {
      apply(result);
      setRefreshing(false);
    });
  };

  const list = places ?? [];
  return (
    <PlacesContext.Provider
      value={{
        places: list,
        loading: places == null && error == null,
        error,
        refreshing,
        reload,
        refresh,
        byId: (id) => list.find((p) => p.id === id),
      }}>
      {children}
    </PlacesContext.Provider>
  );
}

export function usePlaces() {
  const value = useContext(PlacesContext);
  if (!value) throw new Error('usePlaces must be used inside PlacesProvider');
  return value;
}
