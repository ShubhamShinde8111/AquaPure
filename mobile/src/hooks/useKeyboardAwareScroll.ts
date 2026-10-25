import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ScrollView,
  Keyboard,
  Platform,
  Dimensions,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface UseKeyboardAwareScrollOptions {
  /**
   * Extra clearance in pixels between the bottom of the focused input and top of keyboard.
   * Default: 36px.
   */
  keyboardClearance?: number;
  /**
   * Spacing in pixels below the safe-area top inset to position the focused field.
   * Default: 20px.
   */
  topMargin?: number;
}

export function useKeyboardAwareScroll(options: UseKeyboardAwareScrollOptions = {}) {
  const { keyboardClearance = 36, topMargin = 20 } = options;
  const insets = useSafeAreaInsets();

  const scrollViewRef = useRef<React.ComponentRef<typeof ScrollView> | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardHeightRef = useRef(0);
  const scrollYRef = useRef(0);
  const formCardYRef = useRef(0);
  const fieldLayoutsRef = useRef<Record<string, { y: number; height: number }>>({});
  const activeFieldRef = useRef<string | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  const registerCardLayout = useCallback((event: LayoutChangeEvent) => {
    formCardYRef.current = event.nativeEvent.layout.y;
  }, []);

  const registerFieldLayout = useCallback((fieldKey: string) => {
    return (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      fieldLayoutsRef.current[fieldKey] = { y, height };
    };
  }, []);

  const scrollToField = useCallback(
    (fieldKey: string, overrideKbHeight?: number) => {
      const field = fieldLayoutsRef.current[fieldKey];
      if (!field) {
        // If layout hasn't arrived yet, retry briefly
        setTimeout(() => {
          if (activeFieldRef.current === fieldKey) {
            scrollToField(fieldKey, overrideKbHeight);
          }
        }, 60);
        return;
      }

      const cardY = formCardYRef.current;
      const fieldTop = cardY + field.y;
      const fieldHeight = field.height;
      const currentKb = overrideKbHeight ?? keyboardHeightRef.current;
      const effectiveKb =
        currentKb > 0 ? currentKb : Platform.OS === 'ios' ? 336 : 280;

      const screenHeight = Dimensions.get('window').height;
      const currentScrollY = scrollYRef.current;
      const fieldScreenTop = fieldTop - currentScrollY;
      const fieldScreenBottom = fieldScreenTop + fieldHeight;
      const keyboardTopScreen = screenHeight - effectiveKb - insets.bottom;

      // Check if field is already fully visible with ample safety margins
      const isAlreadyComfortablyVisible =
        fieldScreenTop >= insets.top + 8 &&
        fieldScreenBottom <= keyboardTopScreen - keyboardClearance;

      // Only scroll if it would be covered or clipped
      if (!isAlreadyComfortablyVisible || overrideKbHeight !== undefined) {
        // Position the top of the input comfortably below the status bar/top inset
        const targetY = Math.max(0, fieldTop - (insets.top + topMargin));
        scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
      }
    },
    [insets.top, insets.bottom, keyboardClearance, topMargin]
  );

  const handleFieldFocus = useCallback(
    (fieldKey: string) => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      activeFieldRef.current = fieldKey;
      scrollToField(fieldKey);

      // Follow-up scroll ensures smooth adjustment after keyboard animation starts
      setTimeout(() => {
        if (activeFieldRef.current === fieldKey) {
          scrollToField(fieldKey);
        }
      }, 80);
    },
    [scrollToField]
  );

  const handleFieldBlur = useCallback((fieldKey: string) => {
    blurTimeoutRef.current = setTimeout(() => {
      if (activeFieldRef.current === fieldKey) {
        activeFieldRef.current = null;
      }
    }, 150);
  }, []);

  useEffect(() => {
    const onKeyboardShow = (e: any) => {
      const height = e.endCoordinates?.height || 0;
      setKeyboardHeight(height);
      keyboardHeightRef.current = height;
      if (activeFieldRef.current) {
        scrollToField(activeFieldRef.current, height);
      }
    };

    const onKeyboardHide = () => {
      setKeyboardHeight(0);
      keyboardHeightRef.current = 0;
    };

    // iOS supports willShow/willHide for smoother anticipation
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onKeyboardShow
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onKeyboardHide
    );

    // Also listen to didShow on iOS for post-animation accuracy
    const didShowSub =
      Platform.OS === 'ios'
        ? Keyboard.addListener('keyboardDidShow', onKeyboardShow)
        : null;

    return () => {
      showSub.remove();
      hideSub.remove();
      didShowSub?.remove();
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, [scrollToField]);

  return {
    scrollViewRef,
    keyboardHeight,
    handleScroll,
    registerCardLayout,
    registerFieldLayout,
    handleFieldFocus,
    handleFieldBlur,
    scrollToField,
  };
}
