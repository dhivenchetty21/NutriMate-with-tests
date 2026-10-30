// Shared text styles.
import { TextStyle } from 'react-native';

import { fontFamilies } from './fonts';

export const typography = {
  display: {
    fontFamily: fontFamilies.serifBold,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.3,
  } satisfies TextStyle,
  h1: {
    fontFamily: fontFamilies.serifBold,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 30,
  } satisfies TextStyle,
  h2: {
    fontFamily: fontFamilies.serifSemiBold,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
  } satisfies TextStyle,
  body: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  } satisfies TextStyle,
  caption: {
    fontFamily: fontFamilies.sans,
    fontSize: 12.5,
    fontWeight: '400',
    lineHeight: 18,
  } satisfies TextStyle,
  button: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  } satisfies TextStyle,
  eyebrow: {
    fontFamily: fontFamilies.monoSemiBold,
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  mono: {
    fontFamily: fontFamilies.monoSemiBold,
    fontSize: 13.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,
} as const;
