import React from 'react';
import { Pressable, PressableProps, Platform, StyleProp, ViewStyle } from 'react-native';

interface RipplePressableProps extends PressableProps {
  rippleColor?: string;
  borderless?: boolean;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  className?: string;
  children: React.ReactNode;
}

export const RipplePressable: React.FC<RipplePressableProps> = ({
  rippleColor = 'rgba(103, 80, 164, 0.16)', // Subtle primary ripple
  borderless = false,
  style,
  className,
  children,
  ...props
}) => {
  return (
    <Pressable
      android_ripple={{
        color: rippleColor,
        borderless: borderless,
      }}
      className={className}
      style={({ pressed }) => {
        // Fallback opacity for iOS/Web if android_ripple is not supported
        const iosStyle = Platform.OS !== 'android' && pressed ? { opacity: 0.7 } : {};
        const baseStyle = typeof style === 'function' ? style({ pressed }) : style;
        return [baseStyle, iosStyle];
      }}
      {...props}
    >
      {children}
    </Pressable>
  );
};
