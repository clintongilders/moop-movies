import { useSearchParams } from "react-router-dom";

// Keep selections in the listing URL so both browser Back and detail links restore them.
export default function useGenreFilters() {
  const [params, setParams] = useSearchParams();
  const value = [
    ...new Set(
      (params.get("genres") || "")
        .split("|")
        .filter((id) => /^[1-9]\d*$/.test(id))
        .map(Number),
    ),
  ].map((id) => ({ id }));
  function setValue(update) {
    const next = typeof update === "function" ? update(value) : update;
    const updated = new URLSearchParams(params);
    if (next.length)
      updated.set(
        "genres",
        [...new Set(next.map((genre) => genre.id))]
          .sort((a, b) => a - b)
          .join("|"),
      );
    else updated.delete("genres");
    setParams(updated, { replace: true });
  }
  return [value, setValue];
}
