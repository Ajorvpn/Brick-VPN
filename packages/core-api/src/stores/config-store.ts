import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { ParsedServer } from '../config-parser';

interface ConfigState {
  servers: ParsedServer[];
  activeServerId: string | null;
  activeConfig: string | null;
  addServers: (servers: ParsedServer[]) => void;
  setActiveServer: (serverId: string | null) => void;
  setActiveConfig: (config: string | null) => void;
  removeServer: (serverId: string) => void;
  clearServers: () => void;
}

const noopStorage: StateStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

let currentStorage: StateStorage = noopStorage;

const createConfigStore = () =>
  create<ConfigState>()(
    persist(
      (set) => ({
        servers: [],
        activeServerId: null,
        activeConfig: null,
        addServers: (servers) => set((state) => ({ servers: [...state.servers, ...servers] })),
        setActiveServer: (serverId) => set({ activeServerId: serverId }),
        setActiveConfig: (config) => set({ activeConfig: config }),
        removeServer: (serverId) =>
          set((state) => {
            const servers = state.servers.filter((server) => server.id !== serverId);
            const activeServerRemoved = state.activeServerId === serverId;
            return {
              servers,
              ...(activeServerRemoved ? { activeServerId: null, activeConfig: null } : {}),
            };
          }),
        clearServers: () => set({ servers: [], activeServerId: null, activeConfig: null }),
      }),
      {
        name: 'brick-config-store',
        storage: createJSONStorage(() => currentStorage),
      },
    ),
  );

export const useConfigStore = createConfigStore();

export const configureConfigStorage = (storage: StateStorage = noopStorage) => {
  currentStorage = storage;
};
