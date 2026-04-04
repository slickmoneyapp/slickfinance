import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  DynamicColorIOS,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SFIcon } from '../components/SFIcon';
import { hapticSelection } from '../ui/haptics';
import { CompanyLogo } from '../components/CompanyLogo';
import { searchBrands, type BrandResult } from '../utils/brandSearch';
import { colors } from '../ui/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AddSubscriptionStackParamList } from '../navigation/AddSubscriptionStack';
import {
  POPULAR_SERVICES_BY_SECTION,
  type ServiceTemplate,
} from '../features/subscriptions/addSubscriptionCatalog';

type Props = NativeStackScreenProps<AddSubscriptionStackParamList, 'AddSubscriptionPicker'>;

/** iOS system grouped list — matches UITableView insetGrouped appearance */
const iosGroupedBackground =
  Platform.OS === 'ios' ? DynamicColorIOS({ light: '#F2F2F7', dark: '#000000' }) : colors.bg;
const iosCellBackground =
  Platform.OS === 'ios' ? DynamicColorIOS({ light: '#FFFFFF', dark: '#1C1C1E' }) : colors.surface;
const iosSeparator =
  Platform.OS === 'ios'
    ? DynamicColorIOS({ light: 'rgba(60, 60, 67, 0.36)', dark: 'rgba(84, 84, 88, 0.65)' })
    : 'rgba(11,8,3,0.12)';
const iosSectionHeader =
  Platform.OS === 'ios'
    ? DynamicColorIOS({ light: '#6D6D72', dark: '#8D8D93' })
    : colors.textMuted;
const iosPrimaryLabel =
  Platform.OS === 'ios' ? DynamicColorIOS({ light: '#000000', dark: '#FFFFFF' }) : colors.text;
const iosSecondaryLabel =
  Platform.OS === 'ios'
    ? DynamicColorIOS({ light: 'rgba(60, 60, 67, 0.6)', dark: 'rgba(235, 235, 245, 0.6)' })
    : colors.textMuted;
const iosChevron =
  Platform.OS === 'ios'
    ? DynamicColorIOS({ light: 'rgba(60, 60, 67, 0.3)', dark: 'rgba(235, 235, 245, 0.3)' })
    : 'rgba(11,8,3,0.25)';

const INSET_H = 16;
const GROUP_RADIUS = 10;
const ROW_ICON = 29;
const SEPARATOR_INSET = INSET_H + ROW_ICON + 12;

export function AddSubscriptionPickerScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [apiResults, setApiResults] = useState<BrandResult[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    <View style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: scrollBottomPad }]}
        contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={Platform.OS !== 'ios'}
        keyboardDismissMode="on-drag"
      >
        <View style={s.searchTopWrap}>
          <View style={s.searchFieldOuter}>
            {apiLoading ? (
              <ActivityIndicator size="small" color={iosSecondaryLabel} style={{ marginRight: 8 }} />
            ) : (
              <SFIcon name="magnifyingglass" size={16} color={iosSecondaryLabel} style={{ marginRight: 8 }} />
            )}
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search"
              placeholderTextColor={iosSecondaryLabel}
              style={s.searchInput}
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
                <SFIcon name="xmark.circle.fill" size={16} color={iosSecondaryLabel} />
              </Pressable>
            )}
          </View>
        </View>

        {hasQuery && (
          <>
            {apiLoading && apiResults.length === 0 ? (
              <View style={s.loadingBlock}>
                <ActivityIndicator size="large" color={iosSecondaryLabel} />
              </View>
            ) : apiResults.length > 0 ? (
              <InsetSection title="Results">
                {apiResults.map((item, idx) => (
                  <View key={item.domain + idx}>
                    {idx > 0 ? <Hairline insetLeft={SEPARATOR_INSET} /> : null}
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => selectService(item)}
                      style={({ pressed }) => [s.tableRow, pressed && s.pressed]}
                    >
                      <CompanyLogo domain={item.domain} size={ROW_ICON} rounded={8} fallbackText={item.name} />
                      <View style={s.cellTextCol}>
                        <Text style={s.cellTitle} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={s.cellSubtitle} numberOfLines={1}>
                          {item.domain}
                        </Text>
                      </View>
                      <SFIcon name="chevron.right" size={14} color={iosChevron} style={s.chevron} />
                    </Pressable>
                  </View>
                ))}
              </InsetSection>
            ) : (
              <View style={s.emptyHint}>
                <Text style={s.emptyHintText}>No results for "{search.trim()}"</Text>
              </View>
            )}

            <InsetSection title="Custom">
              <Pressable
                accessibilityRole="button"
                onPress={startCustom}
                style={({ pressed }) => [s.tableRow, s.tableRowSingleLine, pressed && s.pressed]}
              >
                <View style={s.symbolGlyph}>
                  <SFIcon name="plus.circle.fill" size={22} color="#30CE5A" />
                </View>
                <View style={s.cellTextCol}>
                  <Text style={s.cellTitle}>Add "{search.trim()}" manually</Text>
                  <Text style={s.cellSubtitle}>Set your own logo, price, and details</Text>
                </View>
                <SFIcon name="chevron.right" size={14} color={iosChevron} style={s.chevron} />
              </Pressable>
            </InsetSection>
          </>
        )}

        {!hasQuery && (
          <>
            <InsetSection title="Quick actions">
              <TableActionRow
                icon="photo"
                title="Import from photos"
                subtitle="Receipt, bill or renewal screenshots"
                locked
              />
              <Hairline insetLeft={SEPARATOR_INSET} />
              <TableActionRow
                icon="doc.text"
                title="Import a file"
                subtitle="Bank statement or spreadsheet (PDF or CSV)"
                locked
              />
              <Hairline insetLeft={SEPARATOR_INSET} />
              <TableActionRow
                icon="plus.circle.fill"
                title="Custom subscription"
                subtitle="Enter details yourself"
                onPress={startCustom}
                iconTint="#30CE5A"
              />
            </InsetSection>

            {filteredPopular.map((group) => (
              <InsetSection key={group.section} title={group.section}>
                {group.items.map((item, idx) => (
                  <View key={item.name}>
                    {idx > 0 ? <Hairline insetLeft={SEPARATOR_INSET} /> : null}
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => selectService(item)}
                      style={({ pressed }) => [s.tableRow, s.tableRowSingleLine, pressed && s.pressed]}
                    >
                      <CompanyLogo domain={item.domain} size={ROW_ICON} rounded={8} fallbackText={item.name} />
                      <Text style={[s.cellTitle, s.cellTitleFlex]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <SFIcon name="chevron.right" size={14} color={iosChevron} style={s.chevron} />
                    </Pressable>
                  </View>
                ))}
              </InsetSection>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InsetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.sectionWrap}>
      <Text style={s.sectionHeader}>{title}</Text>
      <View style={s.insetGroup}>{children}</View>
    </View>
  );
}

function Hairline({ insetLeft }: { insetLeft: number }) {
  return <View style={[s.hairline, { marginLeft: insetLeft }]} />;
}

function TableActionRow({
  icon,
  title,
  subtitle,
  locked,
  onPress,
  iconTint,
}: {
  icon: string;
  title: string;
  subtitle: string;
  locked?: boolean;
  onPress?: () => void;
  iconTint?: string;
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
        <SFIcon name={icon} size={22} color={iconTint ?? iosPrimaryLabel} />
      </View>
      <View style={s.cellTextCol}>
        <Text style={s.cellTitle}>{title}</Text>
        <Text style={s.cellSubtitle}>{subtitle}</Text>
      </View>
      {locked ? (
        <SFIcon name="lock.fill" size={14} color={iosSecondaryLabel} style={s.chevron} />
      ) : (
        <SFIcon name="chevron.right" size={14} color={iosChevron} style={s.chevron} />
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: iosGroupedBackground },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  pressed: { opacity: 0.55 },
  searchTopWrap: {
    paddingHorizontal: INSET_H,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: iosGroupedBackground,
  },
  searchFieldOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: iosCellBackground,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '400',
    color: iosPrimaryLabel,
    paddingVertical: Platform.OS === 'ios' ? 4 : 2,
  },
  sectionWrap: {
    marginTop: 20,
  },
  sectionHeader: {
    marginLeft: INSET_H + 4,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.08,
    color: iosSectionHeader,
    textTransform: 'uppercase',
  },
  insetGroup: {
    marginHorizontal: INSET_H,
    borderRadius: GROUP_RADIUS,
    backgroundColor: iosCellBackground,
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
    color: iosPrimaryLabel,
  },
  cellTitleFlex: { flex: 1, marginLeft: 12 },
  cellSubtitle: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '400',
    color: iosSecondaryLabel,
  },
  chevron: { marginLeft: 6 },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: iosSeparator,
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
  emptyHintText: { fontSize: 15, fontWeight: '400', color: iosSecondaryLabel, textAlign: 'center' },
});
