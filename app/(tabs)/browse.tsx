import { Ionicons } from '@expo/vector-icons';
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
  Linking,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const Item = ({ icon, label, description, onPress, rightComponent }: {
  icon: string;
  label: string;
  description: string;
  onPress: () => void;
  rightComponent?: React.ReactNode;
}) => {
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
      style={[styles.item, { transform: [{ scale: scaleValue }] }]}
      onPressIn={animatePressIn}
      onPressOut={animatePressOut}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.itemLeft}>
        <Ionicons name={icon as any} size={24} color="#F44BF8" style={{ marginRight: 16 }} />
        <View>
          <Text style={styles.itemLabel}>{label}</Text>
          <Text style={styles.itemDescription}>{description}</Text>
        </View>
      </View>
      {rightComponent}
    </AnimatedTouchable>
  );
};

const MediaBrowserScreen = () => {
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const [wifiSharing, setWifiSharing] = useState(false);
  const [selectedMediaUri, setSelectedMediaUri] = useState<string | null>(null);
  const [networkStreamVisible, setNetworkStreamVisible] = useState(false);
  const [showCloudServices, setShowCloudServices] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [storageInfo, setStorageInfo] = useState<{totalFiles?: number; totalSize?: number} | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const videoRef = useRef<Video>(null);
  const insets = useSafeAreaInsets();

  // Get storage info
  const getStorageInfo = useCallback(async () => {
    try {
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory!);
      const stats = await Promise.all(
        files.map(async (file) => {
          const info = await FileSystem.getInfoAsync(FileSystem.documentDirectory + file);
          return info.size || 0;
        })
      );
      const totalSize = stats.reduce((sum, size) => sum + size, 0);
      setStorageInfo({ totalFiles: files.length, totalSize });
      return { totalFiles: files.length, totalSize };
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  }, []);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await getStorageInfo();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [getStorageInfo]);

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
        // Refresh the storage info to show the new file
        await getStorageInfo();
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
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [selectedMediaUri, networkStreamVisible, showCloudServices]);

  // Request permissions and load initial data
  useEffect(() => {
    if (!permissionResponse || !permissionResponse.granted) {
      requestPermission();
    }
    getStorageInfo().catch(console.error);
  }, [permissionResponse, getStorageInfo]);

  // Document picker
  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ 
        type: 'video/*',
        copyToCacheDirectory: true
      });
      
      if (result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        setSelectedMediaUri(fileUri);
        setVideoError(null);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick the video file');
    }
  }, []);

  // Cloud services
  const handleCloudService = useCallback(async (service: string) => {
    try {
      setShowCloudServices(false);
      
      switch(service) {
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

      // Get file info for each file
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

      // Filter out directories and sort by name
      const videoFiles = fileList
        .filter(file => !file.isDirectory && /\.(mp4|mkv|avi|mov|wmv|flv|webm|3gp|m3u8|mpd)$/i.test(file.name))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (videoFiles.length === 0) {
        Alert.alert('Downloads', 'No video files found in downloads');
        return;
      }

      // Show a list of video files with their sizes
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
            text: 'OK',
            style: 'default',
          },
          {
            text: 'Open First Video',
            onPress: () => {
              if (videoFiles[0]) {
                setSelectedMediaUri(videoFiles[0].uri);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error reading downloads:', error);
      Alert.alert('Error', 'Failed to read downloads. Please try again.');
    }
  }, []);

  // Handle file sharing
  const handleShare = useCallback(async () => {
    try {
      const fileUri = FileSystem.documentDirectory + 'sample.txt';
      await FileSystem.writeAsStringAsync(fileUri, 'Sample Wi-Fi share content');
      await Sharing.shareAsync(fileUri);
    } catch (error) {
      console.error('Sharing error:', error);
      Alert.alert('Error', 'Failed to share file');
    }
  }, []);

  return (
    <LinearGradient 
      colors={["#111017", "#1a1a1f"]} 
      style={{ 
        flex: 1,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        <Text style={styles.screenTitle}>Browse</Text>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#F44BF8"
              colors={['#F44BF8']}
              progressBackgroundColor="#1E1E24"
            />
          }
        >
          <Item 
            icon="folder-outline" 
            label="Local files" 
            description="Open and play a local video file" 
            onPress={pickDocument} 
          />
          <Item 
            icon="cloud-outline" 
            label="Cloud Services" 
            description="Access your cloud storage" 
            onPress={() => setShowCloudServices(true)} 
          />
          <Item 
            icon="globe-outline" 
            label="Network Stream" 
            description="Play from a network URL" 
            onPress={() => setNetworkStreamVisible(true)} 
          />
          <Item 
            icon="download-outline" 
            label="Downloads" 
            description="View downloaded files" 
            onPress={handleDownloads} 
          />
          <Item
            icon="wifi"
            label="Wi-Fi Sharing"
            description={wifiSharing ? "Sharing enabled" : "Sharing disabled"}
            onPress={handleShare}
            rightComponent={
              <Switch
                value={wifiSharing}
                onValueChange={setWifiSharing}
                trackColor={{ false: '#767577', true: '#F44BF8' }}
              />
            }
          />
          {storageInfo && (
            <Item
              icon="stats-chart"
              label="Storage"
              description={`${storageInfo.totalFiles} files (${(storageInfo.totalSize! / 1024 / 1024).toFixed(2)} MB)`}
              onPress={() => {}}
            />
          )}
        </ScrollView>

        {/* Video Player */}
        {selectedMediaUri && (
          <View style={styles.videoContainer}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setSelectedMediaUri(null);
                videoRef.current?.stopAsync();
              }}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#F44BF8" />
              </View>
            )}
            <Video
              ref={videoRef}
              source={{ uri: selectedMediaUri }}
              style={styles.video}
              useNativeControls
              resizeMode="contain"
              shouldPlay
              isLooping
              isMuted={false}
              rate={1.0}
              volume={1.0}
              onError={(error) => {
                const errorMsg = `Video error: ${error.nativeEvent?.error?.message || 'Unknown error'}`;
                console.error(errorMsg, error);
                setVideoError(errorMsg);
                setIsLoading(false);
              }}
              onLoadStart={() => {
                console.log('Video loading started');
                setIsLoading(true);
                setVideoError(null);
              }}
              onLoad={(status) => {
                console.log('Video loaded:', status);
                setIsLoading(false);
                videoRef.current?.presentFullscreenPlayer().then(() => {
                  setSelectedMediaUri(null);
                  videoRef.current?.stopAsync();
                });
              }}
              onFullscreenUpdate={({ fullscreenUpdate }) => {
                if (fullscreenUpdate === 2) {
                  setSelectedMediaUri(null);
                  videoRef.current?.stopAsync();
                }
              }}
            />
            {videoError && <Text style={styles.errorText}>{videoError}</Text>}
          </View>
        )}

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
                <Ionicons name="arrow-back" size={24} color="#F44BF8" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Network Stream</Text>
            </View>
            
            <View style={styles.modalContainer}>
              <Text style={styles.modalSubtitle}>Enter the URL of the video stream</Text>
              
              <TextInput
                style={styles.input}
                placeholder="https://example.com/stream.mp4"
                placeholderTextColor="#888"
                value={streamUrl}
                onChangeText={setStreamUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.playButton, {flex: 1}]}
                  onPress={() => {
                    if (streamUrl) {
                      setSelectedMediaUri(streamUrl);
                      setNetworkStreamVisible(false);
                    } else {
                      Alert.alert('Error', 'Please enter a valid URL');
                    }
                  }}
                >
                  <Text style={styles.buttonText}>Play Stream</Text>
                </TouchableOpacity>
                
                <View style={{width: 16}} />
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.downloadButton, {flex: 1}]}
                  onPress={async () => {
                    if (!streamUrl) {
                      Alert.alert('Error', 'Please enter a valid URL');
                      return;
                    }
                    
                    // Extract filename from URL or use a default name
                    const fileName = streamUrl.split('/').pop() || `video_${Date.now()}.mp4`;
                    
                    await downloadFile(streamUrl, fileName);
                  }}
                  disabled={isDownloading}
                >
                  <Ionicons 
                    name={isDownloading ? "cloud-download" : "cloud-download-outline"} 
                    size={20} 
                    color="#FFF" 
                    style={{ marginRight: 8 }} 
                  />
                  <Text style={styles.buttonText}>
                    {isDownloading ? `${Math.round(downloadProgress * 100)}%` : 'Download'}
                  </Text>
                </TouchableOpacity>
              </View>

              {isDownloading && (
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${downloadProgress * 100}%` }]} />
                </View>
              )}
              
              <Text style={styles.hintText}>
                Supported formats: Direct video links, HLS (.m3u8), DASH (.mpd)
              </Text>
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
                <Ionicons name="arrow-back" size={24} color="#F44BF8" />
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
                <Ionicons name="cloud" size={24} color="#5FC7FF" />
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
  // Main container styles
  container: {
    flex: 1,
    backgroundColor: '#111017',
    
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    margin: 16,
    marginBottom: 8,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  // Item styles
  item: {
    backgroundColor: 'rgba(93, 45, 90, 0.26)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#f44bf8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 13,
    color: '#A0A0A0',
  },
  // Video player styles
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 1000,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1001,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 1002,
  },
  video: {
    flex: 1,
    width: '100%',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  },
  // Modal styles
  modalBackground: {
    flex: 1,
    backgroundColor: '#111017',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2F',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#A0A0A0',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#1E1E24',
    borderRadius: 8,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    width: '100%',
  },
  modalButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  playButton: {
    backgroundColor: '#F44BF8',
  },
  downloadButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 4,
    width: '100%',
    backgroundColor: '#1E1E24',
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  hintText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  // Cloud service button
  cloudServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E24',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  cloudServiceText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 16,
  },
});

export default MediaBrowserScreen;
