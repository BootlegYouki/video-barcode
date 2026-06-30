import React from 'react';
import { Pressable, PressableProps, Platform, StyleProp, ViewStyle } from 'react-native';

interface RipplePressableProps extends PressableProps {
  rippleColor?: string;
  borderless?: boolean;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  children: React.ReactNode;
}

export const RipplePressable: React.FC<RipplePressableProps> = ({
  rippleColor = 'rgba(0, 0, 0, 0.1)',
  borderless = false,
  style,
  children,
  ...props
}) => {
  return (
    <Pressable
      android_ripple={{
        color: rippleColor,
        borderless: borderless,
      }}
      style={({ pressed }) => {
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
