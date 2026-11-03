import { describe, expect, it } from "vitest";
import { buildQuery, EmptyQueryError, filtersSchema, startOfDayEpoch, type FiltersInput } from "./query";

const q = (input: FiltersInput) => buildQuery(filtersSchema.parse(input));

describe("buildQuery", () => {
  it("converts dates to local-midnight epoch seconds", () => {
    expect(startOfDayEpoch("2021-11-20")).toBe(new Date(2021, 10, 20).getTime() / 1000);
    expect(q({ before: "2021-11-20" })).toBe(
      `before:${startOfDayEpoch("2021-11-20")} -is:starred -is:important`,
    );
  });

  it("ORs multiple senders and quotes values with spaces", () => {
    expect(q({ from: ["a@x.com", "Some Shop"], excludeStarred: false, excludeImportant: false })).toBe(
      'from:(a@x.com OR "Some Shop")',
    );
  });

  it("combines criteria", () => {
    expect(
      q({
        from: ["news@x.com"],
        category: "promotions",
        hasAttachment: true,
        largerThanMb: 5,
        readState: "read",
        excludeWords: "invoice receipt",
        excludeImportant: false,
      }),
    ).toBe(
      "from:news@x.com -invoice -receipt category:promotions has:attachment larger:5M is:read -is:starred",
    );
  });

  it("strips characters that would break the query", () => {
    expect(q({ subject: 'sale") OR (x', excludeStarred: false, excludeImportant: false })).toBe(
      "subject:(sale OR x)",
    );
  });

  it("refuses a query with no criteria", () => {
    expect(() => q({})).toThrow(EmptyQueryError);
    expect(() => q({ from: ["  "], subject: '""' })).toThrow(EmptyQueryError);
  });

  it("treats empty date strings as unset", () => {
    expect(() => q({ before: "", after: "" })).toThrow(EmptyQueryError);
  });
});
