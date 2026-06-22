import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text } from 'react-native';

import { font, gradientDir, gradients } from '@/constants/theme';

/**
 * Logo-ul „Porto” cu text colorat în gradientul ember (semnătura mărcii).
 * Folosește MaskedView: textul e masca, gradientul e umplutura.
 */
export function BrandLogo({ size = 52 }: { size?: number }) {
  return (
    <MaskedView
      style={{ height: size * 1.15 }}
      maskElement={<Text style={[styles.brand, { fontSize: size }]}>Porto</Text>}
    >
      <LinearGradient
        colors={gradients.ember as unknown as [string, string]}
        locations={gradients.emberLocations}
        start={gradientDir.start}
        end={gradientDir.end}
      >
        {/* Copie transparentă: dă gradientului dimensiunea exactă a textului. */}
        <Text style={[styles.brand, { fontSize: size, opacity: 0 }]}>Porto</Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  brand: {
    fontFamily: font.serif,
    textAlign: 'center',
    color: '#000',
  },
});
