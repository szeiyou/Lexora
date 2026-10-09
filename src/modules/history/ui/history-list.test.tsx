import { render, screen } from "@testing-library/react";
import { HistoryList } from "@/modules/history/ui/history-list";

it("truncates long query and summary content inside each history card", () => {
  const longQuery = "supercalifragilisticexpialidocious-supercalifragilisticexpialidocious";
  const longSummary =
    "averylonghistorysummarywithoutspacesaverylonghistorysummarywithoutspacesaverylonghistorysummarywithoutspaces";

  render(
    <HistoryList
      items={[
        {
          historyKey: "history::english-word::1",
          query: longQuery,
          normalizedQuery: longQuery,
          resultType: "ENGLISH_WORD",
          summary: longSummary,
          sourceApi: "ENTRIES_V1",
          latestSearchTime: [2026, 3, 28, 12, 0, 0],
        },
      ]}
      page={1}
      canPreviousPage={false}
      canNextPage={false}
      openingKey={null}
      onOpen={() => {}}
      onPreviousPage={() => {}}
      onNextPage={() => {}}
    />,
  );

  const queryElement = screen.getByText(longQuery);
  const summaryElement = screen.getByText(longSummary);
  const textContainer = queryElement.parentElement;
  const listItem = queryElement.closest("li");

  expect(textContainer).not.toBeNull();
  expect(listItem).not.toBeNull();
  expect(listItem).toHaveClass("min-w-0");
  expect(textContainer).toHaveClass("min-w-0", "flex-1");
  expect(queryElement).toHaveClass("truncate");
  expect(summaryElement).toHaveClass("truncate");
});
