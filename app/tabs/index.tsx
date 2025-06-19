import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Video } from 'expo-av';
import { BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions, FlatList,
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
import useThemeStore from '../../store/theme';

const { width } = Dimensions.get('window');

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

const RECENTS_KEY = 'BROWSE_RECENTS';

export default function VideoTab() {
  const { themeColors } = useThemeStore();

  useEffect(() => {
    (async () => {
      await MediaLibrary.requestPermissionsAsync();
    })();
  }, []);

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  // Add to recents (same as browse.tsx)
  const addToRecents = async (file: any) => {
    try {
      const recentsRaw = await AsyncStorage.getItem(RECENTS_KEY);
      let recents = recentsRaw ? JSON.parse(recentsRaw) : [];
      recents = recents.filter((f: any) => f.uri !== file.uri);
      recents.unshift(file);
      recents = recents.slice(0, 10);
      await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
    } catch (e) {
      // fail silently
    }
  };
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

  // FAB Animation
  const fabScale = useRef(new Animated.Value(1)).current;

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
    <Animated.View style={[
      styles.videoItem,
      {
        backgroundColor: themeColors.sectionBackground + 'D0',
        borderColor: themeColors.primary + '30',
        shadowColor: themeColors.primary,
      },
      Platform.OS === 'ios' && { overflow: 'visible' },
    ]}>
      <BlurView intensity={40} tint={themeColors.activeTheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <TouchableOpacity
        style={styles.menuIcon}
        onPress={() => setMenuVideo(item)}
        activeOpacity={0.7}
      >
        <Ionicons name="ellipsis-vertical" size={22} color={themeColors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={() => {
          // Add to recents when video is played
          addToRecents(item);
          videoRefs.current[item.id]?.presentFullscreenPlayer();
        }}
        onLongPress={() => handleVideoLongPress(item)}
        delayLongPress={400}
        activeOpacity={0.8}
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
          <LinearGradient
            colors={['transparent', themeColors.sectionBackground + 'E0']}
            style={styles.cardOverlay}
          >
            <Text style={[styles.videoTitle, { color: themeColors.text, fontWeight: 'bold', fontSize: 17 }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Ionicons name="time-outline" size={14} color={themeColors.primary} style={{ marginRight: 3 }} />
              <Text style={[styles.videoDuration, { color: themeColors.primary }]}>{item.duration}</Text>
              {item.subtitle && (
                <Ionicons name="text" size={16} color={themeColors.primary} style={{ marginLeft: 8 }} />
              )}
            </View>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  // FAB animation handlers
  const handleFabPressIn = () => {
    Animated.spring(fabScale, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };
  const handleFabPressOut = () => {
    Animated.spring(fabScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
   //linear gradient
   <LinearGradient
   colors={[themeColors.background, themeColors.sectionBackground]}
   style={{ flex: 1 }}
   start={[0, 0]}
   end={[0, 1]}
 >
      <SafeAreaView style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          {searchActive ? (
            <View style={[styles.searchBarWrapper, { backgroundColor: themeColors.sectionBackground + 'E0', borderColor: themeColors.primary + '55' }]}>
              <Ionicons name="search" size={20} color={themeColors.primary} style={{ marginLeft: 8, marginRight: 5 }} />
              <TextInput
                style={[styles.searchInput, { color: themeColors.text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search videos..."
                placeholderTextColor={themeColors.tabIconColor}
                autoFocus
              />
              <TouchableOpacity onPress={handleSearchPress}>
                <Ionicons name="close" size={20} color={themeColors.primary} style={{ marginRight: 8 }} />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={[styles.appName, { color: themeColors.primary , fontSize: 30, fontWeight: 'bold' }]}>Video Library</Text>
          )}
          {!searchActive && (
            <TouchableOpacity
              onPress={handleSearchPress}
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <Ionicons name="search" size={24} color={themeColors.text} />
            </TouchableOpacity>
          )}
        </View>
        {videos.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="videocam-outline" size={85} color={themeColors.primary} style={{ marginTop: 60, opacity: 0.7 }} />
            <Text style={[styles.emptyStateTitle, { color: themeColors.text, fontSize: 25, fontWeight: 'bold' }]}>No Videos Yet</Text>
            <Text style={[styles.emptyStateText, { color: themeColors.primary, fontSize: 17, marginTop: 6 }]}>
              Tap the + button to add your first video!
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredVideos}
            keyExtractor={(item) => item.id}
            renderItem={renderVideoItem}
            numColumns={2}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          />
        )}
        <Animated.View style={[
          styles.fab,
          { backgroundColor: themeColors.primary, transform: [{ scale: fabScale }] }
        ]}>
          <TouchableOpacity
            onPress={handleAddVideo}
            onPressIn={handleFabPressIn}
            onPressOut={handleFabPressOut}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={32} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
        {/* Grid Menu Modal */}
        <Modal
          visible={!!menuVideo}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVideo(null)}
        >
          <TouchableWithoutFeedback onPress={() => setMenuVideo(null)}>
            <View style={styles.modalOverlay}>
              <BlurView intensity={50} tint={themeColors.activeTheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            </View>
          </TouchableWithoutFeedback>
          <View style={[styles.menuModal, { backgroundColor: themeColors.sectionBackground + 'F2', borderColor: themeColors.primary + '22' }]}>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={handleGridRename}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil" size={18} color={themeColors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.menuOptionText, { color: themeColors.text }]}>Rename Video</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                setMenuVideo(null);
                handleVideoLongPress(menuVideo!);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash" size={18} color="#FF5555" style={{ marginRight: 8 }} />
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
              activeOpacity={0.7}
            >
              <Ionicons name="list" size={18} color={themeColors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.menuOptionText, { color: themeColors.text }]}>Add to Playlist</Text>
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
          <TouchableWithoutFeedback onPress={() => setRenameModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <BlurView intensity={40} tint={themeColors.activeTheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            </View>
          </TouchableWithoutFeedback>
          <View style={[styles.renameModal, { backgroundColor: themeColors.sectionBackground + 'F7', borderColor: themeColors.primary + '22' }]}>
            <Text style={[styles.renameTitle, { color: themeColors.text, fontWeight: 'bold', fontSize: 18 }]}>Rename Video</Text>
            <TextInput
              style={[styles.renameInput, { color: themeColors.text, borderColor: themeColors.primary }]}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Enter new name"
              placeholderTextColor={themeColors.tabIconColor}
            />
            <View style={styles.renameActions}>
              <TouchableOpacity style={styles.renameButton} onPress={() => setRenameModalVisible(false)}>
                <Text style={{ color: themeColors.primary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.renameButton} onPress={handleRenameSubmit}>
                <Text style={{ color: themeColors.primary, fontWeight: '600' }}>Save</Text>
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
            <View style={styles.modalOverlay}>
              <BlurView intensity={40} tint={themeColors.activeTheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            </View>
          </TouchableWithoutFeedback>
          <View style={[styles.playlistModal, { backgroundColor: themeColors.sectionBackground + 'F7', borderColor: themeColors.primary + '22' }]}>
            <Text style={[styles.playlistTitle, { color: themeColors.text, fontWeight: 'bold', fontSize: 18 }]}>Add to Playlists</Text>
            <FlatList
              data={allPlaylists}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.playlistOption}
                  onPress={() => togglePlaylistCheck(item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={checkedPlaylists.includes(item.id) ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={themeColors.primary}
                    style={{ marginRight: 12 }}
                  />
                  <Text style={{ color: themeColors.text }}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <View style={styles.playlistActions}>
              <TouchableOpacity style={styles.renameButton} onPress={() => setPlaylistPickerVisible(false)}>
                <Text style={{ color: themeColors.primary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.renameButton} onPress={handleSaveToPlaylists}>
                <Text style={{ color: themeColors.primary, fontWeight: '600' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1,
    marginRight: 10,
    paddingVertical: 4,
    marginTop: -8,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOpacity: 0.09,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  topBarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 12,
    padding: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    borderWidth: 0,
    borderRadius: 30,
    padding: 8,
    backgroundColor: 'transparent',
  },
  grid: {
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 110,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    zIndex: 10,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 100,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#A0A0A0',
    textAlign: 'center',
    marginHorizontal: 20,
  },
  videoItem: {
    flex: 1,
    margin: 10,
    borderRadius: 20,
    padding: 0,
    elevation: 4,
    borderWidth: 1,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    minHeight: 150,
    maxWidth: '100%',
    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
  },
  menuIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.10)',
    borderRadius: 18,
  },
  cardContainer: {
    overflow: 'hidden',
    marginBottom: 0,
    borderRadius: 20,
    flex: 1,
    height: '100%',
    width: '100%',
  },
  cardVideo: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(250, 250, 250, 0.01)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    minHeight: 50,
    justifyContent: 'flex-end',
  
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
    color: '#fff',
  },
  videoDuration: {
    fontSize: 13,
    color: '#fff',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(96, 96, 100, 0.22)',
    zIndex: 1,
  },
  menuModal: {
    position: 'absolute',
    bottom: '40%',
    left: 24,
    right: 24,
    borderRadius: 20,
    padding: 22,
    elevation: 7,
    borderWidth: 1,
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    flexDirection: 'column',
    backgroundColor: '#fff',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    paddingHorizontal: 6,
    marginBottom: 2,
  },
  menuOptionText: {
    fontSize: 17,
    fontWeight: '500',
  },
  renameModal: {
    position: 'absolute',
    top: '35%',
    left: 30,
    right: 30,
    borderRadius: 18,
    padding: 22,
    elevation: 7,
    borderWidth: 1,
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    backgroundColor: '#fff',
  },
  renameTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  renameInput: {
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 16,
    padding: 10,
    marginBottom: 14,
    backgroundColor: 'rgba(200,200,200,0.10)',
  },
  renameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  renameButton: {
    marginLeft: 18,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  playlistModal: {
    position: 'absolute',
    top: '25%',
    left: 22,
    right: 22,
    borderRadius: 18,
    padding: 22,
    elevation: 7,
    borderWidth: 1,
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    backgroundColor: '#fff',
    maxHeight: '60%',
  },
  playlistTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  playlistOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    paddingHorizontal: 4,
  },
  playlistActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 18,
  },
});