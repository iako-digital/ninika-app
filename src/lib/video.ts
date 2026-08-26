export function toEmbedUrl(url: string): string {
  const trimmed = url.trim();

  const watch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)([\w-]+)/);
  if (watch) return `https://www.youtube.com/embed/${watch[1]}`;

  return trimmed;
}
