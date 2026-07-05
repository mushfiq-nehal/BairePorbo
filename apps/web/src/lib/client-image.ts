// Cover image upload size limit.
//
// Vercel's serverless functions reject request bodies over ~4.5MB with a
// 413, so we validate the file size in the browser and ask the admin to
// shrink it themselves rather than silently failing after a save.
export const MAX_COVER_IMAGE_BYTES = 4 * 1024 * 1024;

export function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
