import { type FormEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import type { ForcedResultType } from "@/modules/query/model/query-store";
import type { RecentSearchItem } from "@/modules/recent-searches/api/fetch-recent-searches";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

const typeOptions: Array<{ value: ForcedResultType; label: string }> = [
  { value: "AUTO", label: "自动识别" },
  { value: "ENGLISH_WORD", label: "英文单词" },
  { value: "ZH_TO_EN_TERM", label: "中译英词条" },
  { value: "SENTENCE_TRANSLATION", label: "句子翻译" },
];
const resultTypeLabelMap: Record<RecentSearchItem["resultType"], string> = {
  ENGLISH_WORD: "英文单词",
  ZH_TO_EN_TERM: "中译英词条",
  SENTENCE_TRANSLATION: "句子翻译",
};

type QueryToolbarProps = {
  query: string;
  forcedType: ForcedResultType;
  queryValidationMessage: string | null;
  onQueryChange: (value: string) => void;
  onForcedTypeChange: (value: ForcedResultType) => void;
  recentSearches: RecentSearchItem[];
  onRecordedQueryFill: (query: string, resultType: RecentSearchItem["resultType"]) => void;
  onSubmit: () => void;
  onRefresh: () => void;
  canRefresh: boolean;
  isQuerying: boolean;
  isRefreshing: boolean;
};

export function QueryToolbar({
  query,
  forcedType,
  queryValidationMessage,
  onQueryChange,
  onForcedTypeChange,
  recentSearches,
  onRecordedQueryFill,
  onSubmit,
  onRefresh,
  canRefresh,
  isQuerying,
  isRefreshing,
}: QueryToolbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const validationMessageId = useId();
  const trimmedQuery = query.trim().toLowerCase();
  const filteredRecentSearches = trimmedQuery
    ? recentSearches.filter((item) => item.query.toLowerCase().includes(trimmedQuery))
    : recentSearches;
  const hasDropdownContent = recentSearches.length > 0;
  const shouldShowDropdown = isDropdownOpen && hasDropdownContent;
  const isQueryInvalid = Boolean(queryValidationMessage);

  useEffect(() => {
    if (!shouldShowDropdown) {
      setActiveIndex(-1);
      return;
    }

    setActiveIndex(-1);
  }, [query, recentSearches, shouldShowDropdown]);

  useEffect(() => {
    if (activeIndex < 0) {
      return;
    }

    optionRefs.current[activeIndex]?.scrollIntoView?.({
      block: "nearest",
    });
  }, [activeIndex]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
    setActiveIndex(-1);
  };

  const selectRecentSearch = (item: RecentSearchItem) => {
    onRecordedQueryFill(item.query, item.resultType);
    closeDropdown();
    inputRef.current?.focus();
  };

  const handleQueryKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!hasDropdownContent) {
      return;
    }

    if (event.key === "Escape") {
      if (shouldShowDropdown) {
        event.preventDefault();
        closeDropdown();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsDropdownOpen(true);
      setActiveIndex((currentIndex) => {
        if (filteredRecentSearches.length === 0) {
          return -1;
        }

        if (currentIndex < 0) {
          return 0;
        }

        return Math.min(currentIndex + 1, filteredRecentSearches.length - 1);
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsDropdownOpen(true);
      setActiveIndex((currentIndex) => {
        if (filteredRecentSearches.length === 0) {
          return -1;
        }

        if (currentIndex < 0) {
          return filteredRecentSearches.length - 1;
        }

        return Math.max(currentIndex - 1, 0);
      });
      return;
    }

    if (event.key === "Enter" && shouldShowDropdown && activeIndex >= 0) {
      event.preventDefault();
      const activeItem = filteredRecentSearches[activeIndex];
      if (activeItem) {
        selectRecentSearch(activeItem);
      }
    }
  };

  return (
    <div data-testid="query-toolbar-layer" className="relative z-30">
      <Card className="border-white/5 bg-[linear-gradient(180deg,hsl(var(--card))/0.96,hsl(var(--surface))/0.88)] [backdrop-filter:none]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl">查询面板</CardTitle>
          <CardDescription>输入内容后即可查看结果，也可以从最近记录继续。</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <label htmlFor="workspace-query-input" className="text-sm font-medium text-[hsl(var(--foreground))]">
                输入内容
              </label>
              <div
                className="relative"
                onBlur={(event) => {
                  if (event.currentTarget.contains(event.relatedTarget)) {
                    return;
                  }

                  closeDropdown();
                }}
              >
                <Input
                  id="workspace-query-input"
                  ref={inputRef}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-invalid={isQueryInvalid}
                  aria-expanded={shouldShowDropdown}
                  aria-controls={shouldShowDropdown ? listboxId : undefined}
                  aria-describedby={queryValidationMessage ? validationMessageId : undefined}
                  aria-activedescendant={
                    shouldShowDropdown && activeIndex >= 0
                      ? `${listboxId}-option-${activeIndex}`
                      : undefined
                  }
                  value={query}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(event) => {
                    onQueryChange(event.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onKeyDown={handleQueryKeyDown}
                  placeholder="输入单词、词组或句子"
                  autoComplete="off"
                  className={
                    isQueryInvalid
                      ? "border-[hsl(var(--destructive)/0.6)] focus-visible:ring-[hsl(var(--destructive))]"
                      : undefined
                  }
                />
                {queryValidationMessage ? (
                  <p
                    id={validationMessageId}
                    role="alert"
                    className="mt-2 text-sm text-[hsl(var(--destructive))]"
                  >
                    {queryValidationMessage}
                  </p>
                ) : null}

                {shouldShowDropdown ? (
                  <div
                    id={listboxId}
                    role="listbox"
                    aria-label="最近记录"
                    className="absolute top-[calc(100%+0.5rem)] z-20 max-h-64 w-full overflow-y-auto rounded-[var(--radius-md)] border border-white/10 bg-[hsl(var(--surface))/0.96] p-2 shadow-[var(--shadow-lg)] backdrop-blur-md transition-[opacity,transform] duration-[var(--motion-fast)] ease-[var(--motion-ease)] motion-reduce:transition-none data-[state=open]:translate-y-0 data-[state=open]:opacity-100"
                    data-state="open"
                  >
                    {filteredRecentSearches.length > 0 ? (
                      filteredRecentSearches.map((item, index) => {
                        const isActive = index === activeIndex;

                        return (
                          <button
                            key={item.historyKey}
                            id={`${listboxId}-option-${index}`}
                            ref={(node) => {
                              optionRefs.current[index] = node;
                            }}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            tabIndex={-1}
                            className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm transition-[background-color,color,transform,opacity] duration-[var(--motion-fast)] ease-[var(--motion-ease)] motion-reduce:transition-none ${
                              isActive
                                ? "bg-white/10 text-[hsl(var(--foreground))]"
                                : "text-[hsl(var(--foreground))] hover:bg-white/5"
                            }`}
                            onMouseDown={(event) => {
                              event.preventDefault();
                            }}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => selectRecentSearch(item)}
                          >
                            <span className="truncate font-medium">{item.query}</span>
                            <span className="shrink-0 text-xs text-[hsl(var(--muted-foreground))]">
                              {resultTypeLabelMap[item.resultType]}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2 text-sm text-[hsl(var(--muted-foreground))]">没有匹配的最近记录</div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-5 min-[900px]:grid-cols-[minmax(0,1fr)_auto] min-[900px]:items-end">
              <div className="grid gap-2">
                <label
                  htmlFor="workspace-type-select"
                  className="text-sm font-medium text-[hsl(var(--foreground))]"
                >
                  内容类型
                </label>
                <Select value={forcedType} onValueChange={(value) => onForcedTypeChange(value as ForcedResultType)}>
                  <SelectTrigger
                    id="workspace-type-select"
                    aria-label="内容类型"
                    className="w-full min-[900px]:max-w-[220px]"
                  >
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row min-[900px]:justify-end">
                <Button
                  type="submit"
                  disabled={!query.trim() || isQuerying || isRefreshing || isQueryInvalid}
                  className="min-w-[108px]"
                >
                  查看结果
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onRefresh}
                  disabled={!canRefresh || isRefreshing || isQuerying}
                  className="min-w-[108px]"
                >
                  重新获取结果
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
