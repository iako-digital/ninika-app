export function optimizeCloudinaryUrl(url?: string | null): string {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url ?? "";
  if (url.includes("/upload/f_auto")) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
}
