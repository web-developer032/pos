"use client";

import { useState, useRef, useEffect, useMemo, forwardRef, ReactNode } from "react";
import { createPortal } from "react-dom";

interface SearchableSelectProps {
  label?: ReactNode;
  error?: string;
  options: { value: string | number; label: string; searchText?: string }[];
  value?: string | number;
  onChange?: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  searchPlaceholder?: string;
  onSearch?: (searchTerm: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const SearchableSelect = forwardRef<
  HTMLInputElement,
  SearchableSelectProps
>(
  (
    {
      label,
      error,
      options,
      value,
      onChange,
      placeholder = "Search and select...",
      className = "",
      searchPlaceholder = "Type to search...",
      onSearch,
      onKeyDown: customOnKeyDown,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [mounted, setMounted] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({
      top: 0,
      left: 0,
      width: 0,
    });
    const containerRef = useRef<HTMLDivElement>(null);
    const internalInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Use forwarded ref or internal ref
    const inputRef =
      (ref as React.RefObject<HTMLInputElement>) || internalInputRef;

    useEffect(() => {
      setMounted(true);
      return () => setMounted(false);
    }, []);

    const selectedOption = options.find((opt) => opt.value === value);

    // Check if current input value is a placeholder
    const isPlaceholderText = (text: string): boolean => {
      return (
        text === placeholder ||
        text === "Select Base Product" ||
        text === "Select Category" ||
        text.trim() === ""
      );
    };

    // Clear search term and close dropdown when a product is selected (value changes to non-zero)
    // Optimized to only run when value actually changes to a valid selection
    const prevValueRef = useRef(value);
    useEffect(() => {
      const valueChanged = prevValueRef.current !== value;
      const isValidSelection = value && value !== 0 && value !== "";

      if (valueChanged && isValidSelection) {
        prevValueRef.current = value;
        if (searchTerm !== "") {
          setSearchTerm("");
          onSearch?.("");
        }
        setIsOpen(false);
      } else {
        prevValueRef.current = value;
      }
    }, [value, searchTerm, onSearch]);

    // Memoized filtered options for performance
    const filteredOptions = useMemo(() => {
      // If search is empty, show all options
      if (searchTerm === "") {
        return options;
      }
      const searchLower = searchTerm.toLowerCase();
      // When searching, exclude placeholder options (value 0 or empty)
      return options.filter((option) => {
        if (option.value === 0 || option.value === "") {
          return false;
        }
        // Search by label or searchText if available
        const labelMatch = option.label.toLowerCase().includes(searchLower);
        const searchTextMatch = option.searchText
          ? option.searchText.includes(searchLower)
          : false;
        return labelMatch || searchTextMatch;
      });
    }, [options, searchTerm]);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        if (
          containerRef.current &&
          !containerRef.current.contains(target) &&
          listRef.current &&
          !listRef.current.contains(target)
        ) {
          setIsOpen(false);
          setSearchTerm("");
          setHighlightedIndex(-1);
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
          document.removeEventListener("mousedown", handleClickOutside);
        };
      }
    }, [isOpen]);

    // Update dropdown position when opening
    useEffect(() => {
      if (isOpen && containerRef.current && mounted) {
        const rect = containerRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    }, [isOpen, mounted]);

    // Scroll highlighted item into view
    useEffect(() => {
      if (highlightedIndex >= 0 && listRef.current) {
        const item = listRef.current.children[highlightedIndex] as HTMLElement;
        if (item) {
          item.scrollIntoView({ block: "nearest" });
        }
      }
    }, [highlightedIndex]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const term = e.target.value;
      // Ignore if the term is just the placeholder text
      if (isPlaceholderText(term)) {
        setSearchTerm("");
        onSearch?.("");
      } else {
        setSearchTerm(term);
        onSearch?.(term);
      }
      setHighlightedIndex(-1);
      if (!isOpen) {
        setIsOpen(true);
      }
    };

    const handleSelect = (optionValue: string | number) => {
      // Don't select the placeholder option
      if (optionValue === 0 || optionValue === "") {
        return;
      }
      onChange?.(optionValue);
      setIsOpen(false);
      setSearchTerm("");
      setHighlightedIndex(-1);
    };

    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsOpen(true);
      const currentValue = e.target.value;

      if (
        selectedOption &&
        selectedOption.value !== 0 &&
        selectedOption.value !== ""
      ) {
        // If a valid option is selected, use its label as search term
        setSearchTerm(selectedOption.label);
        // Select all text so user can immediately start typing to replace it
        setTimeout(() => {
          e.target.select();
        }, 0);
      } else if (isPlaceholderText(currentValue)) {
        // If input shows placeholder text, clear it immediately so user can type
        setSearchTerm("");
        e.target.value = "";
      } else {
        // If input has some value, use it as search term
        setSearchTerm(currentValue);
        // Select all text so user can immediately start typing to replace it
        setTimeout(() => {
          e.target.select();
        }, 0);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Call custom onKeyDown handler first (for barcode scanning, etc.)
      if (customOnKeyDown) {
        customOnKeyDown(e);
        // If the custom handler prevented default, don't handle further
        if (e.defaultPrevented) {
          return;
        }
      }

      if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        setIsOpen(true);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex].value);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
      }
    };

    return (
      <div className={`w-full ${className}`} ref={containerRef}>
        {label && (
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={
              isOpen
                ? searchTerm
                : selectedOption && selectedOption.value !== 0
                  ? selectedOption.label
                  : ""
            }
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={
              isOpen
                ? searchPlaceholder
                : selectedOption && selectedOption.value !== 0
                  ? selectedOption.label
                  : placeholder
            }
            className={`w-full rounded-md border bg-white px-3 py-2 pr-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 ${
              error ? "border-red-300" : "border-gray-300"
            }`}
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className={`h-5 w-5 text-gray-400 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          {isOpen && mounted && (
            <>
              {createPortal(
                <ul
                  ref={listRef}
                  className="fixed z-[60] max-h-60 overflow-auto rounded-md border border-gray-300 bg-white py-1 shadow-lg"
                  style={{
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`,
                    width: `${dropdownPosition.width}px`,
                  }}
                >
                  {filteredOptions.length === 0 ? (
                    <li className="px-4 py-2 text-sm text-gray-500">
                      No options found
                    </li>
                  ) : (
                    filteredOptions.map((option, index) => (
                      <li
                        key={option.value}
                        onClick={() => handleSelect(option.value)}
                        className={`cursor-pointer px-4 py-2 text-sm ${
                          option.value === value
                            ? "bg-indigo-100 text-indigo-900"
                            : index === highlightedIndex
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-900 hover:bg-gray-100"
                        }`}
                        onMouseEnter={() => setHighlightedIndex(index)}
                      >
                        {option.label}
                      </li>
                    ))
                  )}
                </ul>,
                document.body
              )}
            </>
          )}
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

SearchableSelect.displayName = "SearchableSelect";
