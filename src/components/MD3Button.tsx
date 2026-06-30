import React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { RipplePressable } from './RipplePressable';

interface MD3ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'filled' | 'tonal' | 'outlined' | 'text';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const MD3Button: React.FC<MD3ButtonProps> = ({
  title,
  onPress,
  variant = 'filled',
  disabled = false,
  loading = false,
  icon,
  className = '',
}) => {
  // Define Material 3 Theme colors (solid only)
  // Primary Purple: #6750A4, On Primary: #FFFFFF
  // Secondary Tonal Container: #E8DEF8, On Secondary Container: #1D192B
  // Outline border: #79747E, Outline text: #6750A4
  
  let containerBg = 'bg-[#6750A4]';
  let textColor = 'text-[#FFFFFF]';
  let borderStyle = '';
  let rippleColor = 'rgba(255, 255, 255, 0.16)';

  if (disabled) {
    containerBg = variant === 'outlined' || variant === 'text' ? 'bg-transparent' : 'bg-slate-200';
    textColor = 'text-slate-400';
    borderStyle = variant === 'outlined' ? 'border border-slate-300' : '';
  } else {
    switch (variant) {
      case 'tonal':
        containerBg = 'bg-[#E8DEF8]';
        textColor = 'text-[#1D192B]';
        rippleColor = 'rgba(103, 80, 164, 0.12)';
        break;
      case 'outlined':
        containerBg = 'bg-transparent';
        textColor = 'text-[#6750A4]';
        borderStyle = 'border border-[#79747E]';
        rippleColor = 'rgba(103, 80, 164, 0.12)';
        break;
      case 'text':
        containerBg = 'bg-transparent';
        textColor = 'text-[#6750A4]';
        rippleColor = 'rgba(103, 80, 164, 0.12)';
        break;
      case 'filled':
      default:
        containerBg = 'bg-[#6750A4]';
        textColor = 'text-[#FFFFFF]';
        rippleColor = 'rgba(255, 255, 255, 0.16)';
        break;
    }
  }

  return (
    <View className={`overflow-hidden rounded-full ${className}`}>
      <RipplePressable
        onPress={onPress}
        disabled={disabled || loading}
        rippleColor={rippleColor}
        className={`flex-row items-center justify-center px-6 h-10 ${containerBg} ${borderStyle}`}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'filled' ? '#FFFFFF' : '#6750A4'}
            className="mr-2"
          />
        ) : icon ? (
          <View className="mr-2">{icon}</View>
        ) : null}
        <Text className={`font-medium text-sm tracking-wide ${textColor}`}>
          {title}
        </Text>
      </RipplePressable>
    </View>
  );
};
