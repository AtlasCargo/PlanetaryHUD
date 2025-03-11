import { csv } from 'd3-fetch';

/**
 * loadDataset function: Fetches data based on the dataset ID.
 * Make sure that the dataset id passed here exactly matches one of our cases.
 *
 * @param {string} datasetID - Identifier for the dataset.
 * @returns {Promise<Array>|null} - Processed data or null on error.
 */
export const loadDataset = async (datasetID) => {
  console.log("loadDataset called with datasetID:", datasetID);
  switch (datasetID) {
    case 'population':
      return await loadPopulationData();
    case 'life-expectancy':
      return await loadLifeExpectancyData();
    default:
      throw new Error(`Unknown dataset: ${datasetID}`);
  }
};

/**
 * loadPopulationData: Loads and processes the population CSV.
 */
export const loadPopulationData = async () => {
  try {
    // Fetch the CSV using the public URL (handled by CRA).
    const rawData = await csv(`${process.env.PUBLIC_URL}/data/population.csv`);
    
    // Extract all unique entities (regions/countries)
    const entities = [...new Set(rawData.map(d => d.Entity))];
    console.log("Available entities:", entities.slice(0, 20));
    
    // Map population data - include all entities, not just World
    const filteredData = rawData
      .map(d => ({
        year: +d.Year,
        population: +d['Population (historical)'],
        entity: d.Entity,
        value: +d['Population (historical)'] // Add value for consistency
      }))
      .filter(d => !isNaN(d.year) && !isNaN(d.population) && d.population > 0)
      .sort((a, b) => a.year - b.year);

    return filteredData;
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
    console.log("Entities in life expectancy data:", entities.slice(0, 20));
    
    // Process the raw CSV for all entities: convert fields to numbers,
    // filter out any invalid rows, and sort by year.
    const processedData = rawData
      .map(d => ({
        year: +d.Year,
        lifeExpectancy: +d[lifeExpKey],
        entity: d.Entity,
        value: +d[lifeExpKey] // Add value for consistency
      }))
      .filter(d => !isNaN(d.year) && !isNaN(d.lifeExpectancy) && d.lifeExpectancy > 0)
      .sort((a, b) => a.year - b.year);
      
    return processedData;
  } catch (error) {
    console.error('Error loading life expectancy data:', error);
    return null;
  }
}; 

/**
 * getAvailableDatasets: Returns a list of available datasets with metadata.
 * @returns {Promise<Array>} - Array of dataset objects with id, title, and description.
 */
export const getAvailableDatasets = async () => {
  try {
    // Return a static list of available datasets
    return [
      {
        id: 'population',
        title: 'World Population',
        description: 'Historical population data from various sources',
        type: 'time-series',
        supportedViews: ['graph', 'globe']
      },
      {
        id: 'life-expectancy',
        title: 'Life Expectancy',
        description: 'Life expectancy at birth over time',
        type: 'time-series',
        supportedViews: ['graph', 'globe']
      }
    ];
  } catch (error) {
    console.error('Error getting available datasets:', error);
    return [];
  }
};