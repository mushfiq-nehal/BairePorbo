import { useMemo, useState } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { ScholarshipListItem } from "@baireporbo/shared";
import { useApi } from "@/lib/api";
import { useT } from "@/i18n";
import { AppText } from "@/components/AppText";

type Facets = { country: Set<string>; degree: Set<string>; funding: Set<string> };

function uniqueSorted(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort();
}

function ScholarshipCard({ item }: { item: ScholarshipListItem }) {
  const t = useT();
  return (
    <Link href={`/(tabs)/discover/${item.id}`} asChild>
      <Pressable className="bg-slate-800 rounded-2xl p-4 mb-3 active:opacity-80">
        <View className="flex-row items-start justify-between gap-2">
          <AppText bold className="text-white text-base font-semibold flex-1">
            {item.title}
          </AppText>
          {item.is_flagship ? (
            <AppText className="text-amber-400 text-xs">{t("discover.flagship")}</AppText>
          ) : null}
        </View>
        <View className="flex-row flex-wrap gap-x-3 gap-y-1 mt-2">
          {item.country ? (
            <AppText className="text-slate-400 text-xs">📍 {item.country}</AppText>
          ) : null}
          {item.funding_type ? (
            <AppText className="text-slate-400 text-xs">💰 {item.funding_type}</AppText>
          ) : null}
          {item.deadline ? (
            <AppText className="text-slate-400 text-xs">⏳ {item.deadline}</AppText>
          ) : null}
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
    <View className="mb-4">
      <AppText bold className="text-slate-300 font-semibold mb-2">
        {label}
      </AppText>
      <View className="flex-row flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected.has(opt);
          return (
            <Pressable
              key={opt}
              onPress={() => onToggle(opt)}
              className={
                on
                  ? "bg-brand rounded-full px-3 py-1.5"
                  : "bg-slate-800 rounded-full px-3 py-1.5"
              }
            >
              <AppText className={on ? "text-brand-fg text-sm" : "text-slate-300 text-sm"}>
                {opt}
              </AppText>
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
  const [facets, setFacets] = useState<Facets>({
    country: new Set(),
    degree: new Set(),
    funding: new Set(),
  });

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

  function clearAll() {
    setFacets({ country: new Set(), degree: new Set(), funding: new Set() });
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-ink items-center justify-center" edges={["bottom"]}>
        <ActivityIndicator color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-ink items-center justify-center px-6" edges={["bottom"]}>
        <AppText className="text-red-400 text-center">
          {t("discover.loadError")}
          {"\n"}
          {(error as Error)?.message}
        </AppText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ink" edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => setFilterOpen(true)} className="px-2 py-1">
              <AppText className="text-brand font-semibold">
                {t("discover.filters")}
                {activeCount > 0 ? ` (${activeCount})` : ""}
              </AppText>
            </Pressable>
          ),
        }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ScholarshipCard item={item} />}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563EB" />
        }
        ListHeaderComponent={
          <AppText className="text-slate-500 text-xs mb-3">
            {filtered.length} {t("discover.resultsCount")}
          </AppText>
        }
        ListEmptyComponent={
          <AppText className="text-slate-400 text-center mt-10">{t("discover.empty")}</AppText>
        }
      />

      <Modal
        visible={filterOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-ink rounded-t-3xl max-h-[80%] pt-3">
            <View className="items-center pb-2">
              <View className="w-10 h-1 rounded-full bg-slate-700" />
            </View>
            <View className="flex-row items-center justify-between px-5 pb-3">
              <AppText bold className="text-white text-lg font-bold">
                {t("discover.filters")}
              </AppText>
              <Pressable onPress={clearAll}>
                <AppText className="text-slate-400">{t("discover.clear")}</AppText>
              </Pressable>
            </View>

            <ScrollView className="px-5">
              <FilterChips
                label={t("discover.filterCountry")}
                options={options.country}
                selected={facets.country}
                onToggle={(v) => toggle("country", v)}
              />
              <FilterChips
                label={t("discover.filterDegree")}
                options={options.degree}
                selected={facets.degree}
                onToggle={(v) => toggle("degree", v)}
              />
              <FilterChips
                label={t("discover.filterFunding")}
                options={options.funding}
                selected={facets.funding}
                onToggle={(v) => toggle("funding", v)}
              />
            </ScrollView>

            <SafeAreaView edges={["bottom"]} className="px-5 pt-2 pb-3">
              <Pressable
                className="bg-brand rounded-xl py-3 items-center active:opacity-80"
                onPress={() => setFilterOpen(false)}
              >
                <AppText bold className="text-brand-fg font-semibold">
                  {t("discover.apply")} ({filtered.length})
                </AppText>
              </Pressable>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
