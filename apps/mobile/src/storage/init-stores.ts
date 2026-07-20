import { configureConfigStorage } from '@brick/core-api';
import { asyncStorageAdapter } from './async-storage-adapter';

export const initStores = () => {
  configureConfigStorage(asyncStorageAdapter);
};
