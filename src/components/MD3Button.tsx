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
}) => {
  // Pure Black & White (Monochrome Theme)
  let containerStyle: ViewStyle = {};
  let textStyle: TextStyle = {
    fontFamily: 'sans-serif-medium',
    fontWeight: '500',
    letterSpacing: 0.25,
  };
  let rippleColor = 'rgba(255, 255, 255, 0.16)';

  if (disabled) {
    containerStyle = variant === 'outlined' || variant === 'text'
      ? { backgroundColor: 'transparent' }
      : { backgroundColor: '#E2E8F0' };
    textStyle.color = '#94A3B8';
    if (variant === 'outlined') {
      containerStyle.borderWidth = 1;
      containerStyle.borderColor = '#CBD5E1';
    }
  } else {
    switch (variant) {
      case 'tonal':
        containerStyle = { backgroundColor: '#F1F5F9' };
        textStyle.color = '#000000';
        rippleColor = 'rgba(0, 0, 0, 0.08)';
        break;
      case 'outlined':
        containerStyle = {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: '#000000',
        };
        textStyle.color = '#000000';
        rippleColor = 'rgba(0, 0, 0, 0.08)';
        break;
      case 'text':
        containerStyle = { backgroundColor: 'transparent' };
        textStyle.color = '#000000';
        rippleColor = 'rgba(0, 0, 0, 0.08)';
        break;
      case 'filled':
      default:
        containerStyle = { backgroundColor: '#000000' };
        textStyle.color = '#FFFFFF';
        rippleColor = 'rgba(255, 255, 255, 0.16)';
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
    <View style={[styles.wrapper, style]}>
      <RipplePressable
        onPress={onPress}
        disabled={disabled || loading}
        rippleColor={rippleColor}
        style={[
          styles.button,
          containerStyle,
          { height, paddingHorizontal }
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'filled' ? '#FFFFFF' : '#000000'}
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
