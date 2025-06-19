import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Video } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  FlatList,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemeStore from '../../store/theme';

const RECENTS_KEY = 'BROWSE_RECENTS';
const FAVORITES_KEY = 'BROWSE_FAVORITES';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const Item = ({
  icon,
  label,
  description,
  onPress,
  rightComponent,
  accessibilityLabel,
  accessibilityHint,
  onLongPress,
  style,
}: {
  icon: string;
  label: string;
  description: string;
  onPress: () => void;
  rightComponent?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  onLongPress?: () => void;
  style?: any;
}) => {
  const { themeColors } = useThemeStore();
  const scaleValue = useRef(new Animated.Value(1)).current;

  const animatePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const animatePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedTouchable
      style={[
        styles.item,
        style,
        {
          backgroundColor: themeColors.sectionBackground + 'B0',
          borderColor: themeColors.primary + '22',
          shadowColor: themeColors.primary,
          transform: [{ scale: scaleValue }],
        },
      ]}
      onPressIn={animatePressIn}
      onPressOut={animatePressOut}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint || description}
      accessibilityRole="button"
    >
      <View style={styles.itemLeft}>
        <Ionicons name={icon as any} size={28} color={themeColors.primary} style={{ marginRight: 16 }} />
        <View>
          <Text style={[styles.itemLabel, { color: themeColors.text }]}>{label}</Text>
          <Text style={[styles.itemDescription, { color: themeColors.tabIconColor }]}>{description}</Text>
        </View>
      </View>
      {rightComponent}
    </AnimatedTouchable>
  );
};

const MediaBrowserScreen = () => {
  const navigation = useNavigation();
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const [wifiSharing, setWifiSharing] = useState(false);
  const [selectedMediaUri, setSelectedMediaUri] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [favoriteFiles, setFavoriteFiles] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [mediaDetails, setMediaDetails] = useState<any | null>(null);
  const [networkStreamVisible, setNetworkStreamVisible] = useState(false);
  const [showCloudServices, setShowCloudServices] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const videoRef = useRef<Video>(null);
  const insets = useSafeAreaInsets();
  const { themeColors } = useThemeStore();

  // Wi-Fi Share Modal State
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareFiles, setShareFiles] = useState<any[]>([]);

  // Load recents/favorites from AsyncStorage on focus
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      (async () => {
        const recents = await AsyncStorage.getItem(RECENTS_KEY);
        if (recents && isActive) setRecentFiles(JSON.parse(recents));
        const favs = await AsyncStorage.getItem(FAVORITES_KEY);
        if (favs && isActive) setFavoriteFiles(JSON.parse(favs));
      })();
      return () => { isActive = false; };
    }, [])
  );

  // Clear recents
  const clearRecents = async () => {
    Alert.alert(
      'Clear Recent Files',
      'Are you sure you want to clear all recent files?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear', style: 'destructive',
          onPress: async () => {
            setRecentFiles([]);
            await AsyncStorage.removeItem(RECENTS_KEY);
          }
        }
      ]
    );
  };

  // Add to recents
  const addToRecents = async (file: any) => {
    let updated = recentFiles.filter((f) => f.uri !== file.uri);
    updated.unshift(file);
    updated = updated.slice(0, 10); // keep max 10
    setRecentFiles(updated);
    await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
  };

  // Toggle favorite
  const toggleFavorite = async (file: any) => {
    let updated;
    if (favoriteFiles.some((f) => f.uri === file.uri)) {
      updated = favoriteFiles.filter((f) => f.uri !== file.uri);
    } else {
      updated = [file, ...favoriteFiles];
    }
    setFavoriteFiles(updated);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  };

  // Show details modal
  const showMediaDetails = async (file: any) => {
    let meta = { ...file };
    try {
      const info = await FileSystem.getInfoAsync(file.uri);
      meta.size = info.size;
    } catch (e) {}
    setMediaDetails(meta);
    setShowDetails(true);
  };

  // Download file function
  const downloadFile = async (url: string, fileName: string) => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      // Create downloads directory if it doesn't exist
      const downloadsDir = FileSystem.documentDirectory + 'downloads/';
      const dirInfo = await FileSystem.getInfoAsync(downloadsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });
      }

      const fileUri = downloadsDir + fileName;

      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloadProgress(progress);
        }
      );

      const { uri } = await downloadResumable.downloadAsync();

      if (uri) {
        Alert.alert('Success', 'File downloaded successfully!');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download file');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Handle back button press
  useEffect(() => {
    const backAction = () => {
      if (selectedMediaUri) {
        setSelectedMediaUri(null);
        videoRef.current?.stopAsync();
        return true;
      }
      if (networkStreamVisible) {
        setNetworkStreamVisible(false);
        return true;
      }
      if (showCloudServices) {
        setShowCloudServices(false);
        return true;
      }
      if (showDetails) {
        setShowDetails(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [selectedMediaUri, networkStreamVisible, showCloudServices, showDetails]);

  // Request permissions and load initial data
  useEffect(() => {
    if (!permissionResponse || !permissionResponse.granted) {
      requestPermission();
    }
  }, [permissionResponse, requestPermission]);

  // Document picker (auto-fullscreen, adds to recents)
  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true
      });

      if (result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        const file = { uri: fileUri, name: result.assets[0].name || 'Unknown' };
        navigation.navigate('VideoTab', { uri: fileUri });
        setVideoError(null);
        await addToRecents(file);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick the video file');
    }
  }, [addToRecents, navigation]);

  // Cloud services
  const handleCloudService = useCallback(async (service: string) => {
    try {
      setShowCloudServices(false);

      switch (service) {
        case 'Google Drive':
          await Linking.openURL('https://accounts.google.com/');
          break;
        case 'Dropbox':
          await Linking.openURL('https://www.dropbox.com/');
          break;
        case 'iCloud':
          await Linking.openURL('https://www.icloud.com/');
          break;
      }
    } catch (error) {
      console.error('Error connecting to cloud service:', error);
      Alert.alert('Error', `Failed to connect to ${service}`);
    }
  }, []);

  // Handle downloads
  const handleDownloads = useCallback(async () => {
    try {
      const downloadsDir = FileSystem.documentDirectory + 'downloads/';
      const dirInfo = await FileSystem.getInfoAsync(downloadsDir);

      if (!dirInfo.exists) {
        Alert.alert('Downloads', 'No downloads found');
        return;
      }

      const files = await FileSystem.readDirectoryAsync(downloadsDir);

      if (files.length === 0) {
        Alert.alert('Downloads', 'No files found in downloads');
        return;
      }

      const fileList = await Promise.all(
        files.map(async (fileName) => {
          const fileUri = `${downloadsDir}${fileName}`;
          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          return {
            name: fileName,
            uri: fileUri,
            size: fileInfo.size || 0,
            isDirectory: fileInfo.isDirectory,
          };
        })
      );

      const videoFiles = fileList
        .filter(file => !file.isDirectory && /\.(mp4|mkv|avi|mov|wmv|flv|webm|3gp|m3u8|mpd)$/i.test(file.name))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (videoFiles.length === 0) {
        Alert.alert('Downloads', 'No video files found in downloads');
        return;
      }

      const fileListText = videoFiles
        .map(file => {
          const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
          return `${file.name}\n  Size: ${sizeInMB} MB`;
        })
        .join('\n\n');

      Alert.alert(
        'Downloaded Videos',
        fileListText,
        [
          {
            text: 'Open First Video',
            onPress: () => {
              if (videoFiles[0]) {
                navigation.navigate('VideoTab', { uri: videoFiles[0].uri });
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error reading downloads:', error);
      Alert.alert('Error', 'Failed to read downloads. Please try again.');
    }
  }, [navigation]);

  // Wi-Fi Share Modal State
  // Open share modal with recents and favorites
  const openShareModal = () => {
    // Merge recents and favorites, remove duplicates by uri
    const allFiles = [...recentFiles, ...favoriteFiles];
    const uniqueFiles = Array.from(new Map(allFiles.map(f => [f.uri, f])).values());
    if (uniqueFiles.length === 0) {
      Alert.alert('No Videos', 'There are no recent or favorite videos to share.');
      return;
    }
    setShareFiles(uniqueFiles);
    setShareModalVisible(true);
  };

  // Share selected video
  const handleShareVideo = async (file: any) => {
    try {
      await Sharing.shareAsync(file.uri);
    } catch (error) {
      console.error('Sharing error:', error);
      Alert.alert('Error', 'Failed to share video');
    }
    setShareModalVisible(false);
  };

  return (
    <LinearGradient
      colors={[themeColors.background, themeColors.sectionBackground]}
      style={{
        flex: 1,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <StatusBar barStyle={themeColors.background === '#111017' ? "light-content" : "dark-content"} backgroundColor={themeColors.background} />
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
        <Text style={[styles.screenTitle, { color: themeColors.primary, fontSize: 30, fontWeight: 'bold' }]}>Browse</Text>

        {/* Recent Files Carousel */}
        {recentFiles.length > 0 && (
          <View style={{ marginBottom: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10, marginBottom: 8 }}>
              <Text style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 18, marginRight: 8 }}>Recent Files</Text>
              <TouchableOpacity
                onPress={clearRecents}
                style={{ marginLeft: 4, padding: 4 }}
                accessibilityLabel="Clear recent files"
                accessibilityHint="Remove all recent files from the list"
              >
                <Ionicons name="trash-outline" size={20} color={themeColors.tabIconColor} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={recentFiles}
              horizontal
              keyExtractor={(item) => item.uri}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 12, paddingRight: 12 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => setSelectedMediaUri(item.uri)}
                  onLongPress={() => showMediaDetails(item)}
                  style={{
                    width: 110,
                    marginRight: 14,
                    borderRadius: 16,
                    backgroundColor: themeColors.sectionBackground,
                    padding: 7,
                    alignItems: 'center',
                    shadowColor: themeColors.primary,
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                  accessibilityLabel={`Play ${item.name}`}
                  accessibilityHint="Tap to play, long press for details"
                >
                  {item.uri ? (
                    <Video
                      source={{ uri: item.uri }}
                      style={{ width: 80, height: 48, borderRadius: 10, marginBottom: 6, backgroundColor: themeColors.sectionBackground }}
                      resizeMode="cover"
                      paused
                      muted
                    />
                  ) : (
                    <Ionicons name="film-outline" size={40} color={themeColors.primary} style={{ marginBottom: 6 }} />
                  )}
                  <Text numberOfLines={2} style={{ color: themeColors.text, fontSize: 13, textAlign: 'center' }}>{item.name}</Text>
                  <TouchableOpacity
                    onPress={() => toggleFavorite(item)}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      padding: 6,
                    }}
                    accessibilityLabel={favoriteFiles.some(f => f.uri === item.uri) ? 'Remove from favorites' : 'Add to favorites'}
                    accessibilityHint="Toggle favorite"
                  >
                    <Ionicons
                      name={favoriteFiles.some(f => f.uri === item.uri) ? 'star' : 'star-outline'}
                      size={22}
                      color={favoriteFiles.some(f => f.uri === item.uri) ? '#FACC15' : themeColors.tabIconColor}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Favorites Section */}
        {favoriteFiles.length > 0 && (
          <View style={{ marginBottom: 18 }}>
            <Text style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 18, marginLeft: 10, marginBottom: 8 }}>Favorites</Text>
            <FlatList
              data={favoriteFiles}
              horizontal
              keyExtractor={(item) => item.uri}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 12, paddingRight: 12 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => setSelectedMediaUri(item.uri)}
                  onLongPress={() => showMediaDetails(item)}
                  style={{
                    width: 110,
                    marginRight: 14,
                    borderRadius: 16,
                    backgroundColor: themeColors.sectionBackground,
                    padding: 7,
                    alignItems: 'center',
                    shadowColor: themeColors.primary,
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                  accessibilityLabel={`Play ${item.name}`}
                  accessibilityHint="Tap to play, long press for details"
                >
                  {item.uri ? (
                    <Video
                      source={{ uri: item.uri }}
                      style={{ width: 80, height: 48, borderRadius: 10, marginBottom: 6, backgroundColor: themeColors.sectionBackground }}
                      resizeMode="cover"
                      paused
                      muted
                    />
                  ) : (
                    <Ionicons name="film-outline" size={40} color={themeColors.primary} style={{ marginBottom: 6 }} />
                  )}
                  <Text numberOfLines={2} style={{ color: themeColors.text, fontSize: 13, textAlign: 'center' }}>{item.name}</Text>
                  <TouchableOpacity
                    onPress={() => toggleFavorite(item)}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      padding: 6,
                    }}
                    accessibilityLabel="Remove from favorites"
                    accessibilityHint="Remove from favorites"
                  >
                    <Ionicons name="star" size={22} color="#FACC15" />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Main List */}
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Item
            icon="folder-outline"
            label="Local files"
            description="Open and play a local video file"
            onPress={pickDocument}
            accessibilityLabel="Browse local files"
            accessibilityHint="Open and play a local video file"
            style={{ minHeight: 64 }}
          />
          <Item
            icon="cloud-outline"
            label="Cloud Services"
            description="Access your cloud storage"
            onPress={() => setShowCloudServices(true)}
            accessibilityLabel="Cloud Services"
            accessibilityHint="Access your cloud storage"
          />
          <Item
            icon="globe-outline"
            label="Network Stream"
            description="Play from a network URL"
            onPress={() => setNetworkStreamVisible(true)}
            accessibilityLabel="Network Stream"
            accessibilityHint="Play from a network URL"
          />
          <Item
            icon="download-outline"
            label="Downloads"
            description="View downloaded files"
            onPress={handleDownloads}
            accessibilityLabel="Downloads"
            accessibilityHint="View downloaded files"
          />
          <Item
            icon="wifi"
            label="Wi-Fi Sharing"
            description={wifiSharing ? "Sharing enabled" : "Sharing disabled"}
            onPress={openShareModal}
            rightComponent={
              <Switch
                value={wifiSharing}
                onValueChange={setWifiSharing}
                trackColor={{ false: themeColors.tabIconColor, true: themeColors.primary }}
              />
            }
            accessibilityLabel="Wi-Fi Sharing"
            accessibilityHint="Toggle Wi-Fi sharing"
          />
        </ScrollView>

        {/* Details Modal */}
        <Modal visible={showDetails} transparent animationType="fade" onRequestClose={() => setShowDetails(false)}>
          <View style={{
            flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center'
          }}>
            <View style={{
              backgroundColor: themeColors.background, borderRadius: 20, padding: 24, width: 320, alignItems: 'center'
            }}>
              <Ionicons name="information-circle" size={40} color={themeColors.primary} style={{ marginBottom: 12 }} />
              <Text style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>
                {mediaDetails?.name || 'File Details'}
              </Text>
              <Text style={{ color: themeColors.text, fontSize: 15, marginBottom: 4 }}>
                URI: {mediaDetails?.uri}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDetails(false)}
                style={{ marginTop: 18, padding: 10, borderRadius: 12, backgroundColor: themeColors.primaryLight, minWidth: 90, alignItems: 'center' }}
                accessibilityLabel="Close details"
                accessibilityHint="Close file details modal"
              >
                <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modern Video Player Modal */}
        {selectedMediaUri && (
          <View style={[
            styles.videoOverlay,
            { backgroundColor: themeColors.modalOverlay || 'rgba(20,20,30,0.80)' }
          ]}>
            <LinearGradient
              colors={[
                themeColors.sectionBackground + 'CC',
                themeColors.background + 'F0'
              ]}
              style={styles.videoModal}
              start={{ x: 0.1, y: 0.1 }}
              end={{ x: 0.9, y: 0.9 }}
            >
              <TouchableOpacity
                style={styles.closeButtonModern}
                onPress={() => {
                  setSelectedMediaUri(null);
                  videoRef.current?.stopAsync();
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={28} color={themeColors.primary} />
              </TouchableOpacity>
              <View style={styles.videoContent}>
                {isLoading && (
                  <View style={styles.loadingContainerModern}>
                    <ActivityIndicator size="large" color={themeColors.primary} />
                  </View>
                )}
                <Video
                  ref={videoRef}
                  source={{ uri: selectedMediaUri }}
                  style={styles.videoModern}
                  useNativeControls
                  resizeMode="contain"
                  shouldPlay
                  isLooping
                  isMuted={false}
                  rate={1.0}
                  volume={1.0}
                  onError={(error) => {
                    const errorMsg = `Video error: ${error.nativeEvent?.error?.message || 'Unknown error'}`;
                    setVideoError(errorMsg);
                    setIsLoading(false);
                  }}
                  onLoadStart={() => {
                    setIsLoading(true);
                    setVideoError(null);
                  }}
                  onLoad={() => {
                    setIsLoading(false);
                  }}
                  onFullscreenUpdate={({ fullscreenUpdate }) => {
                    if (fullscreenUpdate === 2) {
                      setSelectedMediaUri(null);
                      videoRef.current?.stopAsync();
                    }
                  }}
                />
                {videoError && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={18} color="#FF5555" style={{ marginRight: 8 }} />
                    <Text style={styles.errorTextModern}>{videoError}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Wi-Fi Share Modal */}
        <Modal
          visible={shareModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setShareModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: themeColors.background, borderRadius: 20, padding: 24, width: 320, maxHeight: 400 }}>
              <Text style={{ color: themeColors.primary, fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Share a Video</Text>
              <ScrollView>
                {shareFiles.map((file, idx) => (
                  <TouchableOpacity
                    key={file.uri + idx}
                    onPress={() => handleShareVideo(file)}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: idx !== shareFiles.length - 1 ? 1 : 0, borderColor: themeColors.sectionBackground }}
                  >
                    <Ionicons name="film-outline" size={28} color={themeColors.primary} style={{ marginRight: 14 }} />
                    <Text style={{ color: themeColors.text, fontSize: 16, flex: 1 }} numberOfLines={1}>{file.name || file.uri}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                onPress={() => setShareModalVisible(false)}
                style={{ marginTop: 18, padding: 10, borderRadius: 12, backgroundColor: themeColors.primaryLight, minWidth: 90, alignItems: 'center' }}
                accessibilityLabel="Close share modal"
                accessibilityHint="Close video share modal"
              >
                <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Network Stream Modal */}
        <Modal
          visible={networkStreamVisible}
          animationType="slide"
          onRequestClose={() => setNetworkStreamVisible(false)}
          presentationStyle="fullScreen"
        >
          <View style={[styles.modalBackground, { paddingTop: insets.top }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setNetworkStreamVisible(false)}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color={themeColors.primary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Network Stream</Text>
            </View>
            <View style={styles.modalContainer}>
              <Text style={styles.modalSubtitle}>Enter the URL of the video stream</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com/stream.mp4"
                placeholderTextColor={themeColors.tabIconColor}
                value={streamUrl}
                onChangeText={setStreamUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TouchableOpacity
                style={[styles.playButton, { marginTop: 18 }]}
                onPress={async () => {
                  if (!streamUrl.trim()) {
                    Alert.alert('Error', 'Please enter a valid URL');
                    return;
                  }
                  setSelectedMediaUri(streamUrl.trim());
                  setNetworkStreamVisible(false);
                }}
              >
                <Ionicons name="play" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Play</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Cloud Services Modal */}
        <Modal
          visible={showCloudServices}
          animationType="slide"
          onRequestClose={() => setShowCloudServices(false)}
          presentationStyle="fullScreen"
        >
          <View style={[styles.modalBackground, { paddingTop: insets.top }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowCloudServices(false)}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color={themeColors.primary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Cloud Services</Text>
            </View>
            <View style={styles.modalContainer}>
              <Text style={styles.modalSubtitle}>Select a cloud service to connect</Text>
              <TouchableOpacity
                style={styles.cloudServiceButton}
                onPress={() => handleCloudService('Google Drive')}
              >
                <Ionicons name="logo-google" size={24} color="#4285F4" />
                <Text style={styles.cloudServiceText}>Google Drive</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cloudServiceButton}
                onPress={() => handleCloudService('Dropbox')}
              >
                <Ionicons name="logo-dropbox" size={24} color="#0061FF" />
                <Text style={styles.cloudServiceText}>Dropbox</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cloudServiceButton}
                onPress={() => handleCloudService('iCloud')}
              >
                <Ionicons name="cloud" size={24} color="#4285F4" />
                <Text style={styles.cloudServiceText}>iCloud</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 12,
    marginLeft: 18,
    marginBottom: 10,
    letterSpacing: 1.1,
  },
  scrollContainer: {
    paddingHorizontal: 15,
    paddingBottom: 30,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemLabel: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 13,
    fontWeight: '400',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 1,
  },
  videoModal: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 24,
    backgroundColor:'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    maxHeight: '90%',
  },
  closeButtonModern: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 20,
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 5,
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    color: '#fff',
  },
  videoContent: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  videoModern: {
    width: '100%',
    height: 200,
    aspectRatio: 16/9,
    resizeMode: 'cover',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(20, 20, 30, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    transform: [{ scale: 0.98 }],
    overflow: 'visible',
    top: 30,
  },
  loadingContainerModern: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,85,85,0.10)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  errorTextModern: {
    color: '#FF5555',
    fontSize: 15,
    fontWeight: '500',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: '#18151f',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalContainer: {
    padding: 24,
    flex: 1,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 14,
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  playButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cloudServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232136',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  cloudServiceText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 14,
    color: '#fff',
  },
});

export default MediaBrowserScreen;