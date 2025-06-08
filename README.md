# VLC22 Video Playlist App

A modern, user-friendly Expo React Native app for managing and playing video playlists.  
Built for smooth performance, beautiful UI, and a polished mobile experience — fully compatible with Expo Go.

---

## ✨ Features

- **Video Library**
  - Upload and display videos in a responsive grid.
  - Video thumbnails generated using the first frame (Expo Go compatible).
  - Play videos in a modal with native controls.
  - Delete and rename videos.
  - Search and filter videos.
  - (Planned) Bulk selection for adding/removing videos to/from playlists.

- **Playlists**
  - Create, rename, and delete playlists with validation.
  - Display playlists in a list with video counts.
  - Sort playlists by name, date created, or video count.
  - Search playlists by name.
  - View all videos in a playlist in a grid layout.
  - Remove single or multiple videos from playlists (bulk remove).
  - Play videos directly from playlists.
  - All playlist changes are persisted locally.

- **User Experience**
  - Toast/snackbar notifications for all key actions (add, remove, create, rename, delete).
  - Friendly empty states with icons and helpful messages.
  - Consistent dark theme with accent colors.
  - All modals and overlays respect device safe areas (notch, corners, gesture bar).
  - Smooth animations and responsive layouts.

- **Persistence**
  - All videos and playlists are stored locally using `@react-native-async-storage/async-storage`.

- **Expo Go Compatible**
  - No custom native modules required; works out-of-the-box with Expo Go.


---

## 🚀 Getting Started
         
### 1. Clone the Repository

2. Dependencies to intall
   expo install expo-av @react-native-async-storage/async-storage @expo/vector-icons react-native-safe-area-context react-native-root-toast @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-gesture-handler


3 Start the app
npx expo start

4.PROJECT STRUCTURE
app/
  (tabs)/
    index.tsx        # Video Library
    playlist.tsx     # Playlist Management
    audio.tsx        # (Optional) Audio tab
    browse.tsx       # (Optional) Browse tab
    more.tsx         # (Optional) More tab
  _layout.tsx        # App layout and navigation

5.  📝 Customization
Colors & Theme: Easily change colors in the THEME object in your main files.
Icons: Uses Ionicons from @expo/vector-icons.
Safe Area: All modals and overlays use SafeAreaView.

6.💡 Planned Features
Bulk selection in the main video library for adding/removing to playlists.
More advanced filtering and sorting.
Global state management for real-time sync between tabs.
Improved error handling and type safety.
Light/Dark mode toggle.


   
```sh
git clone [https://github.com/Armahkyek22/vlc22.git](https://github.com/Armahkyek22/vlc22.git)
cd vlc22
