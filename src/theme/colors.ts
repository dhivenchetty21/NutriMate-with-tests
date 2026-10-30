// Colour palette used across the app.
export const colors = {
  paper: '#F5EEDF',
  paperDeep: '#EEE3CC',
  surface: '#FFFDF8',
  ink: '#23281F',
  muted: '#6E7566',
  faint: '#9BA096',
  forest: '#2E5C43',
  forestDeep: '#1E3F2E',
  forestTint: '#E4EEE2',
  clay: '#BE5A2C',
  clayTint: '#F5DECB',
  maize: '#DFA23A',
  maizeTint: '#FAEACB',
  rule: '#DCD0B4',
  ruleStrong: '#C9BC9B',
  danger: '#B14A3D',
  dangerTint: '#F3DAD2',
  tabActive: '#F5EEDF',
  tabInactive: '#9DB0A0',
  creamText: '#F7F2E4',

  // Aliases used by shared components
  primaryGreen: '#2E5C43',
  warmCream: '#F5EEDF',
  softGreen: '#E4EEE2',
  accentOrange: '#BE5A2C',
  error: '#B14A3D',
  budgetWarning: '#DFA23A',
  mutedText: '#6E7566',
  divider: '#DCD0B4',
  white: '#FFFDF8',
} as const;

export type BudgetStatus = 'safe' | 'caution' | 'over';

export function getBudgetStatus(
  percentUsed: number,
  mode: 'summary' | 'detail' = 'summary',
): BudgetStatus {
  if (mode === 'detail') {
    if (percentUsed >= 95) return 'over';
    if (percentUsed >= 75) return 'caution';
    return 'safe';
  }
  if (percentUsed > 90) return 'over';
  if (percentUsed > 75) return 'caution';
  return 'safe';
}

export function getBudgetStatusColor(status: BudgetStatus): string {
  switch (status) {
    case 'over':
      return colors.danger;
    case 'caution':
      return colors.maize;
    default:
      return colors.forest;
  }
}
