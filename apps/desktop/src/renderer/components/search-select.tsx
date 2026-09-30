import { useState } from "react";
import { useCombobox } from "downshift";

export interface SearchOption {
  readonly id: string;
  readonly label: string;
  readonly description?: string | undefined;
}

/** One field for the committed selection and temporary search text. */
export function SearchSelect({
  id,
  label,
  selected,
  options,
  loading,
  error,
  onSearch,
  onSelect,
  onRetry
}: {
  readonly id: string;
  readonly label: string;
  readonly selected: SearchOption;
  readonly options: readonly SearchOption[];
  readonly loading: boolean;
  readonly error: boolean;
  readonly onSearch: (query: string) => void;
  readonly onSelect: (option: SearchOption) => void;
  readonly onRetry: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const { isOpen, highlightedIndex, getInputProps, getMenuProps, getItemProps } =
    useCombobox<string>({
      id,
      items: options.map((option) => option.id),
      selectedItem: selected.id,
      inputValue: draft ?? selected.label,
      itemToString: (item) => options.find((option) => option.id === item)?.label ?? selected.label,
      stateReducer: (state, { type, changes }) => {
        if (
          type === useCombobox.stateChangeTypes.InputKeyDownEscape ||
          type === useCombobox.stateChangeTypes.InputBlur
        ) {
          return { ...changes, selectedItem: state.selectedItem, isOpen: false };
        }
        return changes;
      },
      onInputValueChange: ({ type, inputValue }) => {
        if (type === useCombobox.stateChangeTypes.InputChange) {
          setDraft(inputValue);
          onSearch(inputValue);
        }
      },
      onSelectedItemChange: ({ selectedItem }) => {
        const option = options.find((item) => item.id === selectedItem);
        if (option && option.id !== selected.id) onSelect(option);
        setDraft(null);
        onSearch("");
      },
      onIsOpenChange: ({ isOpen: nextOpen }) => {
        if (!nextOpen) {
          setDraft(null);
          onSearch("");
        }
      }
    });
  return (
    <div className="search-select">
      <div className="search-select-field">
        <input
          {...getInputProps({
            id,
            "aria-label": label,
            "aria-describedby": isOpen ? `${id}-status` : undefined,
            placeholder: "Search name or phone",
            onFocus: (event) => {
              event.currentTarget.select();
            }
          })}
        />
        <span className="search-select-chevron" aria-hidden="true">
          ⌄
        </span>
      </div>
      <div className="search-select-popup" hidden={!isOpen}>
        <ul {...getMenuProps({ "aria-label": label })}>
          {isOpen
            ? options.map((option, index) => (
                <li
                  key={option.id}
                  {...getItemProps({ item: option.id, index })}
                  className={highlightedIndex === index ? "is-highlighted" : ""}
                >
                  <span>
                    {option.label}
                    {option.description ? <small>{option.description}</small> : null}
                  </span>
                  {selected.id === option.id ? <span aria-hidden="true">✓</span> : null}
                </li>
              ))
            : null}
        </ul>
        <small id={`${id}-status`} role={error ? "alert" : "status"}>
          {loading
            ? "Searching customers…"
            : error
              ? "Customer search failed. Try again."
              : options.length === 1 && draft
                ? "No customers found. Try another name or phone."
                : "Search by name or phone"}
        </small>
      </div>
      {error ? (
        <button type="button" onClick={onRetry}>
          Retry customer search
        </button>
      ) : null}
    </div>
  );
}
