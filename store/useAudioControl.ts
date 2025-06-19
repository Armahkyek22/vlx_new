import { Audio, AVPlaybackStatus } from 'expo-av';
import { create } from 'zustand';

// Define the shape of a playlist item
interface PlaylistItem {
  uri: string;
}

// Define the state and actions for the control store
interface AudioControlState {
  playlist: PlaylistItem[];
  currentIndex: number;
  isPlaying: boolean;
  playbackInstance: Audio.Sound | null;
  status: AVPlaybackStatus | null;
  setPlaylist: (playlist: PlaylistItem[], startIndex?: number) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  stop: () => Promise<void>;
}

const useAudioControlStore = create<AudioControlState>((set, get) => ({
  playlist: [],
  currentIndex: 0,
  isPlaying: false,
  playbackInstance: null,
  status: null,

  setPlaylist: async (playlist, startIndex = 0) => {
    const { playbackInstance, stop } = get();
    if (playbackInstance) {
      await stop();
    }
    set({ playlist, currentIndex: startIndex });
  },

  play: async () => {
    const { playlist, currentIndex, playbackInstance, status } = get();
    if (!playlist.length) return;

    const currentTrack = playlist[currentIndex];
    if (!currentTrack) return;

    try {
      if (playbackInstance) {
        if (status?.isLoaded && !status.isPlaying) {
          await playbackInstance.playAsync();
          set({ isPlaying: true });
        }
      } else {
        const { sound, status: newStatus } = await Audio.Sound.createAsync(
          { uri: currentTrack.uri },
          { shouldPlay: true },
          (statusUpdate) => {
            if (statusUpdate.isLoaded && statusUpdate.didJustFinish) {
              get().next();
            }
            set({ status: statusUpdate });
          }
        );
        set({ playbackInstance: sound, isPlaying: true, status: newStatus });
      }
    } catch (error) {
      console.error("Failed to play audio", error);
    }
  },

  pause: async () => {
    const { playbackInstance } = get();
    if (playbackInstance) {
      await playbackInstance.pauseAsync();
      set({ isPlaying: false });
    }
  },

  next: async () => {
    const { playlist, currentIndex, stop } = get();
    const nextIndex = (currentIndex + 1) % playlist.length;
    await stop();
    set({ currentIndex: nextIndex });
    await get().play();
  },

  previous: async () => {
    const { playlist, currentIndex, stop } = get();
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    await stop();
    set({ currentIndex: prevIndex });
    await get().play();
  },

  stop: async () => {
    const { playbackInstance } = get();
    if (playbackInstance) {
      await playbackInstance.unloadAsync();
      set({ playbackInstance: null, isPlaying: false, status: null });
    }
  },
}));

export default useAudioControlStore;