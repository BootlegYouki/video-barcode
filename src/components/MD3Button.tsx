import React from 'react';
import { Text, View, ActivityIndicator, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { RipplePressable } from './RipplePressable';

interface MD3ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'filled' | 'tonal' | 'outlined' | 'text';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  size?: 'normal' | 'large';
  isDarkMode?: boolean;
}

export const MD3Button: React.FC<MD3ButtonProps> = ({
  title,
  onPress,
  variant = 'filled',
  disabled = false,
  loading = false,
  icon,
  style,
  size = 'normal',
  isDarkMode = false,
}) => {
  // Pure Black & White (Monochrome Theme)
  let containerStyle: ViewStyle = {};
  let textStyle: TextStyle = {
    fontFamily: 'sans-serif-medium',
    fontWeight: '500',
    letterSpacing: 0.25,
  };
  let rippleColor = 'rgba(255, 255, 255, 0.16)';

  const isDark = !!isDarkMode;
  let wrapperBorderStyle: ViewStyle = {};

  if (disabled) {
    containerStyle = variant === 'outlined' || variant === 'text'
      ? { backgroundColor: 'transparent' }
      : { backgroundColor: isDark ? '#334155' : '#E2E8F0' };
    textStyle.color = isDark ? '#475569' : '#94A3B8';
    if (variant === 'outlined') {
      wrapperBorderStyle = {
        borderWidth: 1,
        borderColor: isDark ? '#475569' : '#CBD5E1',
      };
    }
  } else {
    switch (variant) {
      case 'tonal':
        containerStyle = { backgroundColor: isDark ? '#334155' : '#F1F5F9' };
        textStyle.color = isDark ? '#FFFFFF' : '#000000';
        rippleColor = 'rgba(255, 255, 255, 0.08)';
        break;
      case 'outlined':
        containerStyle = { backgroundColor: 'transparent' };
        wrapperBorderStyle = {
          borderWidth: 1,
          borderColor: isDark ? '#FFFFFF' : '#000000',
        };
        textStyle.color = isDark ? '#FFFFFF' : '#000000';
        rippleColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
        break;
      case 'text':
        containerStyle = { backgroundColor: 'transparent' };
        textStyle.color = isDark ? '#FFFFFF' : '#000000';
        rippleColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
        break;
      case 'filled':
      default:
        containerStyle = { backgroundColor: isDark ? '#FFFFFF' : '#000000' };
        textStyle.color = isDark ? '#000000' : '#FFFFFF';
        rippleColor = isDark ? 'rgba(0, 0, 0, 0.16)' : 'rgba(255, 255, 255, 0.16)';
        break;
    }
  }

  const height = size === 'large' ? 56 : 40;
  const paddingHorizontal = size === 'large' ? 40 : 24;
  const fontSize = size === 'large' ? 18 : 14;
  textStyle.fontSize = fontSize;
  if (size === 'large') {
    textStyle.fontWeight = 'bold';
    textStyle.fontFamily = 'sans-serif-medium';
  }

  return (
    <View style={[styles.wrapper, wrapperBorderStyle, containerStyle, style]}>
      <RipplePressable
        onPress={onPress}
        disabled={disabled || loading}
        rippleColor={rippleColor}
        style={[
          styles.button,
          { height, paddingHorizontal }
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'filled' ? (isDark ? '#000000' : '#FFFFFF') : (isDark ? '#FFFFFF' : '#000000')}
            style={{ marginRight: 8 }}
          />
        ) : icon ? (
          <View style={{ marginRight: 8 }}>{icon}</View>
        ) : null}
        <Text style={textStyle}>{title}</Text>
      </RipplePressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    borderRadius: 9999,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
