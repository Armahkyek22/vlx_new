import AntDesign from '@expo/vector-icons/AntDesign';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Music2Icon } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import useAudioControlStore from '../store/useAudioControl';
import useAudioStore from '../store/useAudioStore';
import useLayoutStore from '../store/useLayoutStore';

const BottomPlayer = () => {
  const { play, status, pause, next, currentIndex, playlist } = useAudioControlStore();
  const { audioFiles } = useAudioStore();
  const { setBottomPlayerHeight } = useLayoutStore();

  // If there's no playlist, don't render anything
  if (!playlist || playlist.length === 0) {
    return null;
  }

  const activeSongInfo = playlist?.[currentIndex];
  const currentTrack = audioFiles.find((e) => e.uri === activeSongInfo?.uri);

  // Render nothing if the track isn't found in our audio files list
  if (!currentTrack) {
    return null;
  }

  const isPlaying = status?.isLoaded && status.isPlaying;

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        setBottomPlayerHeight(e.nativeEvent.layout.height);
      }}
    >
      {/* Album art */}
      {currentTrack?.artwork ? (
        <Image
          source={{ uri: currentTrack.artwork }}
          style={styles.albumArt}
        />
      ) : (
        <View style={styles.picContainer}>
          <Music2Icon size={30} color="#fff" />
        </View>
      )}

      {/* Track info */}
      <TouchableOpacity
        onPress={() => router.push('/player')}
        style={styles.trackInfo}
      >
        <Text style={styles.trackTitle} numberOfLines={1}>
          {currentTrack?.filename.replace(/\.[^/.]+$/, "") || 'Unknown Title'}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {currentTrack?.artist || 'Unknown Artist'}
        </Text>
      </TouchableOpacity>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable
          onPress={() => (isPlaying ? pause() : play())}
          style={styles.controlButton}
        >
          {isPlaying ? (
            <AntDesign name="pause" size={24} color="#fff" />
          ) : (
            <AntDesign name="play" size={24} color="#fff" />
          )}
        </Pressable>

        <Pressable onPress={next} style={styles.controlButton}>
          <Ionicons name="play-skip-forward" size={24} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#282828',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: '#121212',
  },
  picContainer: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  albumArt: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
    marginRight: 10,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  trackArtist: {
    color: '#b3b3b3',
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    minWidth: 80,
  },
  controlButton: {
    padding: 8,
  },
});

export default BottomPlayer;