import { revalidatePath } from "next/cache";

export function revalidateGuidePages(slug?: string) {
  revalidatePath("/guide");
  revalidatePath("/");
  if (slug) revalidatePath(`/guide/${slug}`);
}
