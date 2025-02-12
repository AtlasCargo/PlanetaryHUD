export const createLineChart = (svg, data, width, height) => {
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year))
    .range([0, width]);

  const y = d3.scaleLog()
    .domain(d3.extent(data, d => d.value))
    .range([height, 0]);

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.value))
    .curve(d3.curveMonotoneX);

  svg.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', '#0ff')
    .attr('stroke-width', 1.5)
    .attr('d', line);

  // Add axes and styling...
}; 