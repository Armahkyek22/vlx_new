import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Video } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Dimensions, FlatList,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback, useColorScheme, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const cardWidth = width / 2 - 22; // for 2 columns with spacing
const colorScheme = useColorScheme();
const THEME = colorScheme === 'dark'
  ? { background: '#111017', accent: '#F44BF8', text: '#FFFFFF' }
  : { background: '#FFFFFF', accent: '#F44BF8', text: '#111017' };

const STORAGE_KEY = 'VIDEO_LIBRARY_VIDEOS';
const PLAYLISTS_KEY = 'VIDEO_LIBRARY_PLAYLISTS';

type VideoItem = {
  id: string;
  uri: string;
  name: string;
  duration: string;
  subtitle?: string;
};

type Playlist = {
  id: string;
  name: string;
  videoIds: string[];
};

export default function VideoTab() {
  useEffect(() => {
    (async () => {
      await MediaLibrary.requestPermissionsAsync();
    })();
  }, []);

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [menuVideo, setMenuVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(false);

  // Playlist Picker states
  const [playlistPickerVisible, setPlaylistPickerVisible] = useState(false);
  const [playlistPickerVideo, setPlaylistPickerVideo] = useState<VideoItem | null>(null);
  const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([]);
  const [checkedPlaylists, setCheckedPlaylists] = useState<string[]>([]);

  // Refs for each video for fullscreen
  const videoRefs = useRef<{ [key: string]: Video | null }>({});

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
      const assetInfo = await MediaLibrary.getAssetInfoAsync(uri);
      console.log('Asset info:', assetInfo); // Add this line
      if (assetInfo && typeof assetInfo.duration === 'number' && assetInfo.duration > 0) {
        const totalSeconds = Math.floor(assetInfo.duration);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
    } catch (e) {
      console.error('Error getting video duration:', e);
    }
    return 'unknown';
  };
  // Add Video
  const handleAddVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'video/*' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true);
        const asset = result.assets[0];
        const duration = await getVideoDuration(asset.uri);

        // subtitle
        let subtitleUri: string | undefined = undefined;
        const subtitleResult = await DocumentPicker.getDocumentAsync({
          type: ['text/vtt', 'application/x-subrip', 'text/plain'],
          copyToCacheDirectory: true,
          multiple: false,
        });
        if (!subtitleResult.canceled && subtitleResult.assets && subtitleResult.assets.length > 0) {
          subtitleUri = subtitleResult.assets[0].uri;
        }
        setLoading(false);
        const newVideo: VideoItem = {
          id: Date.now().toString(),
          uri: asset.uri,
          name: asset.name || 'Untitled',
          duration,
          subtitle: subtitleUri,
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

  // Video Menu/Modal Handlers
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

  // Render Video Item (fullscreen on tap)
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
        onPress={() => {
          videoRefs.current[item.id]?.presentFullscreenPlayer();
        }}
        onLongPress={() => handleVideoLongPress(item)}
        delayLongPress={400}
      >
        <View style={styles.cardContainer}>
          <Video
            ref={ref => { videoRefs.current[item.id] = ref; }}
            source={{ uri: item.uri }}
            style={styles.cardVideo}
            resizeMode="cover"
            shouldPlay={false}
            isMuted
            textTracks={
              item.subtitle
                ? [
                    {
                      uri: item.subtitle,
                      type: item.subtitle.endsWith('.vtt') ? 'text/vtt' : 'text/srt',
                      language: 'en',
                      title: 'English',
                    },
                  ]
                : []
            }
            selectedTextTrack={
              item.subtitle
                ? { type: 'system', value: 'English' }
                : { type: 'disabled' }
            }
          />
          <View style={styles.cardOverlay}>
            <Text style={styles.videoTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.videoDuration}>{item.duration}</Text>
            {item.subtitle && (
              <Ionicons name="text" size={18} color={THEME.accent} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

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
    start={[0, 0]}
    end={[0, 1]}
  >
    <SafeAreaView style={styles.container}>
    
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
        </View>
      </View>
      {videos.length === 0 ? (
  <View style={styles.emptyStateContainer}>
    <Ionicons name="videocam-outline" size={72} color={THEME.accent} style={{ marginBottom: 16 }} />
    <Text style={styles.emptyStateTitle}>No Videos Yet</Text>
    <Text style={styles.emptyStateText}>
      Tap the add button to add videos
    </Text>
  </View>
) : (
  <FlatList
    data={filteredVideos}
    keyExtractor={(item) => item.id}
    renderItem={renderVideoItem}
    numColumns={2}
    contentContainerStyle={styles.grid}
  />
)}    
  
      {videos.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleAddVideo}>
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    height: 55,
    backgroundColor: 'transparent',
    elevation: 4, // adds shadow on Android
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    zIndex: 10,
    position: 'relative',
    opacity: 0.9,
    borderBottomColor : 'rgba(255,255,255,0.1)',
    borderBottomWidth : 1,
    overflow : 'hidden',
  
  },
  appName: { color: THEME.text, fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'left', paddingLeft: 16},
 
  iconButton: {  marginHorizontal: 20},
  
  grid: { 
    padding: 8, 
    paddingBottom: 150, // Match this with the FAB's bottom position
  },
  videoItem: {
    flex: 1,
    backgroundColor: 'transparent',
    margin: 8,
    borderRadius: 12,
    alignItems: 'center',
    padding: 0,
    minHeight: 0,
    // Card shadow for iOS
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    // Elevation for Android
    elevation: 8,
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
    borderRadius: 18, // Increased for modern look
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // Semi-transparent
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.background,
    // Enhanced shadows
    shadowColor: '#f44bf8',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
    // Backdrop blur effect (if supported)
    backdropFilter: 'blur(10px)',
  },

  // Enhanced cardVideo to match modern look
  cardVideoModern: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    // Add subtle overlay for better text readability
  },
  cardVideo: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#000',
  },
  cardOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17,16,23,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'flex-start',
  },
  videoTitle: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  videoDuration: {
    color: THEME.accent,
    fontSize: 12,
    fontFamily: 'monospace',
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
    bottom: 100,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: THEME.accent,
    elevation: 8,
    shadowColor: '#F44BF8',
    shadowOpacity: 0.4,
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
    backgroundColor: '#333',
    color: THEME.text,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    height: 40,
    marginRight: 2,
   marginLeft: 20,
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
    marginTop: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#333',
    marginLeft: 12,
  },
  modalButtonText: {
    color: THEME.text,
    fontSize: 16,
  },
  durationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: THEME.accent, // <--- Use accent color
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 2,
  },
  durationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: THEME.accent,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});