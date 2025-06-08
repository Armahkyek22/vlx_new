import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Video } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type VideoItem = {
  id: string;
  uri: string;
  name: string;
  duration: string;
};

type Playlist = {
  id: string;
  name: string;
  videoIds: string[];
};

const THEME = {
  background: '#111017',
  accent: '#F44BF8',
  text: '#FFFFFF',
};

const STORAGE_KEY = 'VIDEO_LIBRARY_VIDEOS';
const PLAYLISTS_KEY = 'VIDEO_LIBRARY_PLAYLISTS';

export default function VideoTab() {
  const [activeTab, setActiveTab] = useState<'Videos' | 'Playlists'>('Videos');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [menuVideo, setMenuVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<Video>(null);

  // Playlist Picker states
  const [playlistPickerVisible, setPlaylistPickerVisible] = useState(false);
  const [playlistPickerVideo, setPlaylistPickerVideo] = useState<VideoItem | null>(null);
  const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([]);
  const [checkedPlaylists, setCheckedPlaylists] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setVideos(JSON.parse(stored));
    })();
  }, []);

  const saveVideos = async (newVideos: VideoItem[]) => {
    setVideos(newVideos);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newVideos));
  };

  // Get video duration using expo-av
  const getVideoDuration = async (uri: string) => {
    try {
      const videoObj = new Video();
      await videoObj.loadAsync({ uri }, {}, false);
      const status = await videoObj.getStatusAsync();
      await videoObj.unloadAsync();
      if (status.isLoaded && status.durationMillis) {
        const totalSeconds = Math.floor(status.durationMillis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      }
    } catch {
      // ignore error
    }
    return 'Unknown';
  };

  const handleAddVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'video/*' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true);
        const asset = result.assets[0];
        const duration = await getVideoDuration(asset.uri);
        setLoading(false);
        const newVideo: VideoItem = {
          id: Date.now().toString(),
          uri: asset.uri,
          name: asset.name ?? 'Untitled',
          duration,
        };
        const updated = [newVideo, ...videos];
        await saveVideos(updated);
        Alert.alert('Success', 'Video added!');
      }
    } catch (e) {
      setLoading(false);
      Alert.alert('Error', 'Could not add video');
    }
  };

  const handleRefresh = async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) setVideos(JSON.parse(stored));
    Alert.alert('Refreshed', 'Video list refreshed');
  };

  const handleVideoPress = (video: VideoItem) => {
    setSelectedVideo(video);
  };

  const handleBackToGrid = () => {
    setSelectedVideo(null);
  };

  // Long press to delete
  const handleVideoLongPress = (video: VideoItem) => {
    Alert.alert(
      'Delete Video',
      `Are you sure you want to delete "${video.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = videos.filter((v) => v.id !== video.id);
            saveVideos(updated);
            if (selectedVideo?.id === video.id) setSelectedVideo(null);
            Alert.alert('Deleted', 'Video deleted.');
          },
        },
      ]
    );
  };

  // Menu for rename/delete (player view)
  const handleMenuPress = () => {
    if (selectedVideo) setMenuVisible(true);
    else Alert.alert('No video selected', 'Select a video to use the menu.');
  };

  const handleRename = () => {
    setRenameText(selectedVideo?.name ?? '');
    setMenuVisible(false);
    setRenameModalVisible(true);
  };

  const handleRenameSubmit = () => {
    if (!renameText.trim()) {
      Alert.alert('Invalid name', 'Name cannot be empty.');
      return;
    }
    const updated = videos.map((v) =>
      v.id === selectedVideo?.id ? { ...v, name: renameText.trim() } : v
    );
    saveVideos(updated);
    setSelectedVideo((prev) =>
      prev ? { ...prev, name: renameText.trim() } : prev
    );
    setRenameModalVisible(false);
    Alert.alert('Renamed', 'Video renamed.');
  };

  // Menu for rename/delete (grid view)
  const handleGridRename = () => {
    setRenameText(menuVideo?.name ?? '');
    setRenameModalVisible(true);
    setSelectedVideo(menuVideo);
    setMenuVideo(null);
  };

  // Search functionality
  const handleSearchPress = () => {
    setSearchActive((prev) => !prev);
    setSearchQuery('');
  };

  const filteredVideos = searchQuery
    ? videos.filter((v) =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : videos;

  // Playlist Picker Logic
  const openPlaylistPicker = async (video: VideoItem) => {
    const stored = await AsyncStorage.getItem(PLAYLISTS_KEY);
    const playlists: Playlist[] = stored ? JSON.parse(stored) : [];
    setAllPlaylists(playlists);
    setCheckedPlaylists(
      playlists.filter(pl => pl.videoIds.includes(video.id)).map(pl => pl.id)
    );
    setPlaylistPickerVideo(video);
    setPlaylistPickerVisible(true);
  };

  const togglePlaylistCheck = (id: string) => {
    setCheckedPlaylists((prev) =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleSaveToPlaylists = async () => {
    if (!playlistPickerVideo) return;
    const updatedPlaylists = allPlaylists.map(pl => {
      let videoIds = pl.videoIds.filter(id => id !== playlistPickerVideo.id);
      if (checkedPlaylists.includes(pl.id)) {
        videoIds = [...videoIds, playlistPickerVideo.id];
      }
      return { ...pl, videoIds };
    });
    await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updatedPlaylists));
    setPlaylistPickerVisible(false);
    setPlaylistPickerVideo(null);
  };

  const renderVideoItem = ({ item }: { item: VideoItem }) => (
    <View style={styles.videoItem}>
      <TouchableOpacity
        style={styles.menuIcon}
        onPress={() => setMenuVideo(item)}
      >
        <Ionicons name="ellipsis-vertical" size={22} color={THEME.text} />
      </TouchableOpacity>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={() => handleVideoPress(item)}
        onLongPress={() => handleVideoLongPress(item)}
        delayLongPress={400}
      >
        <View style={styles.cardContainer}>
          <Video
            source={{ uri: item.uri }}
            style={styles.cardVideo}
            resizeMode="cover"
            shouldPlay={false}
            isMuted
          />
          <View style={styles.cardOverlay}>
            <Text style={styles.videoTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.videoDuration}>{item.duration}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  // Video Player UI
  if (selectedVideo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBackToGrid} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={THEME.text} />
          </TouchableOpacity>
          <Text style={styles.appName} numberOfLines={1}>
            {selectedVideo.name}
          </Text>
          <TouchableOpacity onPress={handleMenuPress} style={styles.iconButton}>
            <Ionicons name="ellipsis-vertical" size={24} color={THEME.text} />
          </TouchableOpacity>
        </View>
        <Video
          ref={videoRef}
          source={{ uri: selectedVideo.uri }}
          style={styles.video}
          useNativeControls
          resizeMode="contain"
          shouldPlay
        />
        <Text style={styles.uri}>{selectedVideo.uri}</Text>

        {/* Menu Modal (Player) */}
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <View style={styles.menuModal}>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={handleRename}
            >
              <Text style={styles.menuOptionText}>Rename Video</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                setMenuVisible(false);
                handleVideoLongPress(selectedVideo);
              }}
            >
              <Text style={[styles.menuOptionText, { color: '#FF5555' }]}>
                Delete Video
              </Text>
            </TouchableOpacity>
            {/* Add to Playlist option */}
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                setMenuVisible(false);
                openPlaylistPicker(selectedVideo);
              }}
            >
              <Text style={styles.menuOptionText}>Add to Playlist</Text>
            </TouchableOpacity>
          </View>
        </Modal>
        {/* Rename Modal */}
        <Modal
          visible={renameModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setRenameModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <View style={styles.renameModal}>
            <Text style={styles.renameTitle}>Rename Video</Text>
            <TextInput
              style={styles.renameInput}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Enter new name"
              placeholderTextColor="#888"
              autoFocus
              onSubmitEditing={handleRenameSubmit}
              returnKeyType="done"
            />
            <View style={styles.renameButtons}>
              <TouchableOpacity
                style={styles.renameButton}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={styles.renameButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.renameButton, { backgroundColor: THEME.accent }]}
                onPress={handleRenameSubmit}
              >
                <Text style={[styles.renameButtonText, { color: '#111017' }]}>
                  Rename
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* Playlist Picker Modal */}
        <Modal
          visible={playlistPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPlaylistPickerVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setPlaylistPickerVisible(false)}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <SafeAreaView style={styles.safeModalContainer}>
            <View style={styles.modalInner}>
              <Text style={styles.modalTitle}>Add to Playlist</Text>
              <FlatList
                data={allPlaylists}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                    onPress={() => togglePlaylistCheck(item.id)}
                  >
                    <Ionicons
                      name={
                        checkedPlaylists.includes(item.id)
                          ? 'checkbox'
                          : 'square-outline'
                      }
                      size={24}
                      color={THEME.accent}
                    />
                    <Text style={{ color: THEME.text, marginLeft: 12, fontSize: 16 }}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={{ color: '#888', marginTop: 20 }}>
                    No playlists. Create one first!
                  </Text>
                }
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setPlaylistPickerVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: THEME.accent }]}
                  onPress={handleSaveToPlaylists}
                >
                  <Text style={[styles.modalButtonText, { color: '#111017' }]}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }

  // Video Grid UI
  return (
    <SafeAreaView style={styles.container}>
      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* Top Bar */}
      <View style={styles.topBar}>
        {searchActive ? (
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search videos..."
            placeholderTextColor="#888"
            autoFocus
          />
        ) : (
          <Text style={styles.appName}>Video Library</Text>
        )}
        <View style={styles.topBarIcons}>
          <TouchableOpacity
            onPress={handleSearchPress}
            style={styles.iconButton}
          >
            <Ionicons name="search" size={24} color={THEME.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.iconButton}
          >
            <Ionicons name="refresh" size={24} color={THEME.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Toggle */}
      <View style={styles.tabToggle}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'Videos' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('Videos')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'Videos' && styles.tabTextActive,
            ]}
          >
            Videos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'Playlists' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('Playlists')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'Playlists' && styles.tabTextActive,
            ]}
          >
            Playlists
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'Videos' ? (
        <FlatList
          data={filteredVideos}
          keyExtractor={(item) => item.id}
          renderItem={renderVideoItem}
          numColumns={2}
          contentContainerStyle={styles.grid}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No videos uploaded.</Text>
          }
        />
      ) : (
        <View style={styles.emptyTab}>
          <Text style={styles.emptyText}>No playlists yet.</Text>
        </View>
      )}

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddVideo}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Grid Menu Modal */}
      <Modal
        visible={!!menuVideo}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVideo(null)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVideo(null)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.menuModal}>
          <TouchableOpacity
            style={styles.menuOption}
            onPress={handleGridRename}
          >
            <Text style={styles.menuOptionText}>Rename Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuOption}
            onPress={() => {
              setMenuVideo(null);
              handleVideoLongPress(menuVideo!);
            }}
          >
            <Text style={[styles.menuOptionText, { color: '#FF5555' }]}>
              Delete Video
            </Text>
          </TouchableOpacity>
          {/* Add to Playlist option */}
          <TouchableOpacity
            style={styles.menuOption}
            onPress={() => {
              setMenuVideo(null);
              openPlaylistPicker(menuVideo!);
            }}
          >
            <Text style={styles.menuOptionText}>Add to Playlist</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      {/* Rename Modal (shared) */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.renameModal}>
          <Text style={styles.renameTitle}>Rename Video</Text>
          <TextInput
            style={styles.renameInput}
            value={renameText}
            onChangeText={setRenameText}
            placeholder="Enter new name"
            placeholderTextColor="#888"
            autoFocus
            onSubmitEditing={handleRenameSubmit}
            returnKeyType="done"
          />
          <View style={styles.renameButtons}>
            <TouchableOpacity
              style={styles.renameButton}
              onPress={() => setRenameModalVisible(false)}
            >
              <Text style={styles.renameButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.renameButton, { backgroundColor: THEME.accent }]}
              onPress={handleRenameSubmit}
            >
              <Text style={[styles.renameButtonText, { color: '#111017' }]}>
                Rename
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Playlist Picker Modal */}
      <Modal
        visible={playlistPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPlaylistPickerVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setPlaylistPickerVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <SafeAreaView style={styles.safeModalContainer}>
          <View style={styles.modalInner}>
            <Text style={styles.modalTitle}>Add to Playlist</Text>
            <FlatList
              data={allPlaylists}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                  onPress={() => togglePlaylistCheck(item.id)}
                >
                  <Ionicons
                    name={
                      checkedPlaylists.includes(item.id)
                        ? 'checkbox'
                        : 'square-outline'
                    }
                    size={24}
                    color={THEME.accent}
                  />
                  <Text style={{ color: THEME.text, marginLeft: 12, fontSize: 16 }}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ color: '#888', marginTop: 20 }}>
                  No playlists. Create one first!
                </Text>
              }
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setPlaylistPickerVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: THEME.accent }]}
                onPress={handleSaveToPlaylists}
              >
                <Text style={[styles.modalButtonText, { color: '#111017' }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: THEME.background,
  },
  appName: { color: THEME.text, fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  topBarIcons: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginLeft: 16 },
  tabToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 8,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginHorizontal: 8,
    backgroundColor: 'transparent',
  },
  tabButtonActive: { backgroundColor: THEME.accent },
  tabText: { color: THEME.text, fontSize: 16 },
  tabTextActive: { color: THEME.background, fontWeight: 'bold' },
  grid: { padding: 16 },
  videoItem: {
    flex: 1,
    backgroundColor: '#1a1922',
    margin: 8,
    borderRadius: 12,
    alignItems: 'center',
    padding: 0,
    position: 'relative',
    minHeight: 0,
  },
  menuIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    padding: 4,
    backgroundColor: 'rgba(17,16,23,0.7)',
    borderRadius: 16,
  },
  cardContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#222',
    marginBottom: 8,
  },
  cardVideo: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(17,16,23,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'flex-start',
  },
  videoTitle: {
    color: THEME.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  videoDuration: {
    color: THEME.accent,
    fontSize: 12,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  emptyTab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: THEME.accent,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  video: {
    width: Dimensions.get('window').width * 0.9,
    height: 250,
    backgroundColor: '#000',
    borderRadius: 12,
    alignSelf: 'center',
    marginTop: 24,
  },
  uri: { color: '#aaa', fontSize: 12, marginTop: 16, textAlign: 'center' },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menuModal: {
    position: 'absolute',
    right: 24,
    top: Platform.OS === 'android' ? 60 : 100,
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  menuOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  menuOptionText: {
    color: THEME.text,
    fontSize: 16,
  },
  renameModal: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '40%',
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  renameTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  renameInput: {
    backgroundColor: '#333',
    color: THEME.text,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  renameButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  renameButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#333',
    marginLeft: 12,
  },
  renameButtonText: {
    color: THEME.text,
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#222',
    color: THEME.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    height: 40,
    marginRight: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: 'bold',
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
    maxHeight: '80%',
  },
  modalTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: 'bold',
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
});