import { useCallback, useRef } from "react";
import { AppState, Linking } from "react-native";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as StoreReview from "expo-store-review";

/**
 * Rating prompts. Two entry points with deliberately different behaviour:
 *
 * - The native in-app review sheet appears on its own once the user has spent
 *   real time in any feature. Google's guidelines say it must arrive unannounced
 *   (no custom "do you like the app?" dialog first) and it may silently no-op
 *   when its own quota is hit, so it is never wired to a button.
 * - `openStoreListing` backs the explicit "Rate this app" menu row, where the
 *   user asked for it and must see something happen.
 *
 * Feature screens bank time with `useRateAppEngagement`; the sheet is only ever
 * fired from `useRateAppPrompt` on the home tab, so it lands when the user is
 * between tasks rather than mid-flow.
 */

const STORAGE_KEY = "bp_rate_prompt";

/** A screen visit shorter than this was a passing glance, not engagement. */
const MIN_VISIT_MS = 20_000;
/** Caps a single visit so time spent with the app backgrounded can't inflate it. */
const MAX_VISIT_MS = 5 * 60_000;

const VISITS_BEFORE_ASKING = 3;
const ENGAGED_MS_BEFORE_ASKING = 3 * 60_000;
const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

/** Lets the tab transition finish before the sheet slides over it. */
const SETTLE_MS = 1_200;

type RateState = {
  /** Qualifying screen visits across every feature. */
  visits: number;
  engagedMs: number;
  askedAt: number | null;
  /** Version we last asked on, so an upgrade can re-ask after the cooldown. */
  askedVersion: string | null;
};

const EMPTY: RateState = { visits: 0, engagedMs: 0, askedAt: null, askedVersion: null };

const appVersion = () => Constants.expoConfig?.version ?? "unknown";

async function readState(): Promise<RateState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<RateState>) };
  } catch {
    return EMPTY;
  }
}

async function writeState(state: RateState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // A lost counter only costs us a prompt opportunity.
  }
}

async function bankVisit(ms: number): Promise<void> {
  if (ms < MIN_VISIT_MS) return;
  try {
    const state = await readState();
    await writeState({
      ...state,
      visits: state.visits + 1,
      engagedMs: state.engagedMs + Math.min(ms, MAX_VISIT_MS),
    });
  } catch {
    // Same as above — nothing user-facing depends on this.
  }
}

async function askForReview(): Promise<void> {
  try {
    const state = await readState();
    const version = appVersion();

    const enoughUse = state.visits >= VISITS_BEFORE_ASKING && state.engagedMs >= ENGAGED_MS_BEFORE_ASKING;
    const askedThisVersion = state.askedVersion === version;
    const withinCooldown = state.askedAt !== null && Date.now() - state.askedAt < COOLDOWN_MS;
    if (!enoughUse || askedThisVersion || withinCooldown) return;

    // The sheet must not be requested while we're heading to the background.
    if (AppState.currentState !== "active") return;
    if (!(await StoreReview.isAvailableAsync())) return;

    // Zero the counters so a dismissed sheet has to earn its next chance.
    await writeState({ visits: 0, engagedMs: 0, askedAt: Date.now(), askedVersion: version });
    await StoreReview.requestReview();
  } catch {
    // Never let a rating prompt surface an error to the user.
  }
}

/**
 * Banks the time the user spends on this screen towards a future rating prompt.
 * Add it to any feature screen — mentor chat, scholarship detail, guides, the CV
 * tools — and it records how long the screen held focus. Records only; the sheet
 * is fired elsewhere.
 */
export function useRateAppEngagement(): void {
  const focusedAt = useRef<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      focusedAt.current = Date.now();
      return () => {
        const started = focusedAt.current;
        focusedAt.current = null;
        if (started !== null) void bankVisit(Date.now() - started);
      };
    }, []),
  );
}

/**
 * Shows the review sheet when the user comes back to this screen with enough
 * banked engagement. The first focus of each launch is skipped so the sheet
 * never greets a cold start — it waits until the user returns from doing
 * something.
 */
export function useRateAppPrompt(): void {
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      const timer = setTimeout(() => void askForReview(), SETTLE_MS);
      return () => clearTimeout(timer);
    }, []),
  );
}

/** Opens the store listing for the explicit "Rate this app" action. */
export async function openStoreListing(): Promise<boolean> {
  try {
    const url = StoreReview.storeUrl();
    if (!url) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
