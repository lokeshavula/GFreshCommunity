/**
 * @format
 */

import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import './global.css';
import { AppRegistry, Platform } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

if (Platform.OS === 'web') {
  // Inject Ionicons web font so all icons render properly
  const iconFontStyles = `
    @font-face {
      font-family: 'Ionicons';
      src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.3.0/Fonts/Ionicons.ttf') format('truetype'),
           url('https://unpkg.com/react-native-vector-icons@10.3.0/Fonts/Ionicons.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: block;
    }
  `;
  const style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(document.createTextNode(iconFontStyles));
  document.head.appendChild(style);

  const rootTag = document.getElementById('root') || document.getElementById('main');
  if (rootTag) {
    AppRegistry.runApplication(appName, { rootTag });
  }
}
