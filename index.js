// Entry point custom: pornește Expo Router și (doar pe Android) înregistrează
// task handler-ul widget-ului. Pe iOS / web require-ul Android nu se atinge.
import 'expo-router/entry';

import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widget/task-handler');
  registerWidgetTaskHandler(widgetTaskHandler);
}
