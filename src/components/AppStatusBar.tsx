import { StatusBar, type StatusBarStyle } from 'react-native';

type Props = {
  /** Use light icons on dark headers (e.g. Home green). Default dark icons for white pages. */
  lightContent?: boolean;
};

/**
 * Blinkit-style status bar: translucent so carrier / time / battery stay visible,
 * and icons contrast correctly with the page below.
 */
export function AppStatusBar({ lightContent = false }: Props) {
  const barStyle: StatusBarStyle = lightContent ? 'light-content' : 'dark-content';

  return (
    <StatusBar
      animated
      translucent
      backgroundColor="transparent"
      barStyle={barStyle}
    />
  );
}
