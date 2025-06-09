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

const THEME = {
  background: '#111017',
  accent: '#F44BF8',
  text: '#FFFFFF',
};

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
      style={styles.playlistCard}
      onPress={() => openPlaylistVideos(item)}
      activeOpacity={0.85}
    >
      <Ionicons name="albums" size={32} color={THEME.accent} style={{ marginRight: 16 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.playlistName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.playlistCount}>{item.videoIds.length} videos</Text>
      </View>
      <TouchableOpacity
        onPress={() => {
          setSelectedPlaylist(item);
          setRenamePlaylistName(item.name);
          setRenameModalVisible(true);
        }}
        style={styles.iconButton}
      >
        <Ionicons name="create-outline" size={22} color={THEME.text} />
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
      <View style={[styles.playlistVideoCard, selected && { borderColor: THEME.accent, borderWidth: 2 }]}>
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
            <Text style={styles.playlistVideoTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.playlistVideoDuration}>{item.duration}</Text>
          </View>
          <Ionicons
            name="play-circle"
            size={36}
            color={THEME.accent}
            style={styles.playlistVideoPlayIcon}
          />
          {selectMode && (
            <Ionicons
              name={selected ? "checkbox" : "square-outline"}
              size={26}
              color={THEME.accent}
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
      '#18151f', // Almost black (top)
      '#232136', // Deep muted purple
      '#23243a', // Deep blue-purple (mid)
      '#29213a', // Slightly lighter but still dark (lower mid)
      '#16131d', // Near-black (bottom)
    ]}
    style={{ flex: 1 }}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
  >
    <SafeAreaView style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Text style={styles.appName}>Playlists</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setCreateModalVisible(true)}
            >
              <Ionicons name="add" size={28} color={THEME.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setSortMode(
                sortMode === 'name' ? 'date' : sortMode === 'date' ? 'count' : 'name'
              )}
            >
              <Ionicons name="funnel" size={24} color={THEME.text} />
            </TouchableOpacity>
          </View>
        </View>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#888" style={{ marginHorizontal: 6 }} />
          <TextInput
            style={styles.searchInput}
            value={playlistSearch}
            onChangeText={setPlaylistSearch}
            placeholder="Search playlists..."
            placeholderTextColor="#888"
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
              <Ionicons name="folder-open" size={72} color= {THEME.accent} style={{ marginBottom:16 }} />
              <Text style={styles.emptyText}>No Playlists Yet</Text>
              <Text style={styles.emptyFooterText}>Tap the + button to create one</Text>
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
            <View style={styles.modalInner}>
              <Text style={styles.modalTitle}>Create Playlist</Text>
              <TextInput
                style={styles.modalInput}
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                placeholder="Playlist name"
                placeholderTextColor="#888"
                autoFocus
                onSubmitEditing={handleCreatePlaylist}
                returnKeyType="done"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setCreateModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: THEME.accent }]}
                  onPress={handleCreatePlaylist}
                >
                  <Text style={[styles.modalButtonText, { color: '#111017' }]}>Create</Text>
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
            <View style={styles.modalInner}>
              <Text style={styles.modalTitle}>Rename Playlist</Text>
              <TextInput
                style={styles.modalInput}
                value={renamePlaylistName}
                onChangeText={setRenamePlaylistName}
                placeholder="New playlist name"
                placeholderTextColor="#888"
                autoFocus
                onSubmitEditing={handleRenamePlaylist}
                returnKeyType="done"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setRenameModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: THEME.accent }]}
                  onPress={handleRenamePlaylist}
                >
                  <Text style={[styles.modalButtonText, { color: '#111017' }]}>Rename</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Playlist Videos Modal */}
        <Modal
          visible={playlistVideosVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPlaylistVideosVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => {
            setPlaylistVideosVisible(false);
            setSelectMode(false);
            setSelectedVideos([]);
          }}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <SafeAreaView style={styles.safeModalContainer}>
            <View style={styles.modalInnerLarge}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.modalTitle}>
                  {selectedPlaylist?.name || 'Playlist'}
                </Text>
                <TouchableOpacity
                  style={{ marginLeft: 'auto' }}
                  onPress={() => {
                    setPlaylistVideosVisible(false);
                    setSelectMode(false);
                    setSelectedVideos([]);
                  }}
                >
                  <Ionicons name="close" size={28} color={THEME.text} />
                </TouchableOpacity>
                {playlistVideos.length > 0 && (
                  <TouchableOpacity
                    style={{ marginLeft: 8 }}
                    onPress={() => {
                      setSelectMode((s) => !s);
                      setSelectedVideos([]);
                    }}
                  >
                    <Ionicons name={selectMode ? "close" : "checkbox-outline"} size={26} color={THEME.accent} />
                  </TouchableOpacity>
                )}
              </View>
              {playlistVideos.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="videocam-off" size={56} color="#444" style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyText}>No videos in this playlist.</Text>
                </View>
              ) : (
                <>
                  {selectMode && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <TouchableOpacity
                        style={[styles.modalButton, { backgroundColor: THEME.accent }]}
                        onPress={() => handleRemoveFromPlaylist(selectedVideos)}
                        disabled={selectedVideos.length === 0}
                      >
                        <Text style={[styles.modalButtonText, { color: '#111017' }]}>
                          Remove {selectedVideos.length > 1 ? 'Videos' : 'Video'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <FlatList
                    data={playlistVideos}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPlaylistVideo}
                    numColumns={2}
                    contentContainerStyle={styles.playlistGrid}
                  />
                </>
              )}
            </View>
          </SafeAreaView>
        </Modal>

        {/* Video Player Modal */}
        <Modal
          visible={videoPlayerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setVideoPlayerVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setVideoPlayerVisible(false)}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <SafeAreaView style={styles.safeModalContainer}>
            <View style={styles.playerModalInner}>
              <TouchableOpacity
                style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}
                onPress={() => setVideoPlayerVisible(false)}
              >
                <Ionicons name="close" size={32} color={THEME.text} />
              </TouchableOpacity>
              {playerVideo && (
                <Video
                  source={{ uri: playerVideo.uri }}
                  style={styles.playerVideo}
                  useNativeControls
                  resizeMode="contain"
                  shouldPlay
                />
              )}
              <Text style={styles.playerVideoTitle} numberOfLines={1}>
                {playerVideo?.name}
              </Text>
            </View>
          </SafeAreaView>
        </Modal>
    </SafeAreaView>
 </LinearGradient> 
);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', height: '100%' },
  gradient: {
    flex: 3,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding:3,
    backgroundColor: 'transparent',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1,
    position: 'relative', 
    opacity: 0.9,
    borderBottomColor : 'rgba(255,255,255,0.1)',
    borderBottomWidth : 1,
    overflow : 'hidden',
    
  },
  appName: { color: THEME.text, fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'left', paddingLeft: 20},
  iconButton: { marginLeft: 12, padding: 4 },
  playlistList: { padding: 8 },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:' rgba(24, 21, 31, 0.8)',
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#f44bf8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    position: 'relative', 
    opacity: 0.9,
    borderBottomWidth : 0,
    overflow : 'visible',
    borderColor : 'rgba(24, 21, 31, 0.1)',
    borderWidth : 0,
  },
  playlistName: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  playlistCount: {
    color: '#aaa',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 180,
  },
  emptyText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 24,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  emptyFooterText: {
    color: '#aaa',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 2,
    paddingVertical: 5 ,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: THEME.text,
    fontSize: 15,
    padding: 0,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(40, 35, 35, 0.4)',
  },
  safeModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInner: {
    width: '90%',
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    maxWidth: 400,
  },
  modalInnerLarge: {
    width: '98%',
    maxWidth: 600,
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 18,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    maxHeight: '90%',
    alignSelf: 'center',
  },
  modalTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#333',
    color: THEME.text,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#333',
    marginLeft: 12,
  },
  modalButtonText: {
    color: THEME.text,
    fontSize: 16,
  },
  // Playlist Videos Grid
  playlistGrid: {
    padding: 4,
  },
  playlistVideoCard: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    elevation: 2,
    minWidth: 140,
    maxWidth: '48%',
    position: 'relative',
  },
  playlistVideoThumbContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistVideoThumb: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  playlistVideoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(17,16,23,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  playlistVideoTitle: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  playlistVideoDuration: {
    color: THEME.accent,
    fontSize: 11,
  },
  playlistVideoPlayIcon: {
    position: 'absolute',
    top: '40%',
    left: '40%',
    opacity: 0.85,
  },
  bulkCheckbox: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(17,16,23,0.7)',
    borderRadius: 8,
    padding: 2,
    zIndex: 2,
  },
  removeIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 2,
    backgroundColor: 'rgba(17,16,23,0.6)',
    borderRadius: 12,
    padding: 2,
  },
  playerModalInner: {
    width: '96%',
    maxWidth: 500,
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    maxHeight: '90%',
    alignSelf: 'center',
  },
  playerVideo: {
    width: '100%',
    height: 240,
    backgroundColor: '#000',
    borderRadius: 12,
    marginBottom: 14,
  },
  playerVideoTitle: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 6,
    marginBottom: 2,
    textAlign: 'center',
  },
});