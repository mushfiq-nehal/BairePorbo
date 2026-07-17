import { useMemo, useState } from "react";
import { View, FlatList, RefreshControl, ActivityIndicator, Pressable, Modal, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { ScholarshipListItem } from "@baireporbo/shared";
import { useApi } from "@/lib/api";
import { useT } from "@/i18n";
import { Txt, Chip, Button } from "@/components/ui";
import { colors, shadow } from "@/theme";

type Facets = { country: Set<string>; degree: Set<string>; funding: Set<string> };

function uniqueSorted(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort();
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View className="flex-row items-center gap-1">
      <Ionicons name={icon} size={13} color={colors.ink400} />
      <Txt className="text-ink-500 text-xs">{text}</Txt>
    </View>
  );
}

function ScholarshipCard({ item }: { item: ScholarshipListItem }) {
  const t = useT();
  return (
    <Link href={`/(tabs)/discover/${item.id}`} asChild>
      <Pressable style={shadow.sm} className="bg-surface rounded-2xl border border-sand-200 mb-3 overflow-hidden active:opacity-90">
        {item.thumbnail_url ? (
          <View className="relative">
            <Image
              source={{ uri: item.thumbnail_url }}
              style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.sand100 }}
              resizeMode="cover"
            />
            {item.is_flagship ? (
              <View className="absolute top-2.5 left-2.5 flex-row items-center gap-1 bg-coral-500 rounded-full px-2.5 py-1">
                <Ionicons name="star" size={11} color={colors.white} />
                <Txt weight="semibold" className="text-white text-[11px]">{t("common.featured")}</Txt>
              </View>
            ) : null}
          </View>
        ) : null}
        <View className="p-4">
          {!item.thumbnail_url && item.is_flagship ? (
            <View className="flex-row mb-2">
              <View className="flex-row items-center gap-1 bg-coral-100 rounded-full px-2.5 py-1">
                <Ionicons name="star" size={11} color={colors.coral500} />
                <Txt weight="semibold" className="text-coral-700 text-[11px]">{t("common.featured")}</Txt>
              </View>
            </View>
          ) : null}
          <Txt font="display" weight="semibold" className="text-ink-900 text-lg leading-6">
            {item.title}
          </Txt>
          <View className="flex-row flex-wrap gap-x-4 gap-y-1.5 mt-3">
            {item.country ? <Meta icon="location-outline" text={item.country} /> : null}
            {item.funding_type ? <Meta icon="cash-outline" text={item.funding_type} /> : null}
            {item.deadline ? <Meta icon="time-outline" text={item.deadline} /> : null}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

function FilterChips({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <View className="mb-5">
      <Txt weight="semibold" className="text-ink-700 mb-2.5">{label}</Txt>
      <View className="flex-row flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected.has(opt);
          return (
            <Pressable
              key={opt}
              onPress={() => onToggle(opt)}
              className={on ? "bg-teal-500 rounded-full px-3.5 py-2" : "bg-sand-100 border border-sand-200 rounded-full px-3.5 py-2"}
            >
              <Txt weight="medium" className={on ? "text-white text-sm" : "text-ink-700 text-sm"}>
                {opt}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function Discover() {
  const api = useApi();
  const t = useT();
  const [filterOpen, setFilterOpen] = useState(false);
  const [facets, setFacets] = useState<Facets>({ country: new Set(), degree: new Set(), funding: new Set() });

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["scholarships"],
    queryFn: () => api.getScholarships(),
  });

  const all = useMemo(() => data?.scholarships ?? [], [data]);
  const options = useMemo(
    () => ({
      country: uniqueSorted(all.map((s) => s.country)),
      degree: uniqueSorted(all.map((s) => s.degree_level)),
      funding: uniqueSorted(all.map((s) => s.funding_type)),
    }),
    [all],
  );
  const filtered = useMemo(
    () =>
      all.filter(
        (s) =>
          (facets.country.size === 0 || (s.country && facets.country.has(s.country))) &&
          (facets.degree.size === 0 || (s.degree_level && facets.degree.has(s.degree_level))) &&
          (facets.funding.size === 0 || (s.funding_type && facets.funding.has(s.funding_type))),
      ),
    [all, facets],
  );
  const activeCount = facets.country.size + facets.degree.size + facets.funding.size;

  function toggle(key: keyof Facets, value: string) {
    setFacets((prev) => {
      const next = new Set(prev[key]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, [key]: next };
    });
  }
  const clearAll = () => setFacets({ country: new Set(), degree: new Set(), funding: new Set() });

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-body items-center justify-center" edges={["bottom"]}>
        <ActivityIndicator color={colors.teal500} />
      </SafeAreaView>
    );
  }
  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-body items-center justify-center px-8" edges={["bottom"]}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.ink400} />
        <Txt className="text-ink-500 text-center mt-3">{t("discover.loadError")}</Txt>
        <View className="mt-4 w-40">
          <Button label={t("common.retry")} variant="outline" size="md" onPress={() => refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-body" edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => setFilterOpen(true)} className="flex-row items-center gap-1.5 px-2 py-1">
              <Ionicons name="options-outline" size={18} color={colors.teal600} />
              <Txt weight="semibold" className="text-teal-600">
                {t("discover.filters")}{activeCount > 0 ? ` (${activeCount})` : ""}
              </Txt>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ScholarshipCard item={item} />}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.teal500} />}
        ListHeaderComponent={
          <Txt className="text-ink-400 text-xs mb-3">{filtered.length} {t("discover.resultsCount")}</Txt>
        }
        ListEmptyComponent={<Txt className="text-ink-400 text-center mt-10">{t("discover.empty")}</Txt>}
      />

      <Modal visible={filterOpen} animationType="slide" transparent onRequestClose={() => setFilterOpen(false)}>
        <Pressable className="flex-1 bg-black/40" onPress={() => setFilterOpen(false)} />
        <View style={shadow.md} className="bg-body rounded-t-3xl max-h-[80%] absolute bottom-0 left-0 right-0 pt-3">
          <View className="items-center pb-2">
            <View className="w-10 h-1.5 rounded-full bg-sand-300" />
          </View>
          <View className="flex-row items-center justify-between px-5 pb-3">
            <Txt font="display" weight="semibold" className="text-ink-900 text-xl">{t("discover.filters")}</Txt>
            <Pressable onPress={clearAll}>
              <Txt weight="medium" className="text-ink-500">{t("discover.clear")}</Txt>
            </Pressable>
          </View>
          <ScrollView className="px-5">
            <FilterChips label={t("discover.filterCountry")} options={options.country} selected={facets.country} onToggle={(v) => toggle("country", v)} />
            <FilterChips label={t("discover.filterDegree")} options={options.degree} selected={facets.degree} onToggle={(v) => toggle("degree", v)} />
            <FilterChips label={t("discover.filterFunding")} options={options.funding} selected={facets.funding} onToggle={(v) => toggle("funding", v)} />
          </ScrollView>
          <SafeAreaView edges={["bottom"]} className="px-5 pt-2 pb-3">
            <Button label={`${t("discover.apply")} (${filtered.length})`} onPress={() => setFilterOpen(false)} />
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
