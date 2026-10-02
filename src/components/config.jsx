export const img_300 = "https://image.tmdb.org/t/p/w300";
export const img_500 = "https://image.tmdb.org/t/p/w500";
export const unavailable = "/poster-placeholder.svg";
export function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-CA", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(date);
}
