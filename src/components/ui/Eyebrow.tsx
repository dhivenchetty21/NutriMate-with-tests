// Small uppercase label shown above headings.
import { StyleSheet, Text, TextProps } from 'react-native';

import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

type EyebrowProps = TextProps & {
  variant?: 'forest' | 'clay';
};

export function Eyebrow({ style, variant = 'forest', children, ...props }: EyebrowProps) {
  return (
    <Text
      style={[
        styles.base,
        variant === 'clay' ? styles.clay : styles.forest,
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    ...typography.eyebrow,
  },
  forest: {
    color: colors.forest,
  },
  clay: {
    color: colors.clay,
  },
});
