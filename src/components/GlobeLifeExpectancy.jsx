import React, { useEffect, useState, useMemo } from 'react';
// Import the Globe component from react-globe.gl
import Globe from 'react-globe.gl';
// Import D3 helpers for the color scale
import { scaleSequentialSqrt } from 'd3-scale';
import { interpolateYlOrRd } from 'd3-scale-chromatic';

function GlobeLifeExpectancy({ onClose }) {
  // State for storing GeoJSON (country borders)
  const [countries, setCountries] = useState({ features: [] });
  // State for storing CSV life expectancy data (for 2023)
  const [lifeExp, setLifeExp] = useState([]);
  // State for storing merged features (GeoJSON enriched with life expectancy)
  const [mergedFeatures, setMergedFeatures] = useState([]);
  // State for hovered polygon (for hover effects)
  const [hoverD, setHoverD] = useState(null);

  // 1. Load GeoJSON country polygons.
  useEffect(() => {
    fetch('/datasets/ne_110m_admin_0_countries.geojson')
      .then((res) => res.json())
      .then((data) => {
        setCountries(data);
      })
      .catch((err) => console.error('Error loading GeoJSON', err));
  }, []);

  // 2. Load life expectancy CSV for 2023 and filter out aggregate rows.
  useEffect(() => {
    fetch('https://ourworldindata.org/grapher/life-expectancy.csv?csvType=filtered&time=2023..2023')
      .then((res) => res.text())
      .then((csvText) => {
        // Parse CSV via d3-dsv (assumes that window.d3.csvParse is available)
        const parsed = window.d3.csvParse(csvText);
        if (!parsed.length) {
          console.error("CSV parsed is empty");
          return;
        }
        // Identify the column that includes "life expectancy" (case-insensitive)
        const lifeExpKey = Object.keys(parsed[0]).find(key =>
          key.toLowerCase().includes('life expectancy')
        );
        if (!lifeExpKey) {
          console.error("No column matching 'life expectancy' found in CSV.");
          return;
        }
        // Define a set of aggregate entries we want to skip.
        const aggregates = new Set([
          "World",
          "Africa",
          "Asia",
          "Europe",
          "Americas",
          "Oceania",
          "European Union",
          "High income",
          "Low income",
          "Upper middle income",
          "Lower middle income"
        ]);
        // Filter rows for 2023 and remove aggregates.
        const filtered = parsed
          .filter(d => +d.Year === 2023 && !aggregates.has(d.Entity.trim()))
          .map(d => ({
            entity: d.Entity.trim(),
            lifeExpectancy: +d[lifeExpKey]
          }));
        console.log("Filtered life expectancy data:", filtered);
        setLifeExp(filtered);
      })
      .catch((err) => console.error('Error loading life expectancy CSV', err));
  }, []);

  // 3. Merge the life expectancy data into the GeoJSON features.
  useEffect(() => {
    if (countries.features.length > 0 && lifeExp.length > 0) {
      const merged = countries.features.map(feat => {
        const countryName = feat.properties.ADMIN.trim();
        // Match CSV row with GeoJSON by comparing lowercased names.
        const match = lifeExp.find(
          item => item.entity.toLowerCase() === countryName.toLowerCase()
        );
        // Assign the matched life expectancy value or null if not found.
        feat.properties.lifeExp2023 = match ? match.lifeExpectancy : null;
        return feat;
      });
      // Log some statistics.
      const validLifeExp = merged
        .filter(feat => feat.properties.lifeExp2023 !== null)
        .map(feat => feat.properties.lifeExp2023);
      console.log("Merged features count:", merged.length);
      if (validLifeExp.length > 0) {
        console.log("Life Expectancy values range:", {
          min: Math.min(...validLifeExp),
          max: Math.max(...validLifeExp)
        });
      } else {
        console.warn("No life expectancy values merged.");
      }
      setMergedFeatures(merged);
    }
  }, [countries, lifeExp]);

  // 4. Create a D3 color scale based on the life expectancy values.
  const colorScale = useMemo(() => {
    const scale = scaleSequentialSqrt(interpolateYlOrRd);
    if (mergedFeatures.length > 0) {
      // Get all non-null life expectancy values.
      const values = mergedFeatures
        .map(feat => feat.properties.lifeExp2023)
        .filter(val => val != null);
      const maxVal = Math.max(...values, 0);
      // If maxVal is 0 or missing, use [0,100] as a default domain.
      if (maxVal === 0) {
        scale.domain([0, 100]);
      } else {
        scale.domain([0, maxVal]);
      }
      console.log("Color scale domain:", scale.domain());
    }
    return scale;
  }, [mergedFeatures]);

  return (
    <div className="relative w-full h-full">
      <Globe
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        // Filter out Antarctica (ISO_A2: 'AQ')
        polygonsData={mergedFeatures.filter(feat => feat.properties.ISO_A2 !== 'AQ')}
        // Define slight altitude variation on hover.
        polygonAltitude={d => (d === hoverD ? 0.12 : 0.06)}
        // Use the color scale if a valid life expectancy exists; otherwise fallback to gray.
        polygonCapColor={d =>
          d.properties.lifeExp2023 != null ? colorScale(d.properties.lifeExp2023) : '#888'
        }
        polygonSideColor={() => 'rgba(0, 100, 0, 0.15)'}
        polygonStrokeColor={() => '#111'}
        // Tooltip: display the country name and life expectancy value.
        polygonLabel={({ properties: d }) => `
          <div>
            <div><b>${d.ADMIN} (${d.ISO_A2}):</b></div>
            <div>Life Expectancy 2023: ${d.properties.lifeExp2023 != null ? d.properties.lifeExp2023 : 'N/A'}</div>
          </div>
        `}
        onPolygonHover={setHoverD}
        polygonsTransitionDuration={300}
      />
      {/* Button to close the globe view. */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-2 bg-gray-800 rounded hover:bg-gray-700"
      >
        Close Globe
      </button>
    </div>
  );
}

export default GlobeLifeExpectancy; 