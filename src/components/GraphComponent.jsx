import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import { loadDataset } from '../utils/loadDataset';

export default function GraphComponent({
  dataset,
  onClose,
  leftMargin,
  rightMargin,
  topDivHeight
}) {
  const d3Container = useRef(null);
  const containerRef = useRef(null);

  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scaleType, setScaleType] = useState('log');
  const [selectedYearRange, setSelectedYearRange] = useState([1800, 2023]);
  const [availableYears, setAvailableYears] = useState([1800, 2023]);
  const [selectedRegion, setSelectedRegion] = useState('World');
  const [availableRegions, setAvailableRegions] = useState(['World']);
  const [topPadding, setTopPadding] = useState(0);

  useEffect(() => {
    async function loadData() {
      if (!dataset?.id) return;
      setLoading(true);
      try {
        const data = await loadDataset(dataset.id);
        // Extract years
        const years = [...new Set(data.map(d => d.year))].sort((a, b) => a - b);
        setAvailableYears(years);
        setSelectedYearRange([years[0], years[years.length - 1]]);

        // Extract regions
        const regions = [...new Set(data.map(d => d.entity))];
        setAvailableRegions(regions);
        if (regions.includes('World')) {
          setSelectedRegion('World');
        } else if (regions.length > 0) {
          setSelectedRegion(regions[0]);
        }
        setChartData(data);
      } catch (error) {
        // Handle or display error if needed
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [dataset]);

  const getFilteredData = useCallback(() => {
    if (!chartData) return [];
    return chartData
      .filter(d => d.year >= selectedYearRange[0] && d.year <= selectedYearRange[1] && d.entity === selectedRegion)
      .sort((a, b) => a.year - b.year);
  }, [chartData, selectedYearRange, selectedRegion]);

  useEffect(() => {
    if (loading || !chartData || !d3Container.current) return;
    const filteredData = getFilteredData();
    if (filteredData.length === 0) return;

    // Check for life expectancy or population
    const isLifeExpectancy = dataset.id === 'life-expectancy';
    const yAccessor = d => (isLifeExpectancy ? d.lifeExpectancy || d.value : d.population || d.value);
    const yLabel = isLifeExpectancy ? 'Life Expectancy (years)' : 'Population';

    const margin = { top: 40, right: 30, bottom: 60, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select(d3Container.current)
      .html('')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain(d3.extent(filteredData, d => d.year))
      .range([0, width]);

    let y;
    if (!isLifeExpectancy && scaleType === 'log') {
      const minValue = Math.max(1, d3.min(filteredData, yAccessor));
      const maxValue = d3.max(filteredData, yAccessor);
      y = d3.scaleLog().base(10).domain([minValue, maxValue]).range([height, 0]).clamp(true);
    } else {
      const extent = d3.extent(filteredData, yAccessor);
      const validExtent = [extent[0] || 0, extent[1] || 100];
      y = d3.scaleLinear().domain(validExtent).range([height, 0]).nice();
    }

    let yAxisTickFormat = isLifeExpectancy
      ? d3.format(".2f")
      : (d) => (d >= 1e9 ? d3.format(".2f")(d / 1e9) + "B" : d3.format(".2s")(d));

    const line = d3.line()
      .x(d => x(d.year))
      .y(d => y(yAccessor(d)))
      .defined(d => !isNaN(yAccessor(d)))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(filteredData)
      .attr('fill', 'none')
      .attr('stroke', '#0ff')
      .attr('stroke-width', 2)
      .attr('d', line);

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format('d')));

    svg.append('g')
      .call(d3.axisLeft(y).tickFormat(yAxisTickFormat));

    svg.append('text')
      .attr('transform', `translate(${width / 2},${height + margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .style('fill', '#0ff')
      .text('Year');

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -height / 2)
      .style('text-anchor', 'middle')
      .style('fill', '#0ff')
      .text(yLabel);

    svg.append('text')
      .attr('x', 0)
      .attr('y', -margin.top / 2)
      .attr('text-anchor', 'start')
      .style('fill', '#0ff')
      .style('font-size', '14px')
      .text(`Region/Country: ${selectedRegion}`);
  }, [loading, chartData, scaleType, dataset, selectedYearRange, selectedRegion, getFilteredData]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (containerRef.current?.parentElement) {
        const parentTop = containerRef.current.parentElement.getBoundingClientRect().top;
        const currentTop = containerRef.current.getBoundingClientRect().top;
        setTopPadding(currentTop - parentTop);
      }
    });
    if (containerRef.current?.parentElement) {
      observer.observe(containerRef.current.parentElement);
    }
    return () => observer.disconnect();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl font-bold text-neon-blue">
          Loading graph data...
        </motion.div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-neon-red p-4 bg-black/80 rounded-lg"
      >
        <p>⚠️ No valid data found.</p>
      </motion.div>
    );
  }

  const handleYearRangeChange = (range) => {
    setSelectedYearRange(range);
  };

  return (
    <div
      ref={containerRef}
      className="h-full relative"
      style={{
        marginLeft: 10,
        marginRight: 10,
        width: '100%',
        paddingTop: `${topPadding}px`
      }}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        style={{ top: `${topPadding + 80}px` }}
        className="absolute right-4 z-50 neon-button text-xs px-2 py-0.5"
      >
        CLOSE
      </button>

      <div className="h-full w-full pt-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative w-full h-[calc(100%-20px)]">
          <h2 className="text-2xl text-neon-blue mb-2">{dataset?.metadata?.title || 'Dataset Visualization'}</h2>
          <p className="text-sm text-neon-purple mb-4">
            Source: {dataset?.metadata?.source || 'Unknown source'}
          </p>

          {/* Controls Row */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <button
                className="px-2 py-1 bg-gray-800 text-white rounded"
                onClick={() => setScaleType(scaleType === 'log' ? 'linear' : 'log')}
              >
                Switch to {scaleType === 'log' ? 'Linear' : 'Log'} Scale
              </button>
            </div>
            <div className="min-w-[200px]">
              <label className="block text-xs text-neon-blue mb-1">Region/Country:</label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full p-1 bg-gray-800 text-neon-blue border border-neon-blue/20 rounded text-xs"
              >
                <optgroup label="Global">
                  {availableRegions
                    .filter(r => r === 'World')
                    .map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                </optgroup>
                <optgroup label="Continents">
                  {availableRegions
                    .filter(r => ['Africa','Asia','Europe','North America','South America','Oceania'].includes(r))
                    .map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                </optgroup>
                <optgroup label="Countries">
                  {availableRegions
                    .filter(r => !['World','Africa','Asia','Europe','North America','South America','Oceania',
                                   'European Union','High income','Low income',
                                   'Upper middle income','Lower middle income'].includes(r))
                    .sort()
                    .map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* D3 Chart */}
          <svg ref={d3Container} className="w-full h-[calc(100%-130px)]" />

          {/* Year Range Slider */}
          <div
            className="fixed bottom-[10vh] left-[25%] right-[25%] z-20"
            style={{ width: '50%', margin: '0 auto' }}
          >
            <div className="flex justify-between mb-1 bg-gray-900/80 backdrop-blur-md p-2 rounded-t-lg border border-neon-blue/30">
              <span className="text-neon-blue text-xs">
                Year Range: {selectedYearRange[0]} - {selectedYearRange[1]}
              </span>
            </div>
            <div className="flex items-center bg-gray-900/80 backdrop-blur-md p-2 rounded-b-lg border-t-0 border border-neon-blue/30">
              <span className="text-xs text-neon-blue mr-2">{Math.min(...availableYears)}</span>
              <input
                type="range"
                min={Math.min(...availableYears)}
                max={Math.max(...availableYears)}
                value={selectedYearRange[0]}
                onChange={(e) => setSelectedYearRange([+e.target.value, selectedYearRange[1]])}
                step="1"
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mr-1"
              />
              <input
                type="range"
                min={Math.min(...availableYears)}
                max={Math.max(...availableYears)}
                value={selectedYearRange[1]}
                onChange={(e) => setSelectedYearRange([selectedYearRange[0], +e.target.value])}
                step="1"
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ml-1"
              />
              <span className="text-xs text-neon-blue ml-2">{Math.max(...availableYears)}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
