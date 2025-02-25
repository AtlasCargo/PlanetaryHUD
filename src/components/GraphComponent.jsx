import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import { loadDataset } from '../utils/loadDataset';

export default function GraphComponent({ dataset, onClose, leftMargin, rightMargin }) {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const [scaleType, setScaleType] = useState('linear');
  
  // Add state for year range selection
  const [yearRange, setYearRange] = useState([1950, 2023]);
  const [availableYears, setAvailableYears] = useState([]);

  // Effect to load data when dataset changes
  useEffect(() => {
    console.log("[GraphComponent] useEffect triggered with dataset:", dataset);
    setLoading(true);
    
    async function loadData() {
      try {
        // For regions, we want to load the full time series
        let data;
        if ((dataset?.id === 'life-expectancy' || dataset?.id === 'population') && window.selectedRegion) {
          // Get data for specific region from parent component
          console.log(`Loading ${dataset.id} data for region: ${window.selectedRegion}`);
          
          // Fetch data specifically for the selected region
          const dataUrl = dataset.id === 'life-expectancy' ? 
            'https://ourworldindata.org/grapher/life-expectancy.csv' :
            'https://ourworldindata.org/grapher/population.csv';
            
          const response = await fetch(dataUrl);
          const csvText = await response.text();
          const parsed = window.d3.csvParse(csvText);
          
          if (!parsed.length) {
            console.error('CSV parsed is empty');
            setLoading(false);
            return;
          }
          
          // Find the value column based on dataset
          let valueKey;
          if (dataset.id === 'life-expectancy') {
            valueKey = Object.keys(parsed[0]).find(key => 
              key.toLowerCase().includes('life expectancy')
            );
          } else if (dataset.id === 'population') {
            valueKey = Object.keys(parsed[0]).find(key => 
              key.toLowerCase().includes('population') && !key.toLowerCase().includes('density')
            );
          }
          
          if (!valueKey) {
            console.error(`No appropriate data column found in ${dataset.id} CSV.`);
            setLoading(false);
            return;
          }
          
          // Filter for the specific region/country
          data = parsed
            .filter(d => d.Entity.trim() === window.selectedRegion)
            .map(d => ({
              entity: d.Entity.trim(),
              year: +d.Year,
              value: +d[valueKey],
              metric: dataset.id === 'life-expectancy' ? 'Life Expectancy (years)' : 'Population'
            }))
            .filter(d => !isNaN(d.year) && !isNaN(d.value))
            .sort((a, b) => a.year - b.year);
            
          console.log(`Found ${data.length} data points for ${window.selectedRegion}`);
        } else {
          // Use regular dataset loading
          data = await loadDataset(dataset?.id);
        }
        
        console.log("[GraphComponent] Data loaded:", data?.slice(0, 5));
        if (data && data.length > 0) {
          // Calculate available years and set default range
          const years = [...new Set(data.map(d => d.year))].filter(y => !isNaN(y)).sort((a, b) => a - b);
          setAvailableYears(years);
          
          // Set initial year range to min and max years
          if (years.length > 0) {
            const minYear = Math.min(...years);
            const maxYear = Math.max(...years);
            setYearRange([minYear, maxYear]);
          }
          
          // Set the chart data
          setChartData(data);
        } else {
          console.error('No data returned from loadDataset');
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (dataset?.id) {
      loadData();
    }
  }, [dataset]);

  // Effect to render the chart when data is available
  useEffect(() => {
    if (loading || !chartData || !d3Container.current) return;

    // Sort data by year and apply year range filter
    const sortedData = [...chartData]
      .filter(d => d.year >= yearRange[0] && d.year <= yearRange[1])
      .sort((a, b) => a.year - b.year);
    
    const margin = { top: 40, right: 30, bottom: 60, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Clear previous content
    d3.select(d3Container.current).html('');

    const svg = d3.select(d3Container.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales using sortedData
    const x = d3.scaleLinear()
      .domain(d3.extent(sortedData, d => d.year))
      .range([0, width]);

    let y;
    if (scaleType === 'log' && d3.min(sortedData, d => d.value) > 0) {
      y = d3.scaleLog()
        .domain([d3.min(sortedData, d => d.value), d3.max(sortedData, d => d.value)])
        .range([height, 0]);
    } else {
      y = d3.scaleLinear()
        .domain([0, d3.max(sortedData, d => d.value)])
        .range([height, 0]);
    }

    // Create a more stable line generator with defined checks
    const line = d3.line()
      .x(d => isNaN(d.year) ? 0 : x(d.year))
      .y(d => isNaN(d.value) ? 0 : y(d.value))
      .defined(d => !isNaN(d.year) && !isNaN(d.value))  // Skip undefined points
      .curve(d3.curveMonotoneX);

    // Log the data being used for the graph
    console.log("Sorted data for graph:", sortedData.map(d => ({ year: d.year, value: d.value })));

    // Add line path using sortedData for stability
    svg.append('path')
      .datum(sortedData)
      .attr('fill', 'none')
      .attr('stroke', '#0ff')
      .attr('stroke-width', 2)
      .attr('d', line);
      
    // Add data points as circles
    svg.selectAll('.data-point')
      .data(sortedData)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', d => x(d.year))
      .attr('cy', d => y(d.value))
      .attr('r', 3)
      .attr('fill', '#0ff')
      .attr('stroke', '#005a5a')
      .attr('stroke-width', 1);

    // Add axes
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format('d')))
      .selectAll('text')
      .style('fill', '#0ff');

    svg.append('g')
      .call(d3.axisLeft(y)
        .tickFormat(d => {
          if (d >= 1e9) return `${(d / 1e9).toFixed(1)}B`;
          if (d >= 1e6) return `${(d / 1e6).toFixed(1)}M`;
          if (d >= 1e3) return `${(d / 1e3).toFixed(1)}K`;
          return d.toFixed(1);
        }))
      .selectAll('text')
      .style('fill', '#0ff');

    // Add grid lines
    svg.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat(''));

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('fill', '#0ff')
      .style('font-size', '16px')
      .text(dataset?.title || 'Data Visualization');

    // Add axes labels
    svg.append('text')
      .attr('transform', `translate(${width/2},${height + margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .style('fill', '#0ff')
      .text('Year');

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -height/2)
      .style('text-anchor', 'middle')
      .style('fill', '#0ff')
      .text(chartData[0]?.metric || 'Value');

  }, [loading, chartData, scaleType, dataset, yearRange]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-bold text-neon-blue"
        >
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
        <p>⚠️ No data available for this dataset.</p>
        <p className="text-sm mt-2">
          Please try another dataset or check the data source.
        </p>
      </motion.div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40"
      style={{
        left: leftMargin || 0,
        right: rightMargin || 0,
        top: '10vh', // Add some top margin
        bottom: '10vh' // Add some bottom margin
      }}
    >
      <div className="relative bg-gray-900/80 rounded-lg w-full h-full max-w-5xl mx-auto p-6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl text-neon-blue">
            {window.selectedRegion ? 
              `${dataset?.title} - ${window.selectedRegion}` : 
              dataset?.title || 'Dataset Visualization'}
          </h2>
          <div className="flex gap-4">
            <button
              onClick={() => setScaleType(prev => prev === 'linear' ? 'log' : 'linear')}
              className="px-3 py-1 bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 rounded transition-colors"
            >
              {scaleType === 'linear' ? 'Switch to Log Scale' : 'Switch to Linear Scale'}
            </button>
            <button
              onClick={() => {
                // Make sure to restore globe visibility before closing
                onClose();
              }}
              className="px-3 py-1 bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
        
        {/* Year range slider */}
        {availableYears.length > 1 && (
          <div className="mb-4 px-6 py-3 bg-gray-800/70 rounded-lg">
            <div className="flex justify-between mb-1">
              <span className="text-neon-blue text-xs">Year Range: {yearRange[0]} - {yearRange[1]}</span>
              <span className="text-neon-blue text-xs">{dataset?.title}</span>
            </div>
            
            <div className="relative pt-1">
              <input
                type="range"
                min={Math.min(...availableYears)}
                max={Math.max(...availableYears)}
                value={yearRange[0]}
                onChange={(e) => setYearRange([+e.target.value, yearRange[1]])}
                step="1"
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer absolute z-20"
              />
              <input
                type="range"
                min={Math.min(...availableYears)}
                max={Math.max(...availableYears)}
                value={yearRange[1]}
                onChange={(e) => setYearRange([yearRange[0], +e.target.value])}
                step="1"
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer absolute z-10"
              />
            </div>
            
            <div className="flex justify-between text-xs text-gray-400 mt-4">
              <button 
                onClick={() => setYearRange([Math.min(...availableYears), Math.max(...availableYears)])}
                className="px-2 py-1 bg-gray-700/50 text-neon-blue/70 rounded text-xs hover:bg-gray-700"
              >
                Reset Range
              </button>
              <div>
                <span>{Math.min(...availableYears)}</span>
                <span className="mx-2">-</span>
                <span>{Math.max(...availableYears)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 w-full overflow-hidden">
          <svg 
            ref={d3Container} 
            className="w-full h-full" 
            preserveAspectRatio="xMidYMid meet" 
            viewBox="0 0 800 500" 
          />
        </div>
      </div>
    </div>
  );
}