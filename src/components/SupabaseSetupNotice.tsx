import { Linking, Pressable, Text, View } from 'react-native';
import { isSupabaseConfigured } from '../config/env';

const API_SETTINGS_URL =
  'https://supabase.com/dashboard/project/kffsanwjjuapqeyskzku/settings/api';

export function SupabaseSetupNotice() {
  if (isSupabaseConfigured()) {
    return null;
  }

  return (
    <View className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <Text className="text-sm font-semibold text-amber-900 mb-2">
        Supabase key required
      </Text>
      <Text className="text-xs text-amber-800 leading-5 mb-2">
        1. Open Supabase → Settings → API{'\n'}
        2. Copy the anon public key{'\n'}
        3. Paste it in src/config/supabase.keys.ts → anonKey{'\n'}
        4. Restart Metro: npx react-native start --reset-cache
      </Text>
      <Pressable onPress={() => Linking.openURL(API_SETTINGS_URL)}>
        <Text className="text-xs font-semibold text-primary">Open API settings</Text>
      </Pressable>
    </View>
  );
}
