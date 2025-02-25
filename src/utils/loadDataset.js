import { csv } from 'd3-fetch';
import { csvParse } from 'd3-dsv';

// Define main OWID categories with their dataset counts
export const OWID_CATEGORIES = [
  { id: 'population', count: 1816, title: 'Population and Demographic Change' },
  { id: 'health', count: 1772, title: 'Health' },
  { id: 'energy', count: 2694, title: 'Energy and Environment' },
  { id: 'food', count: 2822, title: 'Food and Agriculture' },
  { id: 'poverty', count: 4151, title: 'Poverty and Economic Development' },
  { id: 'education', count: 187, title: 'Education and Knowledge' },
  { id: 'innovation', count: 210, title: 'Innovation and Technological Change' },
  { id: 'living', count: 355, title: 'Living Conditions, Community and Wellbeing' },
  { id: 'rights', count: 479, title: 'Human Rights and Democracy' },
  { id: 'war', count: 808, title: 'Violence and War' }
];

/**
 * Gets available datasets from OWID
 * @returns {Promise<Array>} List of available datasets
 */
export const getAvailableDatasets = async () => {
  try {
    // Always include these essential datasets
    const essentialDatasets = [
      { id: 'life-expectancy', title: 'Life Expectancy', category: 'health' },
      { id: 'population', title: 'Population', category: 'demographics' },
      { id: 'gdp-per-capita-worldbank', title: 'GDP per Capita', category: 'poverty' },
      { id: 'child-mortality', title: 'Child Mortality', category: 'health' },
      { id: 'co2-emissions-per-capita', title: 'CO2 Emissions per Capita', category: 'energy' },
      { id: 'mean-years-of-schooling', title: 'Mean Years of Schooling', category: 'education' }
    ];

    return essentialDatasets;
  } catch (error) {
    console.error('Error fetching available datasets:', error);
    return [
      { id: 'life-expectancy', title: 'Life Expectancy', category: 'health' },
      { id: 'population', title: 'Population', category: 'demographics' }
    ];
  }
};

/**
 * Generic function to load any OWID dataset
 * @param {string} datasetUrl - The URL of the dataset
 * @returns {Promise<Array>} Processed data array
 */
export const loadGenericDataset = async (datasetUrl) => {
  try {
    console.log('Loading dataset from URL:', datasetUrl);
    const rawData = await csv(datasetUrl);
    
    if (!rawData || rawData.length === 0) {
      console.error('Dataset is empty');
      return [];
    }

    console.log('Raw data sample:', rawData[0]);
    console.log('Available columns:', Object.keys(rawData[0]));

    // Find the value column (excluding metadata columns)
    const headers = Object.keys(rawData[0]);
    const valueKey = headers.find(key => 
      !['Entity', 'Year', 'Code'].includes(key) && 
      !key.toLowerCase().includes('flag')
    );

    if (!valueKey) {
      console.error('Could not determine value column. Headers:', headers);
      return [];
    }

    // Get available entities
    const entities = Array.from(new Set(rawData.map(d => d.Entity)));
    let targetEntity = "World";
    
    if (!entities.includes(targetEntity)) {
      targetEntity = entities.find(e => 
        e.toLowerCase().includes('world') || 
        e.toLowerCase().includes('global')
      ) || entities[0];
      console.log(`Using alternative entity: ${targetEntity}`);
    }

    // Process the data
    const processedData = rawData
      .filter(d => d.Entity === targetEntity)
      .map(d => ({
        year: +d.Year,
        value: +d[valueKey],
        entity: d.Entity,
        metric: valueKey
      }))
      .filter(d => !isNaN(d.year) && !isNaN(d.value))
      .sort((a, b) => a.year - b.year);

    console.log(`Processed ${processedData.length} data points for ${targetEntity}`);
    return processedData;

  } catch (error) {
    console.error('Error loading dataset:', error);
    return null;
  }
};

export const loadDataset = async (datasetID) => {
  console.log("loadDataset called with datasetID:", datasetID);
  
  if (datasetID === 'population') {
    try {
      const response = await fetch('https://ourworldindata.org/grapher/population.csv');
      const csvText = await response.text();
      const parsed = csvParse(csvText);
      
      if (!parsed.length) {
        console.error('Population CSV parsed is empty');
        return null;
      }

      // Find the population column
      const popKey = Object.keys(parsed[0]).find(key => 
        key.toLowerCase().includes('population') && 
        !key.toLowerCase().includes('life')
      );

      if (!popKey) {
        console.error("No population column found");
        return null;
      }

      // Filter and format the data
      const data = parsed
        .map(d => ({
          entity: d.Entity.trim(),
          year: +d.Year,
          value: +d[popKey]
        }))
        .filter(d => 
          !isNaN(d.year) && 
          !isNaN(d.value) && 
          d.value > 0 &&
          !['World', 'Asia', 'Europe', 'Africa', 'North America', 'South America', 'Oceania'].includes(d.entity)
        )
        .sort((a, b) => a.year - b.year);

      console.log("Processed population data:", data.slice(0, 5));
      return data;
    } catch (error) {
      console.error('Error loading population data:', error);
      return null;
    }
  }

  if (datasetID === 'life-expectancy') {
    try {
      const response = await fetch('https://ourworldindata.org/grapher/life-expectancy.csv');
      const csvText = await response.text();
      const parsed = csvParse(csvText);
      
      if (!parsed.length) {
        console.error('Life expectancy CSV parsed is empty');
        return null;
      }

      // Find the life expectancy column
      const lifeExpKey = Object.keys(parsed[0]).find(key => 
        key.toLowerCase().includes('life expectancy')
      );

      if (!lifeExpKey) {
        console.error("No life expectancy column found");
        return null;
      }

      // Filter and format the data
      const data = parsed
        .map(d => ({
          entity: d.Entity.trim(),
          year: +d.Year,
          value: +d[lifeExpKey]
        }))
        .filter(d => 
          !isNaN(d.year) && 
          !isNaN(d.value) && 
          d.value > 0 &&
          !['World', 'Asia', 'Europe', 'Africa', 'North America', 'South America', 'Oceania'].includes(d.entity)
        )
        .sort((a, b) => a.year - b.year);

      console.log("Processed life expectancy data:", data.slice(0, 5));
      return data;
    } catch (error) {
      console.error('Error loading life expectancy data:', error);
      return null;
    }
  }

  // For other datasets, use the generic loader
  try {
    const url = `https://ourworldindata.org/grapher/${datasetID}.csv`;
    const response = await fetch(url);
    const csvText = await response.text();
    const parsed = csvParse(csvText);
    
    if (!parsed.length) {
      console.error('CSV parsed is empty');
      return null;
    }

    // Find the value column (excluding metadata columns)
    const valueKey = Object.keys(parsed[0]).find(key => 
      !['Entity', 'Year', 'Code'].includes(key) && 
      !key.toLowerCase().includes('flag')
    );

    if (!valueKey) {
      console.error("No value column found");
      return null;
    }

    // Filter and format the data
    const data = parsed
      .map(d => ({
        entity: d.Entity.trim(),
        year: +d.Year,
        value: +d[valueKey],
        metric: valueKey
      }))
      .filter(d => 
        !isNaN(d.year) && 
        !isNaN(d.value) && 
        d.value > 0 &&
        !['World', 'Asia', 'Europe', 'Africa', 'North America', 'South America', 'Oceania'].includes(d.entity)
      )
      .sort((a, b) => a.year - b.year);

    console.log("Processed generic data:", data.slice(0, 5));
    return data;
  } catch (error) {
    console.error(`Error loading dataset ${datasetID}:`, error);
    return null;
  }
};

// Keep existing loadPopulationData function
export const loadPopulationData = async () => {
  try {
    const response = await fetch('https://ourworldindata.org/grapher/population.csv');
    const csvText = await response.text();
    const parsed = csvParse(csvText);
    
    if (!parsed.length) {
      console.error('Population CSV parsed is empty');
      return null;
    }

    // Find the population column
    const popKey = Object.keys(parsed[0]).find(key => 
      key.toLowerCase().includes('population') && 
      !key.toLowerCase().includes('life')
    );

    if (!popKey) {
      console.error("No population column found");
      return null;
    }

    // Filter and format the data
    const data = parsed
      .map(d => ({
        entity: d.Entity.trim(),
        year: +d.Year,
        value: +d[popKey]
      }))
      .filter(d => 
        !isNaN(d.year) && 
        !isNaN(d.value) && 
        d.value > 0 &&
        !['World', 'Asia', 'Europe', 'Africa', 'North America', 'South America', 'Oceania'].includes(d.entity)
      )
      .sort((a, b) => a.year - b.year);

    return data;

  } catch (error) {
    console.error('Error loading population data:', error);
    return null;
  }
};

/**
 * loadLifeExpectancyData: Loads and processes the life expectancy CSV
 * from Our World in Data. We now remove the country parameter from the URL so that
 * we get a full dataset and then filter for a target entity. This helps in case the
 * "World" series is not returned by the API.
 */
export const loadLifeExpectancyData = async () => {
  try {
    // Remove the country filter so we get all the rows.
    const url = "https://ourworldindata.org/grapher/life-expectancy.csv?csvType=filtered&time=1800..2023";
    const rawData = await csv(url);
    console.log("Raw life expectancy data sample: ", rawData[0]);
    
    // Determine the key containing life expectancy data by searching for "life expectancy" in the header.
    const lifeExpKey = Object.keys(rawData[0]).find(key => key.toLowerCase().includes("life expectancy"));
    if (!lifeExpKey) {
      console.error("Could not determine life expectancy column key.");
      return [];
    }
    
    // See which entities are available in the data.
    const entities = Array.from(new Set(rawData.map(d => d.Entity)));
    console.log("Entities in life expectancy data:", entities);
    
    // We desire the global ("World") data.
    let targetEntity = "World";
    if (!entities.includes(targetEntity)) {
      // Fallback: if "World" is not available, use the first available entity.
      targetEntity = entities[0];
      console.warn("Entity 'World' not found, using:", targetEntity);
    }
    
    // Process the raw CSV: filter for the desired entity, convert fields to numbers,
    // filter out any invalid rows, and sort by year.
    const processedData = rawData
      .filter(d => d.Entity === targetEntity)
      .map(d => ({
        year: +d.Year,
        value: +d[lifeExpKey],  // Changed lifeExpectancy to value for consistency
        entity: d.Entity
      }))
      .filter(d => !isNaN(d.year) && !isNaN(d.value))  // Updated filter to check value
      .sort((a, b) => a.year - b.year);
      
    return processedData;
  } catch (error) {
    console.error('Error loading life expectancy data:', error);
    return null;
  }
};

/**
 * loadGDPData: Loads and processes GDP per capita data from World Bank via OWID
 */
export const loadGDPData = async () => {
  try {
    const url = "https://ourworldindata.org/grapher/gdp-per-capita-worldbank.csv";
    const rawData = await csv(url);
    console.log("Raw GDP data sample: ", rawData[0]);
    
    // Find the GDP column
    const gdpKey = Object.keys(rawData[0]).find(key => 
      key.toLowerCase().includes("gdp") || key.toLowerCase().includes("value")
    );
    if (!gdpKey) {
      console.error("Could not determine GDP column key.");
      return [];
    }
    
    // Process the data similar to life expectancy
    const entities = Array.from(new Set(rawData.map(d => d.Entity)));
    let targetEntity = "World";
    if (!entities.includes(targetEntity)) {
      targetEntity = entities[0];
      console.warn("Entity 'World' not found, using:", targetEntity);
    }
    
    return rawData
      .filter(d => d.Entity === targetEntity)
      .map(d => ({
        year: +d.Year,
        value: +d[gdpKey],
        entity: d.Entity
      }))
      .filter(d => !isNaN(d.year) && !isNaN(d.value))
      .sort((a, b) => a.year - b.year);
      
  } catch (error) {
    console.error('Error loading GDP data:', error);
    return null;
  }
};

/**
 * loadCO2Data: Loads and processes CO2 emissions per capita data
 */
export const loadCO2Data = async () => {
  try {
    const url = "https://ourworldindata.org/grapher/co-emissions-per-capita.csv";
    const rawData = await csv(url);
    console.log("Raw CO2 data sample: ", rawData[0]);
    
    // Find the CO2 emissions column
    const emissionsKey = Object.keys(rawData[0]).find(key => 
      key.toLowerCase().includes("co2") || key.toLowerCase().includes("value")
    );
    if (!emissionsKey) {
      console.error("Could not determine CO2 emissions column key.");
      return [];
    }
    
    const entities = Array.from(new Set(rawData.map(d => d.Entity)));
    let targetEntity = "World";
    if (!entities.includes(targetEntity)) {
      targetEntity = entities[0];
      console.warn("Entity 'World' not found, using:", targetEntity);
    }
    
    return rawData
      .filter(d => d.Entity === targetEntity)
      .map(d => ({
        year: +d.Year,
        value: +d[emissionsKey],
        entity: d.Entity
      }))
      .filter(d => !isNaN(d.year) && !isNaN(d.value))
      .sort((a, b) => a.year - b.year);
      
  } catch (error) {
    console.error('Error loading CO2 data:', error);
    return null;
  }
};

/**
 * loadChildMortalityData: Loads and processes child mortality data
 */
export const loadChildMortalityData = async () => {
  try {
    const url = "https://ourworldindata.org/grapher/child-mortality-around-the-world.csv";
    const rawData = await csv(url);
    console.log("Raw child mortality data sample: ", rawData[0]);
    
    // Find the mortality column
    const mortalityKey = Object.keys(rawData[0]).find(key => 
      key.toLowerCase().includes("mortality") || key.toLowerCase().includes("value")
    );
    if (!mortalityKey) {
      console.error("Could not determine mortality column key.");
      return [];
    }
    
    const entities = Array.from(new Set(rawData.map(d => d.Entity)));
    let targetEntity = "World";
    if (!entities.includes(targetEntity)) {
      targetEntity = entities[0];
      console.warn("Entity 'World' not found, using:", targetEntity);
    }
    
    return rawData
      .filter(d => d.Entity === targetEntity)
      .map(d => ({
        year: +d.Year,
        value: +d[mortalityKey],
        entity: d.Entity
      }))
      .filter(d => !isNaN(d.year) && !isNaN(d.value))
      .sort((a, b) => a.year - b.year);
      
  } catch (error) {
    console.error('Error loading child mortality data:', error);
    return null;
  }
};

/**
 * loadEducationData: Loads and processes mean years of schooling data
 */
export const loadEducationData = async () => {
  try {
    const url = "https://ourworldindata.org/grapher/mean-years-of-schooling-long-run.csv";
    const rawData = await csv(url);
    console.log("Raw education data sample: ", rawData[0]);
    
    // Find the education column
    const educationKey = Object.keys(rawData[0]).find(key => 
      key.toLowerCase().includes("schooling") || key.toLowerCase().includes("value")
    );
    if (!educationKey) {
      console.error("Could not determine education column key.");
      return [];
    }
    
    const entities = Array.from(new Set(rawData.map(d => d.Entity)));
    let targetEntity = "World";
    if (!entities.includes(targetEntity)) {
      targetEntity = entities[0];
      console.warn("Entity 'World' not found, using:", targetEntity);
    }
    
    return rawData
      .filter(d => d.Entity === targetEntity)
      .map(d => ({
        year: +d.Year,
        value: +d[educationKey],
        entity: d.Entity
      }))
      .filter(d => !isNaN(d.year) && !isNaN(d.value))
      .sort((a, b) => a.year - b.year);
      
  } catch (error) {
    console.error('Error loading education data:', error);
    return null;
  }
};