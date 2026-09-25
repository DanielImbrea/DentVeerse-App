import {
  OpenSans_400Regular,
  OpenSans_500Medium,
  OpenSans_600SemiBold,
} from '@expo-google-fonts/open-sans';
import * as Font from 'expo-font';

/** Loads Open Sans weights used for buttons (and fallbacks). */
export async function loadAppFonts(): Promise<void> {
  await Font.loadAsync({
    OpenSans_400Regular,
    OpenSans_500Medium,
    OpenSans_600SemiBold,
  });
}
