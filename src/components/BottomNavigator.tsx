import React from 'react';
import { View, StyleSheet } from 'react-native';
import { House, Gear, Plus } from 'phosphor-react-native';
import { RipplePressable } from './RipplePressable';

interface BottomNavigatorProps {
  activeTab: 'home' | 'settings';
  onTabChange: (tab: 'home' | 'settings') => void;
  onCameraPress: () => void;
  isDarkMode?: boolean;
}

export const BottomNavigator: React.FC<BottomNavigatorProps> = ({
  activeTab,
  onTabChange,
  onCameraPress,
  isDarkMode,
}) => {
  const isDark = !!isDarkMode;
  const themeBgColor = isDark ? '#1E293B' : '#FFFFFF';
  const themeBorderColor = isDark ? '#334155' : '#E2E8F0';
  const themeActiveColor = isDark ? '#FFFFFF' : '#000000';
  const themeFABBg = isDark ? '#FFFFFF' : '#000000';
  const themeFABColor = isDark ? '#000000' : '#FFFFFF';

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Bottom Half Notch Border Mask */}
      <View style={styles.notchMaskContainer} pointerEvents="none">
        <View style={[styles.notchBorderCircle, { backgroundColor: themeBgColor, borderColor: themeBorderColor }]} />
      </View>

      {/* Center Floating FAB Button Wrapper */}
      <View style={styles.fabWrapper} pointerEvents="box-none">
        <View style={[styles.fabButtonContainer, { backgroundColor: themeFABBg }]}>
          <RipplePressable
            onPress={onCameraPress}
            style={styles.fabButton}
            rippleColor={isDark ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.2)"}
          >
            <Plus size={30} color={themeFABColor} weight="bold" />
          </RipplePressable>
        </View>
      </View>

      {/* Tab Bar Bar */}
      <View style={[styles.tabBar, { backgroundColor: themeBgColor, borderTopColor: themeBorderColor }]}>
        {/* Home Tab */}
        <RipplePressable
          onPress={() => onTabChange('home')}
          style={styles.tabItem}
          rippleColor={isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}
        >
          <View style={styles.tabIconContainer}>
            <House
              size={28}
              color={activeTab === 'home' ? themeActiveColor : '#94A3B8'}
              weight={activeTab === 'home' ? 'fill' : 'regular'}
            />
            {activeTab === 'home' && <View style={[styles.activeDot, { backgroundColor: themeActiveColor }]} />}
          </View>
        </RipplePressable>

        {/* Center spacing spacer (occupies slot 1 so icons align to sides) */}
        <View style={styles.tabItemCenterSpacer} />

        {/* Settings Tab */}
        <RipplePressable
          onPress={() => onTabChange('settings')}
          style={styles.tabItem}
          rippleColor={isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}
        >
          <View style={styles.tabIconContainer}>
            <Gear
              size={28}
              color={activeTab === 'settings' ? themeActiveColor : '#94A3B8'}
              weight={activeTab === 'settings' ? 'fill' : 'regular'}
            />
            {activeTab === 'settings' && <View style={[styles.activeDot, { backgroundColor: themeActiveColor }]} />}
          </View>
        </RipplePressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: 'transparent',
  },
  fabWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'transparent',
    width: 82,
    height: 82,
    borderRadius: 41,
    bottom: 55,
    zIndex: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notchMaskContainer: {
    position: 'absolute',
    alignSelf: 'center',
    width: 82,
    height: 41,
    bottom: 55,
    overflow: 'hidden',
    zIndex: 3,
  },
  notchBorderCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: -41,
    left: 0,
  },
  fabButtonContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
  },
  fabButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    height: 96,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingBottom: 32,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: '100%',
    zIndex: 2,
  },
  tabItemCenterSpacer: {
    width: 120,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#000000',
  },
});
