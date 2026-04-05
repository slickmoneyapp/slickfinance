import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SFIcon } from '../components/SFIcon';
import { hapticSelection } from '../ui/haptics';
import { CompanyLogo } from '../components/CompanyLogo';
import { searchBrands, type BrandResult } from '../utils/brandSearch';
import { colors, spacing } from '../ui/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AddSubscriptionStackParamList } from '../navigation/AddSubscriptionStack';
import {
  POPULAR_SERVICES_BY_SECTION,
  type ServiceTemplate,
} from '../features/subscriptions/addSubscriptionCatalog';

type Props = NativeStackScreenProps<AddSubscriptionStackParamList, 'AddSubscriptionPicker'>;

const INSET_H = 16;
const GROUP_RADIUS = 10;
const ROW_ICON = 29;
const SEPARATOR_INSET = INSET_H + ROW_ICON + 12;

/** Plain hex/rgba in StyleSheet only — avoid DynamicColorIOS in StyleSheet (can render invisible after cold start). */
const LIGHT = {
  grouped: '#F2F2F7',
  cell: '#FFFFFF',
  sep: 'rgba(60, 60, 67, 0.36)',
  sectionHdr: '#6D6D72',
  primary: '#000000',
  secondary: 'rgba(60, 60, 67, 0.6)',
  chevron: 'rgba(60, 60, 67, 0.3)',
};
const DARK = {
  grouped: '#000000',
  cell: '#1C1C1E',
  sep: 'rgba(84, 84, 88, 0.65)',
  sectionHdr: '#8D8D93',
  primary: '#FFFFFF',
  secondary: 'rgba(235, 235, 245, 0.6)',
  chevron: 'rgba(235, 235, 245, 0.3)',
};

type BasePalette = typeof LIGHT;
type PickerPalette = BasePalette & { fallbackBg: string; fallbackCell: string };

export function AddSubscriptionPickerScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const C = isDark ? DARK : LIGHT;

  const [search, setSearch] = useState('');
  const [apiResults, setApiResults] = useState<BrandResult[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const palette: PickerPalette = useMemo(
    () => ({
      ...C,
      fallbackBg: Platform.OS === 'ios' ? C.grouped : colors.bg,
      fallbackCell: Platform.OS === 'ios' ? C.cell : colors.surface,
    }),
    [C]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = search.trim();
    if (!q) {
      setApiResults([]);
      setApiLoading(false);
      return;
    }
    setApiLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchBrands(q);
      setApiResults(results);
      setApiLoading(false);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const filteredPopular = useMemo(() => {
    if (search.trim()) return [];
    return POPULAR_SERVICES_BY_SECTION;
  }, [search]);

  function selectService(t: ServiceTemplate | BrandResult) {
    void hapticSelection();
    navigation.navigate('AddSubscriptionForm', {
      serviceName: t.name,
      domain: t.domain,
      category: 'category' in t ? t.category : 'Other',
    });
  }

  function startCustom() {
    void hapticSelection();
    navigation.navigate('AddSubscriptionForm', {
      serviceName: search.trim() ? search.trim() : '',
      domain: '',
      category: 'Other',
    });
  }

  const hasQuery = search.trim().length > 0;
  const scrollBottomPad = Math.max(insets.bottom, 16);

  return (
    <View style={[s.root, { backgroundColor: palette.fallbackBg }]}>
      <ScrollView
        style={[s.scroll, { backgroundColor: palette.fallbackBg }]}
        contentContainerStyle={[s.scrollContent, { paddingTop: 8, paddingBottom: scrollBottomPad }]}
        contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'never' : undefined}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={Platform.OS !== 'ios'}
        keyboardDismissMode="on-drag"
      >
        <View style={[s.searchTopWrap, { backgroundColor: palette.fallbackBg }]}>
          <View style={[s.searchFieldOuter, { backgroundColor: palette.fallbackCell }]}>
            {apiLoading ? (
              <ActivityIndicator size="small" color={palette.secondary} style={{ marginRight: 8 }} />
            ) : (
              <SFIcon name="magnifyingglass" size={16} color={palette.secondary} style={{ marginRight: 8 }} />
            )}
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search"
              placeholderTextColor={palette.secondary}
              style={[s.searchInput, { color: palette.primary }]}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable
                onPress={() => {
                  void hapticSelection();
                  setSearch('');
                }}
                hitSlop={8}
              >
                <SFIcon name="xmark.circle.fill" size={16} color={palette.secondary} />
              </Pressable>
            )}
          </View>
        </View>

        {hasQuery && (
          <>
            {apiLoading && apiResults.length === 0 ? (
              <View style={s.loadingBlock}>
                <ActivityIndicator size="large" color={palette.secondary} />
              </View>
            ) : apiResults.length > 0 ? (
              <InsetSection title="Results" palette={palette}>
                {apiResults.map((item, idx) => (
                  <View key={item.domain + idx}>
                    {idx > 0 ? <Hairline insetLeft={SEPARATOR_INSET} sepColor={palette.sep} /> : null}
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => selectService(item)}
                      style={({ pressed }) => [s.tableRow, pressed && s.pressed]}
                    >
                      <CompanyLogo domain={item.domain} size={ROW_ICON} rounded={8} fallbackText={item.name} />
                      <View style={s.cellTextCol}>
                        <Text style={[s.cellTitle, { color: palette.primary }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[s.cellSubtitle, { color: palette.secondary }]} numberOfLines={1}>
                          {item.domain}
                        </Text>
                      </View>
                      <SFIcon name="chevron.right" size={14} color={palette.chevron} style={s.chevron} />
                    </Pressable>
                  </View>
                ))}
              </InsetSection>
            ) : (
              <View style={s.emptyHint}>
                <Text style={[s.emptyHintText, { color: palette.secondary }]}>
                  No results for "{search.trim()}"
                </Text>
              </View>
            )}

            <InsetSection title="Custom" palette={palette}>
              <Pressable
                accessibilityRole="button"
                onPress={startCustom}
                style={({ pressed }) => [s.tableRow, s.tableRowSingleLine, pressed && s.pressed]}
              >
                <View style={s.symbolGlyph}>
                  <SFIcon name="plus.circle.fill" size={22} color="#30CE5A" />
                </View>
                <View style={s.cellTextCol}>
                  <Text style={[s.cellTitle, { color: palette.primary }]}>Add "{search.trim()}" manually</Text>
                  <Text style={[s.cellSubtitle, { color: palette.secondary }]}>
                    Set your own logo, price, and details
                  </Text>
                </View>
                <SFIcon name="chevron.right" size={14} color={palette.chevron} style={s.chevron} />
              </Pressable>
            </InsetSection>
          </>
        )}

        {!hasQuery && (
          <>
            <InsetSection title="Quick actions" palette={palette}>
              <TableActionRow
                icon="photo"
                title="Import from photos"
                subtitle="Receipt, bill or renewal screenshots"
                locked
                palette={palette}
              />
              <Hairline insetLeft={SEPARATOR_INSET} sepColor={palette.sep} />
              <TableActionRow
                icon="doc.text"
                title="Import a file"
                subtitle="Bank statement or spreadsheet (PDF or CSV)"
                locked
                palette={palette}
              />
              <Hairline insetLeft={SEPARATOR_INSET} sepColor={palette.sep} />
              <TableActionRow
                icon="plus.circle.fill"
                title="Custom subscription"
                subtitle="Enter details yourself"
                onPress={startCustom}
                iconTint="#30CE5A"
                palette={palette}
              />
            </InsetSection>

            {filteredPopular.map((group) => (
              <View key={group.section} style={s.catSectionWrap}>
                <Text style={[s.catSectionHeader, { color: palette.sectionHdr }]}>
                  {group.section}
                </Text>
                <View style={[s.catCard, { backgroundColor: palette.fallbackCell }]}>
                  {group.items.map((item, idx) => (
                    <View key={item.name}>
                      {idx > 0 && (
                        <View style={[s.catSep, { backgroundColor: palette.sep }]} />
                      )}
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => selectService(item)}
                        style={({ pressed }) => [s.catRow, pressed && s.catRowPressed]}
                      >
                        <View style={s.catLogoCircle}>
                          <CompanyLogo
                            domain={item.domain}
                            size={28}
                            rounded={14}
                            fallbackText={item.name}
                          />
                        </View>
                        <View style={s.catTextCol}>
                          <Text style={[s.catName, { color: palette.primary }]} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={[s.catDomain, { color: palette.secondary }]} numberOfLines={1}>
                            {item.domain}
                          </Text>
                        </View>
                        <SFIcon name="chevron.right" size={14} color={palette.chevron} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InsetSection({
  title,
  children,
  palette,
}: {
  title: string;
  children: React.ReactNode;
  palette: PickerPalette;
}) {
  return (
    <View style={s.sectionWrap}>
      <Text style={[s.sectionHeader, { color: palette.sectionHdr }]}>{title}</Text>
      <View style={[s.insetGroup, { backgroundColor: palette.fallbackCell }]}>{children}</View>
    </View>
  );
}

function Hairline({ insetLeft, sepColor }: { insetLeft: number; sepColor: string }) {
  return <View style={[s.hairline, { marginLeft: insetLeft, backgroundColor: sepColor }]} />;
}

function TableActionRow({
  icon,
  title,
  subtitle,
  locked,
  onPress,
  iconTint,
  palette,
}: {
  icon: string;
  title: string;
  subtitle: string;
  locked?: boolean;
  onPress?: () => void;
  iconTint?: string;
  palette: PickerPalette;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!locked }}
      disabled={locked}
      onPress={locked ? undefined : onPress}
      style={({ pressed }) => [s.tableRow, !locked && pressed && s.pressed, locked && s.rowDisabled]}
    >
      <View style={s.symbolGlyph}>
        <SFIcon name={icon} size={22} color={iconTint ?? palette.primary} />
      </View>
      <View style={s.cellTextCol}>
        <Text style={[s.cellTitle, { color: palette.primary }]}>{title}</Text>
        <Text style={[s.cellSubtitle, { color: palette.secondary }]}>{subtitle}</Text>
      </View>
      {locked ? (
        <SFIcon name="lock.fill" size={14} color={palette.secondary} style={s.chevron} />
      ) : (
        <SFIcon name="chevron.right" size={14} color={palette.chevron} style={s.chevron} />
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  pressed: { opacity: 0.55 },
  searchTopWrap: {
    paddingHorizontal: INSET_H,
    paddingTop: 8,
    paddingBottom: 10,
  },
  searchFieldOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '400',
    paddingVertical: Platform.OS === 'ios' ? 4 : 2,
  },
  sectionWrap: {
    marginTop: 20,
  },
  sectionHeader: {
    marginLeft: INSET_H + 4,
    marginBottom: spacing.sectionTitleToCard,
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.08,
    textTransform: 'uppercase',
  },
  insetGroup: {
    marginHorizontal: INSET_H,
    borderRadius: GROUP_RADIUS,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingLeft: INSET_H,
    paddingRight: 12,
    paddingVertical: 10,
  },
  tableRowSingleLine: {
    minHeight: 44,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  cellTextCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
    minHeight: ROW_ICON,
  },
  cellTitle: {
    fontSize: 17,
    fontWeight: '400',
  },
  cellTitleFlex: { flex: 1, marginLeft: 12 },
  cellSubtitle: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '400',
  },
  chevron: { marginLeft: 6 },
  hairline: {
    height: StyleSheet.hairlineWidth,
  },
  symbolGlyph: {
    width: ROW_ICON,
    height: ROW_ICON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowDisabled: { opacity: 0.45 },
  loadingBlock: { paddingTop: 40, alignItems: 'center' },
  emptyHint: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 24 },
  emptyHintText: { fontSize: 15, fontWeight: '400', textAlign: 'center' },

  catSectionWrap: {
    marginTop: 24,
  },
  catSectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 20,
    marginBottom: spacing.sectionTitleToCard,
  },
  catCard: {
    marginHorizontal: INSET_H,
    borderRadius: 24,
    overflow: 'hidden',
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  catRowPressed: {
    backgroundColor: 'rgba(120, 120, 128, 0.12)',
  },
  catLogoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  catTextCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  catName: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 21,
  },
  catDomain: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 19,
  },
  catSep: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 86,
    marginRight: 16,
  },
});
