import * as Icons from "lucide-react-native";
import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import useThemeStore from '../store/theme';

const MoreOptionsMenu = ({ visible, onClose }) => {
  const { themeColors, isIncognito, toggleIncognito } = useThemeStore();

  const handleIncognitoToggle = () => {
    toggleIncognito();
    onClose();
  };

  const handleRefresh = () => {
    onClose();
  };

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose}>
        <View style={{ position: 'absolute', right: 16, top: 64, borderRadius: 12, overflow: 'hidden', backgroundColor: themeColors.background, minWidth: 200 }}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }} onPress={handleIncognitoToggle}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icons.EyeOff size={20} color={themeColors.text} style={{ marginRight: 12 }} />
              <Text style={{ color: themeColors.text }}>Incognito mode</Text>
            </View>
            <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: themeColors.text, backgroundColor: isIncognito ? themeColors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {isIncognito && (<Icons.Check size={16} color={themeColors.background} />)}
            </View>
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }} onPress={handleRefresh}>
            <Icons.RefreshCw size={20} color={themeColors.text} style={{ marginRight: 12 }} />
            <Text style={{ color: themeColors.text }}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

export default MoreOptionsMenu;
