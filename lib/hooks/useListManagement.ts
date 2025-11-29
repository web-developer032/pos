import { useState, useEffect, useCallback } from "react";
import { useDebounce } from "./useDebounce";

interface UseListManagementOptions {
  defaultPage?: number;
  defaultLimit?: number;
  debounceDelay?: number;
  resetPageOnSearch?: boolean;
}

/**
 * Custom hook for managing list state (search, pagination, modals)
 * Reduces boilerplate in list components
 */
export function useListManagement(options: UseListManagementOptions = {}) {
  const {
    defaultPage = 1,
    defaultLimit = 25,
    debounceDelay = 500,
    resetPageOnSearch = true,
  } = options;

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(defaultPage);
  const [limit, setLimit] = useState(defaultLimit);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const debouncedSearch = useDebounce(search, debounceDelay);

  // Reset page when search changes
  useEffect(() => {
    if (resetPageOnSearch) {
      setPage(defaultPage);
    }
  }, [debouncedSearch, resetPageOnSearch, defaultPage]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleLimitChange = useCallback(
    (newLimit: number) => {
      setLimit(newLimit);
      setPage(defaultPage);
    },
    [defaultPage]
  );

  const openCreateModal = useCallback(() => {
    setEditingId(null);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((id: number) => {
    setEditingId(id);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingId(null);
  }, []);

  const setDeleting = useCallback((id: number | null) => {
    setDeletingId(id);
  }, []);

  return {
    // Search
    search,
    debouncedSearch,
    setSearch: handleSearchChange,

    // Pagination
    page,
    limit,
    setPage: handlePageChange,
    setLimit: handleLimitChange,

    // Modal
    isModalOpen,
    editingId,
    openCreateModal,
    openEditModal,
    closeModal,

    // Delete
    deletingId,
    setDeleting,
  };
}
