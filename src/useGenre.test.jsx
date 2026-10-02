import useGenre from "./useGenre";

test("combines multiple genres with OR and produces stable query keys", () => {
  expect(useGenre([{ id: 28 }, { id: 12 }])).toBe("12|28");
  expect(useGenre([{ id: 12 }, { id: 28 }, { id: 12 }])).toBe("12|28");
  expect(useGenre([{ id: 28 }])).toBe("28");
  expect(useGenre([])).toBe("");
});
