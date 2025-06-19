import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import { create } from 'zustand';

// Define the shape of an audio file asset
interface AudioFile extends MediaLibrary.Asset {
  // You can add any custom properties here if needed
}

// Define the state and actions for the store
interface AudioState {
  audioFiles: AudioFile[];
  permissionGranted: boolean;
  musicFavourite: AudioFile[];
  setFavourites: (favourites: AudioFile[]) => Promise<void>;
  loadFavourites: () => Promise<void>;
  getPermissions: () => Promise<boolean>;
  loadAudioFiles: () => Promise<void>;
}

const useAudioStore = create<AudioState>((set, get) => ({
  audioFiles: [],
  permissionGranted: false,
  musicFavourite: [],
  setFavourites: async (favourites) => {
    set({ musicFavourite: favourites });
    await AsyncStorage.setItem('favourites', JSON.stringify(favourites));
  },
  loadFavourites: async () => {
    try {
      const favourites = await AsyncStorage.getItem('favourites');
      if (favourites) {
        set({ musicFavourite: JSON.parse(favourites) });
      }
    } catch (error) {
      console.error("Failed to load favourites.", error);
    }
  },
  getPermissions: async () => {
    const permission = await MediaLibrary.getPermissionsAsync();
    if (permission.granted) {
      set({ permissionGranted: true });
      return true;
    }
    try {
      const request = await MediaLibrary.requestPermissionsAsync();
      if (request.granted) {
        set({ permissionGranted: true });
        return true;
      }
    } catch (error) {
        console.error("Failed to request permissions.", error);
    }
    set({ permissionGranted: false });
    return false;
  },
  loadAudioFiles: async () => {
    const hasPermission = get().permissionGranted;
    if (!hasPermission) return;

    try {
        let media = await MediaLibrary.getAssetsAsync({
            mediaType: 'audio',
            first: 1000, // Limiting for performance, adjust as needed
        });
        
        // Sort files alphabetically by title
        const sortedAssets = media.assets.sort((a, b) => {
            const titleA = a.filename.toUpperCase();
            const titleB = b.filename.toUpperCase();
            if (titleA < titleB) return -1;
            if (titleA > titleB) return 1;
            return 0;
        });

        set({ audioFiles: sortedAssets });
    } catch (error) {
        console.error("Failed to load audio files.", error);
    }
  },
}));

export default useAudioStore;