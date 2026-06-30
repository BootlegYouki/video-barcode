import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { Trash } from 'phosphor-react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const BUTTON_WIDTH = 80;
const SWIPE_THRESHOLD = -40;

interface SwipeableItemProps {
  children: React.ReactNode;
  onDelete: () => void;
}

export const SwipeableItem: React.FC<SwipeableItemProps> = ({ children, onDelete }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isOpen, setIsOpen] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Trigger swipe on horizontal movement only
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 8;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow swiping to the left (negative values)
        if (gestureState.dx < 0) {
          translateX.setValue(gestureState.dx);
        } else {
          translateX.setValue(0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < SWIPE_THRESHOLD) {
          // Snap open
          Animated.spring(translateX, {
            toValue: -BUTTON_WIDTH,
            useNativeDriver: true,
            friction: 7,
            tension: 45,
          }).start(() => {
            setIsOpen(true);
          });
        } else {
          // Snap closed
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 7,
            tension: 45,
          }).start(() => {
            setIsOpen(false);
          });
        }
      },
    })
  ).current;

  const handleClose = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 7,
      tension: 45,
    }).start(() => {
      setIsOpen(false);
    });
  };

  return (
    <View style={styles.container}>
      {/* Full-screen backdrop to intercept taps outside when open */}
      {isOpen && (
        <Pressable
          style={styles.backdrop}
          onPress={handleClose}
        />
      )}

      {/* Background action (Delete button) */}
      <View style={styles.backContainer}>
        <Pressable
          onPress={() => {
            handleClose();
            onDelete();
          }}
          style={styles.deleteButton}
        >
          <Trash size={22} color="#FFFFFF" weight="bold" />
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>

      {/* Foreground card */}
      <Animated.View
        style={[
          styles.frontContainer,
          {
            transform: [{ translateX: translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#EF4444',
  },
  backdrop: {
    position: 'absolute',
    top: -SCREEN_HEIGHT,
    bottom: -SCREEN_HEIGHT,
    left: -SCREEN_WIDTH,
    right: -SCREEN_WIDTH,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  backContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  deleteButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: '#EF4444',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    fontFamily: 'sans-serif-medium',
  },
  frontContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    zIndex: 3,
  },
});
