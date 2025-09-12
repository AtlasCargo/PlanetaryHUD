import { useEffect } from 'react';
import { csvParse } from 'd3-dsv';

export default function useOwidBaselines({
  setAvailableRegions,
  setLifeExpYears,
  setSelectedLifeExpYear,
  setLifeExpData,
  setPopulationYears,
  setSelectedPopulationYear,
  setPopulationData,
}) {
  useEffect(() => {
    fetch('https://ourworldindata.org/grapher/life-expectancy.csv')
      .then(res => res.text())
      .then(csvText => {
        const parsed = csvParse(csvText);
        if (!parsed.length) return;
        const lifeExpKey = Object.keys(parsed[0]).find(key =>
          key.toLowerCase().includes('life expectancy')
        );
        if (!lifeExpKey) return;

        const allEntities = [...new Set(parsed.map(d => d.Entity.trim()))];
        const regions = [
          'World','Africa','Asia','Europe','Americas','North America','South America','Oceania',
          'European Union','High income','Low income','Upper middle income','Lower middle income'
        ].filter(r => allEntities.includes(r));
        setAvailableRegions && setAvailableRegions(['World', ...regions.filter(r => r !== 'World'), ...allEntities.sort()]);

        const availableYears = [...new Set(parsed.map(d => +d.Year).filter(year => !isNaN(year)))].sort((a,b)=>a-b);
        setLifeExpYears && setLifeExpYears(availableYears);

        const defaultYear = availableYears.find(y => y >= 1950) || availableYears[0];
        setSelectedLifeExpYear && setSelectedLifeExpYear(defaultYear);

        const yearFiltered = parsed.filter(d => +d.Year === defaultYear);
        const result = yearFiltered
          .filter(d => !regions.includes(d.Entity.trim()))
          .map(d => ({ entity: d.Entity.trim(), year: +d.Year, value: +d[lifeExpKey], isCountry: true }))
          .filter(d => !isNaN(d.value));
        setLifeExpData && setLifeExpData(result);
      })
      .catch(() => {});
  }, [setAvailableRegions, setLifeExpYears, setSelectedLifeExpYear, setLifeExpData]);

  useEffect(() => {
    fetch('https://ourworldindata.org/grapher/population.csv')
      .then(res => res.text())
      .then(csvText => {
        const parsed = csvParse(csvText);
        if (!parsed.length) return;
        const popKey = Object.keys(parsed[0]).find(key =>
          key.toLowerCase().includes('population') && !key.toLowerCase().includes('density')
        );
        if (!popKey) return;
        const aggregates = new Set([
          'World','Africa','Asia','Europe','Americas','Oceania','European Union','High income','Low income','Upper middle income','Lower middle income'
        ]);
        let filteredPop = parsed.filter(d => !aggregates.has(d.Entity.trim()));
        const availableYears = [...new Set(filteredPop.map(d => +d.Year).filter(y => !isNaN(y)))].sort((a,b)=>a-b);
        setPopulationYears && setPopulationYears(availableYears);
        const defaultYear = Math.max(...availableYears);
        setSelectedPopulationYear && setSelectedPopulationYear(defaultYear);
        filteredPop = filteredPop.filter(d => +d.Year === defaultYear);
        const result = filteredPop.map(d => ({ entity: d.Entity.trim(), year: +d.Year, population: +d[popKey], value: +d[popKey] }))
          .filter(d => !isNaN(d.population));
        setPopulationData && setPopulationData(result);
      })
      .catch(() => {});
  }, [setPopulationYears, setSelectedPopulationYear, setPopulationData]);
}



