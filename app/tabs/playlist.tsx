import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Toast from 'react-native-root-toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import useThemeStore from '../../store/theme';

const PLAYLISTS_KEY = 'VIDEO_LIBRARY_PLAYLISTS';
const VIDEOS_KEY = 'VIDEO_LIBRARY_VIDEOS';

type Playlist = {
  id: string;
  name: string;
  videoIds: string[];
  createdAt: number;
};

type VideoItem = {
  id: string;
  uri: string;
  name: string;
  duration: string;
};

type SortMode = 'name' | 'date' | 'count';

function showToast(message: string, duration: number = 2000) {
  Toast.show(message, {
    duration,
    position: Toast.positions.BOTTOM,
    shadow: true,
    animation: true,
    hideOnPress: true,
    backgroundColor: '#222',
    textColor: '#fff',
    opacity: 0.95,
  });
}

export default function PlaylistTab() {
  const { themeColors } = useThemeStore();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [renamePlaylistName, setRenamePlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistVideosVisible, setPlaylistVideosVisible] = useState(false);
  const [playlistVideos, setPlaylistVideos] = useState<VideoItem[]>([]);
  const [playerVideo, setPlayerVideo] = useState<VideoItem | null>(null);
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
  const [playlistSearch, setPlaylistSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);

  // Load playlists and videos when focused
  useFocusEffect(
    useCallback(() => {
      loadPlaylists();
      loadVideos();
    }, [])
  );

  const loadPlaylists = async () => {
    const stored = await AsyncStorage.getItem(PLAYLISTS_KEY);
    setPlaylists(stored ? JSON.parse(stored) : []);
  };

  const loadVideos = async () => {
    const stored = await AsyncStorage.getItem(VIDEOS_KEY);
    setVideos(stored ? JSON.parse(stored) : []);
  };

  const savePlaylists = async (newPlaylists: Playlist[]) => {
    setPlaylists(newPlaylists);
    await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(newPlaylists));
  };

  // Create Playlist
  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) {
      showToast('Playlist name cannot be empty.');
      return;
    }
    if (playlists.some((p) => p.name.toLowerCase() === newPlaylistName.trim().toLowerCase())) {
      showToast('A playlist with this name already exists.');
      return;
    }
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: newPlaylistName.trim(),
      videoIds: [],
      createdAt: Date.now(),
    };
    const updated = [newPlaylist, ...playlists];
    savePlaylists(updated);
    setCreateModalVisible(false);
    setNewPlaylistName('');
    showToast('Playlist created!');
  };

  // Rename Playlist
  const handleRenamePlaylist = () => {
    if (!renamePlaylistName.trim()) {
      showToast('Playlist name cannot be empty.');
      return;
    }
    if (playlists.some((p) =>
      p.name.toLowerCase() === renamePlaylistName.trim().toLowerCase() &&
      p.id !== selectedPlaylist?.id
    )) {
      showToast('A playlist with this name already exists.');
      return;
    }
    const updated = playlists.map((p) =>
      p.id === selectedPlaylist?.id ? { ...p, name: renamePlaylistName.trim() } : p
    );
    savePlaylists(updated);
    setRenameModalVisible(false);
    setSelectedPlaylist(null);
    setRenamePlaylistName('');
    showToast('Playlist renamed!');
  };

  // Delete Playlist
  const handleDeletePlaylist = (playlist: Playlist) => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = playlists.filter((p) => p.id !== playlist.id);
            savePlaylists(updated);
            showToast('Playlist deleted!');
          },
        },
      ]
    );
  };

  // Open Playlist Videos Modal
  const openPlaylistVideos = async (playlist: Playlist) => {
    const storedVideos = await AsyncStorage.getItem(VIDEOS_KEY);
    const allVideos: VideoItem[] = storedVideos ? JSON.parse(storedVideos) : [];
    const filtered = allVideos.filter((v) => playlist.videoIds.includes(v.id));
    setSelectedPlaylist(playlist);
    setPlaylistVideos(filtered);
    setPlaylistVideosVisible(true);
    setSelectMode(false);
    setSelectedVideos([]);
  };

  // Remove video(s) from playlist
  const handleRemoveFromPlaylist = async (videoIds: string[]) => {
    if (!selectedPlaylist) return;
    const updatedPlaylists = playlists.map((p) =>
      p.id === selectedPlaylist.id
        ? { ...p, videoIds: p.videoIds.filter((id) => !videoIds.includes(id)) }
        : p
    );
    await savePlaylists(updatedPlaylists);
    // Refresh playlist videos
    const storedVideos = await AsyncStorage.getItem(VIDEOS_KEY);
    const allVideos: VideoItem[] = storedVideos ? JSON.parse(storedVideos) : [];
    const filtered = allVideos.filter((v) =>
      updatedPlaylists.find((p) => p.id === selectedPlaylist.id)?.videoIds.includes(v.id)
    );
    setPlaylistVideos(filtered);
    setSelectedVideos([]);
    showToast(videoIds.length > 1 ? 'Videos removed!' : 'Video removed!');
  };

  // Select/deselect videos for bulk actions
  const toggleSelectVideo = (id: string) => {
    setSelectedVideos((prev) =>
      prev.includes(id) ? prev.filter((vid) => vid !== id) : [...prev, id]
    );
  };

  // Sorting and filtering
  const getSortedPlaylists = () => {
    let filtered = playlists.filter((pl) =>
      pl.name.toLowerCase().includes(playlistSearch.toLowerCase())
    );
    if (sortMode === 'name') {
      filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'date') {
      filtered = filtered.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortMode === 'count') {
      filtered = filtered.sort((a, b) => b.videoIds.length - a.videoIds.length);
    }
    return filtered;
  };

  // Render each playlist in the list
  const renderPlaylist = ({ item }: { item: Playlist }) => (
    <TouchableOpacity
      style={[styles.playlistCard, { backgroundColor: themeColors.sectionBackground }]}
      onPress={() => openPlaylistVideos(item)}
      activeOpacity={0.85}
    >
      <Ionicons name="albums" size={32} color={themeColors.primary} style={{ marginRight: 16 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.playlistName, { color: themeColors.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.playlistCount, { color: themeColors.tabIconColor }]}>{item.videoIds.length} videos</Text>
      </View>
      <TouchableOpacity
        onPress={() => {
          setSelectedPlaylist(item);
          setRenamePlaylistName(item.name);
          setRenameModalVisible(true);
        }}
        style={styles.iconButton}
      >
        <Ionicons name="create-outline" size={22} color={themeColors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleDeletePlaylist(item)}
        style={styles.iconButton}
      >
        <Ionicons name="trash-outline" size={22} color="#FF5555" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render each video in the playlist modal
  const renderPlaylistVideo = ({ item }: { item: VideoItem }) => {
    const selected = selectedVideos.includes(item.id);
    return (
      <View style={[
        styles.playlistVideoCard,
        { borderColor: selected ? themeColors.primary : themeColors.sectionBackground },
        selected && { borderWidth: 2 }
      ]}>
        <TouchableOpacity
          style={styles.playlistVideoThumbContainer}
          onPress={() => {
            if (selectMode) {
              toggleSelectVideo(item.id);
            } else {
              setPlayerVideo(item);
              setVideoPlayerVisible(true);
            }
          }}
          onLongPress={() => {
            setSelectMode(true);
            toggleSelectVideo(item.id);
          }}
          activeOpacity={0.85}
        >
          <Video
            source={{ uri: item.uri }}
            style={styles.playlistVideoThumb}
            resizeMode="cover"
            shouldPlay={false}
            isMuted
          />
          <View style={styles.playlistVideoOverlay}>
            <Text style={[styles.playlistVideoTitle, { color: themeColors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.playlistVideoDuration, { color: themeColors.primary }]}>
              {item.duration}
            </Text>
          </View>
          <Ionicons
            name="play-circle"
            size={36}
            color={themeColors.primary}
            style={styles.playlistVideoPlayIcon}
          />
          {selectMode && (
            <Ionicons
              name={selected ? "checkbox" : "square-outline"}
              size={26}
              color={themeColors.primary}
              style={styles.bulkCheckbox}
            />
          )}
        </TouchableOpacity>
        {!selectMode && (
          <TouchableOpacity
            style={styles.removeIcon}
            onPress={() => handleRemoveFromPlaylist([item.id])}
          >
            <Ionicons name="close-circle" size={24} color="#FF5555" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <LinearGradient
      colors={[
        themeColors.background,
        themeColors.sectionBackground,
        themeColors.background
      ]}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Text style={[styles.appName, { color: themeColors.primary, fontSize: 30, fontWeight: 'bold' }]}>Playlists</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setCreateModalVisible(true)}
            >
              <Ionicons name="add" size={28} color={themeColors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setSortMode(
                sortMode === 'name' ? 'date' : sortMode === 'date' ? 'count' : 'name'
              )}
            >
              <Ionicons name="filter" size={24} color={themeColors.text} />
            </TouchableOpacity>
          </View>
        </View>
        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: themeColors.sectionBackground }]}>
          <Ionicons name="search" size={20} color={themeColors.tabIconColor} style={{ marginHorizontal: 6 }} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.text }]}
            value={playlistSearch}
            onChangeText={setPlaylistSearch}
            placeholder="Search playlists..."
            placeholderTextColor={themeColors.tabIconColor}
          />
        </View>
        {/* Playlist List */}
        <FlatList
          data={getSortedPlaylists()}
          keyExtractor={(item) => item.id}
          renderItem={renderPlaylist}
          contentContainerStyle={styles.playlistList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={82} color={themeColors.primary} style={{ marginTop: '50%' }} />
              <Text style={[styles.emptyText, { color: themeColors.text, fontSize: 25, fontWeight: 'bold' }]}>No Playlists Yet</Text>
              <Text style={[styles.emptyFooterText, { color: themeColors.primary, fontSize: 17, marginTop: 6 }]}>Tap the + button to create one</Text>
            </View>
          }
        />

        {/* Create Playlist Modal */}
        <Modal
          visible={createModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCreateModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <SafeAreaView style={styles.safeModalContainer}>
            <View style={[styles.modalInner, { backgroundColor: themeColors.sectionBackground }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Create Playlist</Text>
              <TextInput
                style={[styles.modalInput, { color: themeColors.text, borderColor: themeColors.primary }]}
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                placeholder="Playlist name"
                placeholderTextColor={themeColors.tabIconColor}
                autoFocus
                onSubmitEditing={handleCreatePlaylist}
                returnKeyType="done"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: themeColors.tabIconColor }]}
                  onPress={() => setCreateModalVisible(false)}
                >
                  <Text style={[styles.modalButtonText, { color: themeColors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: themeColors.primary }]}
                  onPress={handleCreatePlaylist}
                >
                  <Text style={[styles.modalButtonText, { color: themeColors.text }]}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Rename Playlist Modal */}
        <Modal
          visible={renameModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setRenameModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <SafeAreaView style={styles.safeModalContainer}>
            <View style={[styles.modalInner, { backgroundColor: themeColors.sectionBackground }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Rename Playlist</Text>
              <TextInput
                style={[styles.modalInput, { color: themeColors.text, borderColor: themeColors.primary }]}
                value={renamePlaylistName}
                onChangeText={setRenamePlaylistName}
                placeholder="Playlist name"
                placeholderTextColor={themeColors.tabIconColor}
                autoFocus
                onSubmitEditing={handleRenamePlaylist}
                returnKeyType="done"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: themeColors.tabIconColor }]}
                  onPress={() => setRenameModalVisible(false)}
                >
                  <Text style={[styles.modalButtonText, { color: themeColors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: themeColors.primary }]}
                  onPress={handleRenamePlaylist}
                >
                  <Text style={[styles.modalButtonText, { color: themeColors.text }]}>Rename</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Playlist Videos Modal */}
        <Modal
          visible={playlistVideosVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPlaylistVideosVisible(false)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <SafeAreaView style={styles.safeModalContainer}>
            <View style={[styles.modalInner, { backgroundColor: themeColors.sectionBackground, flex: 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <TouchableOpacity onPress={() => setPlaylistVideosVisible(false)}>
                  <Ionicons name="arrow-back" size={28} color={themeColors.text} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: themeColors.text, marginLeft: 12 }]}>
                  {selectedPlaylist?.name}
                </Text>
                <View style={{ flex: 1 }} />
                {selectMode && (
                  <TouchableOpacity
                    onPress={() => {
                      handleRemoveFromPlaylist(selectedVideos);
                      setSelectMode(false);
                    }}
                    style={{ marginRight: 8 }}
                  >
                    <Ionicons name="trash" size={24} color="#FF5555" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setSelectMode(!selectMode)}
                  style={{ marginRight: 8 }}
                >
                  <Ionicons name={selectMode ? "close" : "checkbox-outline"} size={24} color={themeColors.primary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={playlistVideos}
                keyExtractor={(item) => item.id}
                renderItem={renderPlaylistVideo}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="videocam-off" size={72} color={themeColors.primary} style={{ marginBottom:16 }} />
                    <Text style={[styles.emptyText, { color: themeColors.text }]}>No Videos</Text>
                  </View>
                }
              />
            </View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
  },
  appName: {
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  iconButton: {
    padding: 6,
    marginLeft: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  playlistList: {
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  playlistName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  playlistCount: {
    fontSize: 13,
    fontWeight: '400',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyFooterText: {
    fontSize: 14,
    fontWeight: '400',
  },
  playlistVideoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    overflow: 'hidden',
  },
  playlistVideoThumbContainer: {
    flex: 1,
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  playlistVideoThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#000',
  },
  playlistVideoOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  playlistVideoTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  playlistVideoDuration: {
    fontSize: 12,
  },
  playlistVideoPlayIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -18,
    opacity: 0.7,
  },
  bulkCheckbox: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 6,
    padding: 2,
  },
  removeIcon: {
    marginLeft: 10,
    padding: 2,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  safeModalContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  modalInner: {
    marginHorizontal: 24,
    borderRadius: 14,
    padding: 20,
    alignItems: 'stretch',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    padding: 10,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});