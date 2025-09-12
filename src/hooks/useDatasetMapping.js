import { useEffect } from 'react';

export default function useDatasetMapping({
  ctxSelectedId,
  ctxSeries,
  ctxYears,
  ctxSelectedYear,
  ctxIsLoading,
  setIsLoadingGlobeData,
  setGlobeDataError,
  setPopulationData,
  setPopulationYears,
  setSelectedPopulationYear,
  setLifeExpData,
  setLifeExpYears,
  setSelectedLifeExpYear,
  setGdpData,
  setGdpYears,
  setSelectedGdpYear,
}) {
  useEffect(() => {
    if (!ctxSelectedId || !Array.isArray(ctxSeries)) return;
    try {
      setIsLoadingGlobeData && setIsLoadingGlobeData(!!ctxIsLoading);
      if (ctxSelectedId === 'population') {
        setPopulationData && setPopulationData(ctxSeries);
        setPopulationYears && setPopulationYears(ctxYears);
        if (ctxSelectedYear != null && setSelectedPopulationYear) setSelectedPopulationYear(ctxSelectedYear);
      } else if (ctxSelectedId === 'life-expectancy') {
        setLifeExpData && setLifeExpData(ctxSeries);
        setLifeExpYears && setLifeExpYears(ctxYears);
        if (ctxSelectedYear != null && setSelectedLifeExpYear) setSelectedLifeExpYear(ctxSelectedYear);
      } else if (ctxSelectedId === 'NY.GDP.PCAP.PP.KD') {
        setGdpData && setGdpData(ctxSeries);
        setGdpYears && setGdpYears(ctxYears);
        if (ctxSelectedYear != null && setSelectedGdpYear) setSelectedGdpYear(ctxSelectedYear);
      }
    } catch (e) {
      setGlobeDataError && setGlobeDataError(e?.message || 'Failed to map dataset');
    } finally {
      setIsLoadingGlobeData && setIsLoadingGlobeData(false);
    }
  }, [
    ctxSelectedId,
    ctxSeries,
    ctxYears,
    ctxSelectedYear,
    ctxIsLoading,
    setIsLoadingGlobeData,
    setGlobeDataError,
    setPopulationData,
    setPopulationYears,
    setSelectedPopulationYear,
    setLifeExpData,
    setLifeExpYears,
    setSelectedLifeExpYear,
    setGdpData,
    setGdpYears,
    setSelectedGdpYear,
  ]);
}



