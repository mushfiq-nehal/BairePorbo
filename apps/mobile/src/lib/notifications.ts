import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundTask from "expo-background-task";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import { API_BASE } from "./config";
import { LANG_STORAGE } from "@/i18n";
import { translations, type Lang, type TranslationKey } from "@/i18n/translations";

/**
 * Device notifications for new content, without a push server: a WorkManager
 * background task (and every app launch) fetches the public scholarships/guides
 * lists, diffs them against the last-seen ids stored on device, and fires local
 * notifications for anything new. Android decides the actual cadence
 * (minimumInterval is a floor, not a schedule), so delivery is delayed-best-effort.
 */
const TASK_NAME = "bp-content-check";
const CHANNEL_ID = "content";
const SEEN_SCHOLARSHIPS = "bp_seen_scholarships";
const SEEN_GUIDES = "bp_seen_guides";

/** How the app shows notifications that arrive while it's foregrounded. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** The background task can't use React context, so it reads the persisted
 * language directly and translates from the raw dictionary. */
async function currentLang(): Promise<Lang> {
  const stored = await SecureStore.getItemAsync(LANG_STORAGE).catch(() => null);
  return stored === "bn" ? "bn" : "en";
}

function tr(key: TranslationKey, lang: Lang): string {
  return translations[key][lang];
}

async function loadSeen(key: string): Promise<Set<string> | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return null;
  }
}

async function saveSeen(key: string, ids: string[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(ids));
}

async function notify(title: string, body: string, url: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { url } },
    trigger: { channelId: CHANNEL_ID },
  });
}

type ContentItem = { id: string; title: string; url: string };

/** Diff one content list against its stored baseline; notify per item (or one
 * summary when a batch landed). First run just seeds the baseline silently. */
async function diffList(
  storageKey: string,
  items: ContentItem[],
  lang: Lang,
  keys: { one: TranslationKey; many: TranslationKey; manyBody: TranslationKey },
  listUrl: string,
): Promise<void> {
  const seen = await loadSeen(storageKey);
  const ids = items.map((i) => i.id);
  if (seen === null) {
    await saveSeen(storageKey, ids);
    return;
  }
  const fresh = items.filter((i) => !seen.has(i.id));
  if (fresh.length === 0) return;

  if (fresh.length <= 3) {
    for (const item of fresh) {
      await notify(tr(keys.one, lang), item.title, item.url);
    }
  } else {
    await notify(tr(keys.many, lang), `${fresh.length} ${tr(keys.manyBody, lang)}`, listUrl);
  }
  await saveSeen(storageKey, ids);
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** One poll: fetch both public lists and notify about anything unseen. */
export async function checkForNewContent(): Promise<void> {
  const lang = await currentLang();

  const scholarships = await fetchJson<{ scholarships: { id: string; title: string }[] }>(
    "/api/scholarships?status=published",
  );
  if (scholarships?.scholarships) {
    await diffList(
      SEEN_SCHOLARSHIPS,
      scholarships.scholarships.map((s) => ({ id: s.id, title: s.title, url: `/scholarship/${s.id}` })),
      lang,
      { one: "push.newScholarship", many: "push.newScholarships", manyBody: "push.newScholarshipsBody" },
      "/scholarships",
    );
  }

  const guides = await fetchJson<{ guides: { slug: string; title: string }[] }>("/api/guides");
  if (guides?.guides) {
    await diffList(
      SEEN_GUIDES,
      guides.guides.map((g) => ({ id: g.slug, title: g.title, url: `/guide/${g.slug}` })),
      lang,
      { one: "push.newGuide", many: "push.newGuides", manyBody: "push.newGuidesBody" },
      "/guides",
    );
  }
}

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    await checkForNewContent();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Call once on app start: permission + channel + task registration, plus an
 * immediate foreground check (which on first run seeds the seen-id baseline
 * so a fresh install doesn't get blasted with every existing item). */
export async function registerContentNotifications(): Promise<void> {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "New scholarships & guides",
    importance: Notifications.AndroidImportance.DEFAULT,
  }).catch(() => {});

  await Notifications.requestPermissionsAsync().catch(() => {});

  await checkForNewContent().catch(() => {});

  const status = await BackgroundTask.getStatusAsync().catch(() => null);
  if (status === BackgroundTask.BackgroundTaskStatus.Available) {
    // Floor of 60 min between checks; Android schedules the real cadence.
    await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 60 }).catch(() => {});
  }
}
