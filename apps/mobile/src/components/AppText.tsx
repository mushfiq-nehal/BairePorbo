import { Text, type TextProps, type StyleProp, type TextStyle } from "react-native";
import { useLang } from "@/i18n";

/**
 * Drop-in replacement for RN <Text> that renders Bengali with the loaded Hind
 * Siliguri face. Pass `bold` for headings (maps to the SemiBold weight, which
 * Bengali needs as a distinct font family rather than a synthesized weight).
 * In English it falls through to the system font.
 */
export function AppText({
  bold,
  style,
  ...props
}: TextProps & { bold?: boolean }) {
  const { lang } = useLang();
  const bengali: StyleProp<TextStyle> =
    lang === "bn"
      ? { fontFamily: bold ? "HindSiliguri_600SemiBold" : "HindSiliguri_400Regular" }
      : undefined;
  return <Text {...props} style={[bengali, style]} />;
}
