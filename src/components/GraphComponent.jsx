// Create new GraphComponent.jsx
import React, { useEffect, useRef, useState } from 'react';
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
  const [chartData, setChartData] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const [topPadding, setTopPadding] = useState(0);
  const [scaleType, setScaleType] = useState('log');

  useEffect(() => {
    console.log("[GraphComponent] useEffect triggered with dataset:", dataset);
    setLoading(true);  // Set loading true at start of load
    async function loadData() {
      try {
        const data = await loadDataset(dataset?.id);
        console.log("[GraphComponent] Data loaded:", data);
        setChartData(data);
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

  useEffect(() => {
    console.log("[GraphComponent] chartData is now:", chartData ? `Array of length ${chartData.length}` : "No chartData");
    if (loading || !chartData || !d3Container.current) return;
    
    // Determine if the current dataset is life expectancy.
    const isLifeExpectancy = dataset.id === 'life-expectancy';
    // Choose the correct Y accessor:
    // For life expectancy use the 'lifeExpectancy' field; otherwise, use the 'population' field.
    const yAccessor = isLifeExpectancy ? d => d.lifeExpectancy : d => d.population;
    // Set the Y-axis label accordingly.
    const yLabel = isLifeExpectancy ? 'Life Expectancy (years)' : 'Population';

    console.log('Chart data:', chartData);
    console.log('Data extent:', {
      years: d3.extent(chartData, d => d.year),
      values: d3.extent(chartData, yAccessor)
    });

    const margin = { top: 40, right: 30, bottom: 60, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select(d3Container.current)
      .html('')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales: choose y-scale type based on scaleType state
    const x = d3.scaleLinear()
      .domain(d3.extent(chartData, d => d.year))
      .range([0, width]);

    let y;
    // For population data, use a log scale if the scaleType is set to 'log'.
    if (!isLifeExpectancy && scaleType === 'log') {
      y = d3.scaleLog()
        .base(10)
        .domain(d3.extent(chartData, d => d.population))
        .range([height, 0]);
    } else {
      // For life expectancy—or if using linear scaling for population—use a linear scale.
      y = d3.scaleLinear()
        .domain(d3.extent(chartData, yAccessor))
        .range([height, 0]);
    }

    // Create a custom tick formatter for population.
    let yAxisTickFormat;
    if (!isLifeExpectancy) {
      yAxisTickFormat = d => {
        // If the population is 1e9 or more, show in billions (B).
        return d >= 1e9 ? d3.format(".2f")(d / 1e9) + "B" : d3.format(".2s")(d);
      };
    } else {
      yAxisTickFormat = d3.format(".2f");
    }

    // Create line generator
    const line = d3.line()
      .x(d => x(d.year))
      .y(d => y(yAccessor(d)))
      .curve(d3.curveMonotoneX);

    // Add line path
    svg.append('path')
      .datum(chartData)
      .attr('fill', 'none')
      .attr('stroke', '#0ff')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add axes
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format('d')));

    svg.append('g')
      .call(d3.axisLeft(y).tickFormat(yAxisTickFormat));

    // Add labels
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
      .text(yLabel);

    // Display the current region/country: extract from data (assumes loader returned an "entity" field).
    const region = chartData[0] && chartData[0].entity ? chartData[0].entity : "World";
    svg.append("text")
      .attr("x", 0)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "start")
      .style("fill", "#0ff")
      .style("font-size", "14px")
      .text(`Region/Country: ${region}`);

  }, [loading, chartData, scaleType, dataset]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        const parentTop = containerRef.current.parentElement.getBoundingClientRect().top;
        const currentTop = containerRef.current.getBoundingClientRect().top;
        setTopPadding(currentTop - parentTop);
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current.parentElement);
    }

    return () => observer.disconnect();
  }, []);

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
        <p>⚠️ No valid population data found.</p>
        <p className="text-sm mt-2">
          Check that the CSV contains 'World' entries with valid numbers.
        </p>
      </motion.div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-full relative"
      style={{
        marginLeft: 10,
        //`${leftMargin}%`,
        marginRight: 10,
        //`${rightMargin}%`,
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

      {/* Chart Container */}
      <div className="h-full w-full pt-8">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative w-full h-[calc(100%-20px)]"
        >
          <h2 className="text-2xl text-neon-blue mb-2">
            {metadata?.title || 'Dataset Visualization'}
          </h2>
          <p className="text-sm text-neon-purple mb-4">
            Source: {metadata?.source || 'Unknown source'}
          </p>
          {/* NEW: Scale toggle button */}
          <div className="mb-4">
            <button 
              className="px-2 py-1 bg-gray-800 text-white rounded"
              onClick={() => setScaleType(scaleType === 'log' ? 'linear' : 'log')}
            >
              Switch to {scaleType === 'log' ? 'Linear' : 'Log'} Scale
            </button>
          </div>
          <svg ref={d3Container} className="w-full h-[calc(100%-80px)]" />
          <div className="absolute bottom-4 left-4 text-xs text-neon-blue/80">
            {dataset?.metadata?.note}
          </div>
        </motion.div>
      </div>
    </div>
  );
}