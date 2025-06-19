import * as Icons from "lucide-react-native";
import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import useThemeStore from '../store/theme';

const AccentColorPicker = ({ visible, onClose }) => {
  const { themeColors, setAccentColor, accentColor } = useThemeStore();

  const colors = [
    { id: 'purple', name: 'Purple', color: '#F44BF8' },
    { id: 'blue', name: 'Blue', color: '#2563EB' },
    { id: 'orange', name: 'Orange', color: '#EA580C' },
    { id: 'green', name: 'Green', color: '#16A34A' },
    { id: 'red', name: 'Red', color: '#EF4444' },
    { id: 'teal', name: 'Teal', color: '#14B8A6' },
    { id: 'yellow', name: 'Yellow', color: '#FACC15' },
    { id: 'indigo', name: 'Indigo', color: '#6366F1' },
  ];

  const handleColorSelect = (colorId: string) => {
    setAccentColor(colorId as AccentColorId);
    onClose();
  };

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <Pressable style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose}>
        <Pressable style={{ marginHorizontal: 16, borderRadius: 24, padding: 16, backgroundColor: themeColors.background }}>
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: themeColors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Select Accent Color</Text>
            <Text style={{ color: themeColors.text, fontSize: 14 }}>Choose your preferred accent color for the app</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginBottom: 16 }}>
            {colors.map((color) => (
              <TouchableOpacity key={color.id} onPress={() => handleColorSelect(color.id)} style={{ alignItems: 'center', marginHorizontal: 8, marginVertical: 4 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4, backgroundColor: color.color }}>
                  {accentColor === color.id && (<Icons.Check size={20} color="#FFFFFF" />)}
                </View>
                <Text style={{ color: accentColor === color.id ? color.color : themeColors.text, opacity: accentColor === color.id ? 1 : 0.7, fontSize: 14 }}>{color.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onClose} style={{ paddingVertical: 12, borderRadius: 16, alignItems: 'center', backgroundColor: themeColors.primaryLight }}>
            <Text style={{ color: themeColors.primary }}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default AccentColorPicker;
