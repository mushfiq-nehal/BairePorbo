import { useState } from "react";
import { View, ScrollView, ActivityIndicator, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { RequiredDocuments } from "@baireporbo/shared";
import { useApi } from "@/lib/api";
import { useT } from "@/i18n";
import { AppText } from "@/components/AppText";

function Section({ title, body }: { title: string; body: string | null | undefined }) {
  if (!body) return null;
  return (
    <View className="mb-5">
      <AppText bold className="text-slate-300 font-semibold mb-1.5">
        {title}
      </AppText>
      <AppText className="text-slate-100 leading-6">{body}</AppText>
    </View>
  );
}

function DocList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View className="mb-3">
      <AppText bold className="text-slate-400 text-xs uppercase mb-1.5">
        {title}
      </AppText>
      {items.map((doc, i) => (
        <View key={i} className="flex-row gap-2 mb-1">
          <AppText className="text-brand">•</AppText>
          <AppText className="text-slate-100 flex-1">{doc}</AppText>
        </View>
      ))}
    </View>
  );
}

export default function ScholarshipDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const t = useT();
  const [docs, setDocs] = useState<RequiredDocuments | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["scholarship", id],
    queryFn: () => api.getScholarship(id),
    enabled: !!id,
  });

  const docsMutation = useMutation({
    mutationFn: () => api.getScholarshipDocuments(id),
    onSuccess: (res) => setDocs(res.documents),
  });

  const s = data?.scholarship;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-ink items-center justify-center" edges={["bottom"]}>
        <ActivityIndicator color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (isError || !s) {
    return (
      <SafeAreaView className="flex-1 bg-ink items-center justify-center px-6" edges={["bottom"]}>
        <AppText className="text-red-400 text-center">{t("detail.notFound")}</AppText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ink" edges={["bottom"]}>
      <Stack.Screen options={{ title: s.country ?? "" }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <AppText bold className="text-white text-2xl font-bold mb-2">
          {s.title}
        </AppText>

        <View className="flex-row flex-wrap gap-2 mb-5">
          {s.country ? (
            <View className="bg-slate-800 rounded-full px-3 py-1">
              <AppText className="text-slate-300 text-xs">📍 {s.country}</AppText>
            </View>
          ) : null}
          {s.degree_level ? (
            <View className="bg-slate-800 rounded-full px-3 py-1">
              <AppText className="text-slate-300 text-xs">🎓 {s.degree_level}</AppText>
            </View>
          ) : null}
          {s.funding_type ? (
            <View className="bg-slate-800 rounded-full px-3 py-1">
              <AppText className="text-slate-300 text-xs">💰 {s.funding_type}</AppText>
            </View>
          ) : null}
          {s.deadline ? (
            <View className="bg-slate-800 rounded-full px-3 py-1">
              <AppText className="text-slate-300 text-xs">⏳ {s.deadline}</AppText>
            </View>
          ) : null}
        </View>

        <Section title={t("detail.about")} body={s.ai_summary ?? s.raw_description} />
        <Section title={t("detail.eligibility")} body={s.eligibility_summary} />
        <Section title={t("detail.benefits")} body={s.tips} />

        {/* Required-documents checklist (AI-generated, cached server-side). */}
        <View className="mb-5">
          <AppText bold className="text-slate-300 font-semibold mb-2">
            {t("detail.requiredDocuments")}
          </AppText>
          {docs ? (
            <View className="bg-slate-900 rounded-2xl p-4">
              <DocList title={t("detail.coreDocuments")} items={docs.core} />
              <DocList title={t("detail.additionalDocuments")} items={docs.additional} />
              {docs.note ? (
                <AppText className="text-slate-400 text-sm italic mt-1">💡 {docs.note}</AppText>
              ) : null}
            </View>
          ) : docsMutation.isError ? (
            <AppText className="text-red-400">{t("detail.docsError")}</AppText>
          ) : (
            <Pressable
              className="bg-slate-800 rounded-xl py-3 items-center active:opacity-80"
              onPress={() => docsMutation.mutate()}
              disabled={docsMutation.isPending}
            >
              {docsMutation.isPending ? (
                <ActivityIndicator color="#2563EB" />
              ) : (
                <AppText className="text-brand font-semibold">{t("detail.generateDocs")}</AppText>
              )}
            </Pressable>
          )}
        </View>

        {s.official_url ? (
          <Pressable
            className="bg-brand rounded-xl py-4 items-center active:opacity-80"
            onPress={() => Linking.openURL(s.official_url as string)}
          >
            <AppText bold className="text-brand-fg font-semibold">
              {t("detail.applyNow")}
            </AppText>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
