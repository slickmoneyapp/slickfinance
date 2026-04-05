import { DynamicColorIOS, Platform, StyleSheet } from 'react-native';
import { colors, figma, spacing } from '../../ui/theme';

export const iosDynamic = (light: string, dark: string, fallback: string = light) =>
  Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : fallback;

export const IOS_CARD_BG = iosDynamic('#FFFFFF', '#1C1C1E');
export const IOS_PRIMARY = iosDynamic('#111111', '#FFFFFF', colors.text);
export const IOS_SECONDARY = iosDynamic(
  'rgba(60, 60, 67, 0.62)',
  'rgba(235, 235, 245, 0.60)',
  colors.textMuted,
);
export const IOS_SEPARATOR = iosDynamic(
  'rgba(60, 60, 67, 0.24)',
  'rgba(84, 84, 88, 0.65)',
  colors.borderSoft,
);
export const IOS_ROW_HIGHLIGHT = iosDynamic(
  'rgba(120, 120, 128, 0.12)',
  'rgba(118, 118, 128, 0.24)',
);

/** System red — matches destructive controls in Settings / UITableView. */
export const IOS_DESTRUCTIVE = iosDynamic('#FF3B30', '#FF453A', '#E53935');

export const androidTextFix =
  Platform.OS === 'android' ? ({ includeFontPadding: false } as const) : {};

export const subscriptionFormStyles = StyleSheet.create({
  scroll: { flex: 1 },
  detailsScrollContent: {
    paddingHorizontal: figma.subscriptions273.cardInsetX,
    paddingTop: 4,
    paddingBottom: 200,
  },
  heroCard: {
    alignSelf: 'stretch',
    gap: 16,
    paddingBottom: 24,
  },
  heroChipsScroll: {
    alignSelf: 'stretch',
    minHeight: 48,
    marginHorizontal: -figma.subscriptions273.cardInsetX,
  },
  heroChipsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: figma.subscriptions273.contentPaddingX,
    paddingRight: figma.subscriptions273.contentPaddingX,
  },
  heroChipWrap: { flexShrink: 0 },
  heroChipPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 30,
    borderWidth: 0,
    backgroundColor: IOS_CARD_BG,
  },
  heroChipPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroChipPillText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    color: '#616161',
    ...androidTextFix,
  },
  heroTextColumn: {
    paddingHorizontal: figma.subscriptions273.textColumnGutterX,
    alignSelf: 'stretch',
  },
  collapsed: {
    height: 0,
    overflow: 'hidden' as const,
    opacity: 0,
  },
  groupedCard: {
    backgroundColor: IOS_CARD_BG,
    borderRadius: 24,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 10,
  },
  rowPressed: { backgroundColor: IOS_ROW_HIGHLIGHT },
  cellLabelCol: { flex: 1, justifyContent: 'center', gap: 3 },
  cellRightCol: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryText: { fontSize: 16, fontWeight: '600', color: IOS_PRIMARY },
  secondaryText: { fontSize: 16, fontWeight: '500', color: IOS_SECONDARY },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: IOS_SEPARATOR,
    marginLeft: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: spacing.sectionTitleToCard,
  },
  sectionHeaderFirst: { marginTop: 8 },
  heroStack: {
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    gap: 24,
  },
  heroTitlePrice: {
    alignSelf: 'stretch',
    gap: 16,
  },
  /** Outer square (add / edit / preview hero) — logo asset is 48×48 inside. */
  heroLogoCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroFallbackText: {
    fontSize: 24,
    fontWeight: '800',
    /** On `colors.bg`; IOS_PRIMARY → white in dark mode = invisible on gray. */
    color: colors.text,
  },
  heroNameInput: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 34,
    lineHeight: 42,
    color: colors.text,
    textAlign: 'left',
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 42,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  heroPrice: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  heroSub: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  amountInput: {
    fontSize: 17,
    fontWeight: '600',
    color: IOS_PRIMARY,
    textAlign: 'right',
    minWidth: 100,
    paddingVertical: 0,
  },
  nativeNotesInput: {
    fontSize: 16,
    fontWeight: '400',
    color: IOS_PRIMARY,
    minHeight: 88,
    paddingHorizontal: 20,
    paddingVertical: 16,
    textAlignVertical: 'top',
  },
  urlInput: {
    fontSize: 16,
    fontWeight: '400',
    color: IOS_PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  customCycleInput: {
    fontSize: 17,
    fontWeight: '600',
    color: IOS_PRIMARY,
    textAlign: 'right',
    minWidth: 48,
    paddingVertical: 0,
  },
  /** Inset-grouped style destructive row (Settings / native list). */
  iosDestructiveRow: {
    marginTop: 24,
    alignSelf: 'stretch',
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: IOS_CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  iosDestructiveRowText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    color: IOS_DESTRUCTIVE,
    ...androidTextFix,
  },
});
