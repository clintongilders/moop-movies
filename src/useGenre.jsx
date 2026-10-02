// Match any selected genre; keep equivalent selections on the same query key.
const useGenre = (value) =>
  [...new Set(value.map((genre) => genre.id))].sort((a, b) => a - b).join("|");

export default useGenre;
