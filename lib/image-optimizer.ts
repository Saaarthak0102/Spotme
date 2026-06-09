// ============================================================
// image-optimizer.ts — Supabase Image Transformation helper
// Client & Server safe URL translation
// ============================================================

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain";
}

/**
 * Intercepts Supabase Storage URLs and converts them to optimized URLs
 * utilizing Supabase Image Transformation at the CDN edge.
 */
export function getOptimizedStorageUrl(
  url: string | null | undefined,
  options: ImageOptimizationOptions = {}
): string {
  if (!url) return "";

  // Check if it's a Supabase storage bucket public URL
  if (url.includes("/storage/v1/object/public/")) {
    const { width, height, quality = 80, resize = "cover" } = options;

    // Convert '/storage/v1/object/public/' to '/storage/v1/render/image/public/'
    let optimized = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");

    const params: string[] = [];
    if (width) params.push(`width=${width}`);
    if (height) params.push(`height=${height}`);
    if (quality) params.push(`quality=${quality}`);
    if (resize) params.push(`resize=${resize}`);

    if (params.length > 0) {
      optimized += `?${params.join("&")}`;
    }
    return optimized;
  }

  return url;
}
