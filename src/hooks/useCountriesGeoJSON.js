import { useEffect, useState } from 'react';

export default function useCountriesGeoJSON() {
  const [countries, setCountries] = useState({ features: [] });

  useEffect(() => {
    let cancelled = false;
    fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson')
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setCountries(data || { features: [] }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return countries;
}



