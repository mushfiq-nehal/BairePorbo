import { useState } from "react";
import { View, ScrollView, ActivityIndicator, Pressable, Linking, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { RequiredDocuments } from "@baireporbo/shared";
import { useApi } from "@/lib/api";
import { useT } from "@/i18n";
import { Txt, Chip, Button, Card } from "@/components/ui";
import { colors } from "@/theme";

function Section({ title, body }: { title: string; body: string | null | undefined }) {
  if (!body) return null;
  return (
    <View className="mb-6">
      <Txt font="display" weight="semibold" className="text-ink-900 text-lg mb-2">{title}</Txt>
      <Txt className="text-ink-700 leading-6">{body}</Txt>
    </View>
  );
}

function DocList({ title, items, tone }: { title: string; items: string[]; tone: "teal" | "coral" }) {
  if (items.length === 0) return null;
  const dot = tone === "teal" ? colors.teal500 : colors.coral500;
  return (
    <View className="mb-4">
      <Txt weight="semibold" className="text-ink-400 text-xs uppercase tracking-wide mb-2">{title}</Txt>
      {items.map((doc, i) => (
        <View key={i} className="flex-row gap-2.5 mb-1.5">
          <Ionicons name="checkmark-circle" size={18} color={dot} style={{ marginTop: 1 }} />
          <Txt className="text-ink-800 flex-1 leading-5">{doc}</Txt>
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
      <SafeAreaView className="flex-1 bg-body items-center justify-center" edges={["bottom"]}>
        <ActivityIndicator color={colors.teal500} />
      </SafeAreaView>
    );
  }
  if (isError || !s) {
    return (
      <SafeAreaView className="flex-1 bg-body items-center justify-center px-8" edges={["bottom"]}>
        <Txt className="text-ink-500 text-center">{t("detail.notFound")}</Txt>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-body" edges={["bottom"]}>
      <Stack.Screen options={{ title: s.country ?? "" }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        {s.thumbnail_url ? (
          <Image
            source={{ uri: s.thumbnail_url }}
            style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.sand100 }}
            resizeMode="cover"
          />
        ) : null}
        <View style={{ padding: 20 }}>
        {s.is_flagship ? (
          <View className="flex-row mb-3">
            <View className="flex-row items-center gap-1 bg-coral-100 rounded-full px-3 py-1">
              <Ionicons name="star" size={12} color={colors.coral500} />
              <Txt weight="semibold" className="text-coral-700 text-xs">{t("common.featured")}</Txt>
            </View>
          </View>
        ) : null}

        <Txt font="display" weight="bold" className="text-ink-900 text-[26px] leading-8 mb-4">
          {s.title}
        </Txt>

        <View className="flex-row flex-wrap gap-2 mb-6">
          {s.country ? <Chip tone="teal" label={s.country} /> : null}
          {s.degree_level ? <Chip label={s.degree_level} /> : null}
          {s.funding_type ? <Chip label={s.funding_type} /> : null}
          {s.deadline ? <Chip tone="coral" label={s.deadline} /> : null}
        </View>

        <Section title={t("detail.about")} body={s.ai_summary ?? s.raw_description} />
        <Section title={t("detail.eligibility")} body={s.eligibility_summary} />
        <Section title={t("detail.benefits")} body={s.tips} />

        <View className="mb-6">
          <Txt font="display" weight="semibold" className="text-ink-900 text-lg mb-3">
            {t("detail.requiredDocuments")}
          </Txt>
          {docs ? (
            <Card className="p-4">
              <DocList tone="teal" title={t("detail.coreDocuments")} items={docs.core} />
              <DocList tone="coral" title={t("detail.additionalDocuments")} items={docs.additional} />
              {docs.note ? (
                <View className="flex-row gap-2 mt-1 bg-teal-100 rounded-xl p-3">
                  <Ionicons name="bulb-outline" size={16} color={colors.teal700} />
                  <Txt className="text-teal-800 text-sm flex-1 leading-5">{docs.note}</Txt>
                </View>
              ) : null}
            </Card>
          ) : docsMutation.isError ? (
            <Txt className="text-coral-700">{t("detail.docsError")}</Txt>
          ) : (
            <Button
              label={t("detail.generateDocs")}
              variant="outline"
              icon={<Ionicons name="document-text-outline" size={18} color={colors.teal700} />}
              loading={docsMutation.isPending}
              onPress={() => docsMutation.mutate()}
            />
          )}
        </View>

        {s.official_url ? (
          <Button
            label={t("detail.applyNow")}
            icon={<Ionicons name="open-outline" size={18} color={colors.white} />}
            onPress={() => Linking.openURL(s.official_url as string)}
          />
        ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
