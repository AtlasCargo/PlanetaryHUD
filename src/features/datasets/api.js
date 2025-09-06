import { loadDataset as rawLoadDataset, getAvailableDatasets as rawGetAvailableDatasets } from '../../utils/loadDataset';

// Thin wrapper to centralize dataset access; extend here as we grow DatasetController.
export const datasetsApi = {
  getAvailable: async () => {
    return await rawGetAvailableDatasets();
  },
  load: async (id) => {
    return await rawLoadDataset(id);
  }
};

export default datasetsApi;


