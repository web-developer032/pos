"use client";

import { useState, useEffect } from "react";
import {
  useGetProductsQuery,
  useDeleteProductMutation,
  useDeleteAllProductsMutation,
  useImportProductsMutation,
  CreateProductRequest,
} from "@/lib/api/productsApi";
import { useGetCategoriesQuery } from "@/lib/api/categoriesApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { ProductForm } from "./ProductForm";
import { ImportExport } from "@/components/common/ImportExport";
import toast from "react-hot-toast";

export function ProductList() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const debouncedSearch = useDebounce(search, 500);

  // Reset to page 1 when search or category changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryId]);

  const { data, isLoading, refetch } = useGetProductsQuery({
    search: debouncedSearch || undefined,
    categoryId,
    page,
    limit,
  });
  const { data: categoriesData } = useGetCategoriesQuery();
  const [deleteProduct] = useDeleteProductMutation();
  const [deleteAllProducts] = useDeleteAllProductsMutation();
  const [importProducts] = useImportProductsMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const { format: formatCurrency } = useCurrency();

  const handleDelete = async (id: number) => {
    if (deletingId === id) return; // Prevent double click
    if (confirm("Are you sure you want to delete this product?")) {
      setDeletingId(id);
      try {
        await deleteProduct(id).unwrap();
        toast.success("Product deleted successfully");
        refetch();
      } catch (error: any) {
        toast.error(error.data?.error || "Failed to delete product");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleDeleteAll = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL products? This action cannot be undone!"
      )
    ) {
      return;
    }
    setIsDeletingAll(true);
    try {
      await deleteAllProducts().unwrap();
      toast.success("All products deleted successfully");
      refetch();
    } catch (error: any) {
      toast.error(error.data?.error || "Failed to delete all products");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleEdit = (id: number) => {
    setEditingProduct(id);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleImport = async (
    items: any[]
  ): Promise<{ imported: number; errors: string[] }> => {
    try {
      // Helper to get field value from CSV (handles multiple case variations)
      const getField = (item: any, ...fieldNames: string[]): any => {
        for (const fieldName of fieldNames) {
          const value = item[fieldName];
          if (value !== undefined && value !== null && value !== "") {
            return value;
          }
        }
        return undefined;
      };

      // Helper to normalize string fields (empty strings become undefined)
      const normalizeString = (value: any): string | undefined => {
        if (value === null || value === undefined || value === "") {
          return undefined;
        }
        const str = String(value).trim();
        return str.length > 0 ? str : undefined;
      };

      // Helper to parse numbers safely
      const parseNumber = (value: any, defaultValue: number = 0): number => {
        if (value === null || value === undefined || value === "") {
          return defaultValue;
        }
        const parsed =
          typeof value === "string" ? parseFloat(value) : Number(value);
        return isNaN(parsed) ? defaultValue : parsed;
      };

      const parseIntSafe = (value: any, defaultValue: number = 0): number => {
        if (value === null || value === undefined || value === "") {
          return defaultValue;
        }
        const parsed =
          typeof value === "string" ? parseInt(value, 10) : Number(value);
        return isNaN(parsed) ? defaultValue : parsed;
      };

      // Map CSV data to product format - clean and simple
      const products: CreateProductRequest[] = items
        .map((item): CreateProductRequest | null => {
          const name = getField(item, "name", "Name", "NAME") || "";

          // Skip rows with empty names
          if (!name || name.trim().length === 0) {
            return null;
          }

          return {
            name: String(name).trim(),
            barcode: normalizeString(
              getField(item, "barcode", "Barcode", "BARCODE")
            ),
            sku: normalizeString(getField(item, "sku", "SKU")),
            description: normalizeString(
              getField(item, "description", "Description", "DESCRIPTION")
            ),
            category_id: (() => {
              const val = getField(
                item,
                "category_id",
                "Category ID",
                "category_id"
              );
              return val ? parseIntSafe(val) : undefined;
            })(),
            supplier_id: (() => {
              const val = getField(
                item,
                "supplier_id",
                "Supplier ID",
                "supplier_id"
              );
              return val ? parseIntSafe(val) : undefined;
            })(),
            cost_price: parseNumber(
              getField(item, "cost_price", "Cost Price", "cost_price"),
              0
            ),
            selling_price: parseNumber(
              getField(item, "selling_price", "Selling Price", "selling_price"),
              0
            ),
            stock_quantity: parseIntSafe(
              getField(
                item,
                "stock_quantity",
                "Stock Quantity",
                "stock_quantity"
              ),
              0
            ),
            min_stock_level: parseIntSafe(
              getField(
                item,
                "min_stock_level",
                "Min Stock Level",
                "min_stock_level"
              ),
              0
            ),
            image_url: normalizeString(
              getField(item, "image_url", "Image URL", "image_url")
            ),
          };
        })
        .filter((product): product is CreateProductRequest => product !== null);

      if (products.length === 0) {
        throw new Error("No valid products found in CSV file");
      }

      const result = await importProducts({ products }).unwrap();
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === "object" && "data" in error
          ? (error as { data?: { error?: string } }).data?.error ||
            "Failed to import products"
          : error instanceof Error
            ? error.message
            : "Failed to import products";
      throw new Error(errorMessage);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Prepare export data
  const exportData = (data?.products || []).map((p) => ({
    name: p.name,
    barcode: p.barcode || "",
    sku: p.sku || "",
    description: p.description || "",
    category_id: p.category_id || "",
    supplier_id: p.supplier_id || "",
    cost_price: p.cost_price,
    selling_price: p.selling_price,
    stock_quantity: p.stock_quantity,
    min_stock_level: p.min_stock_level,
    image_url: p.image_url || "",
  }));

  const exportHeaders = [
    "name",
    "barcode",
    "sku",
    "description",
    "category_id",
    "supplier_id",
    "cost_price",
    "selling_price",
    "stock_quantity",
    "min_stock_level",
    "image_url",
  ];

  // Template data with example values
  const templateData = [
    {
      name: "Example Product",
      barcode: "1234567890123",
      sku: "SKU-001",
      description: "Product description",
      category_id: "1",
      supplier_id: "1",
      cost_price: "10.00",
      selling_price: "15.00",
      stock_quantity: "100",
      min_stock_level: "10",
      image_url: "https://example.com/image.jpg",
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">All Products</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ImportExport
            data={exportData}
            headers={exportHeaders}
            filename="products"
            onImport={handleImport}
            onImportSuccess={refetch}
            templateData={templateData}
          />
          <Button
            variant="outline"
            onClick={handleDeleteAll}
            disabled={isDeletingAll || (data?.products.length || 0) === 0}
            className="text-red-600 hover:text-red-700"
          >
            {isDeletingAll ? "Deleting..." : "Delete All"}
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>Add Product</Button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select
          options={[
            { value: "", label: "All Categories" },
            ...(categoriesData?.categories.map((c) => ({
              value: c.id.toString(),
              label: c.name,
            })) || []),
          ]}
          value={categoryId?.toString() || ""}
          onChange={(e) =>
            setCategoryId(e.target.value ? parseInt(e.target.value) : undefined)
          }
          className="w-full sm:w-48"
        />
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                Name
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                SKU/Barcode
              </th>
              <th className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6">
                Category
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                Price
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                Stock
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data?.products.map((product) => (
              <tr key={product.id}>
                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium sm:px-6">
                  {product.name}
                </td>
                <td className="px-3 py-4 text-sm text-gray-500 sm:px-6">
                  {product.sku || product.barcode || "-"}
                </td>
                <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell sm:px-6">
                  {product.category_name || "-"}
                </td>
                <td className="px-3 py-4 text-sm sm:px-6">
                  {formatCurrency(product.selling_price)}
                </td>
                <td className="px-3 py-4 text-sm sm:px-6">
                  <span
                    className={
                      product.stock_quantity <= product.min_stock_level
                        ? "font-semibold text-red-600"
                        : ""
                    }
                  >
                    {product.stock_quantity}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium sm:px-6">
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-end">
                    <button
                      onClick={() => handleEdit(product.id)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                      className="text-red-600 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === product.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data?.pagination && (
        <div className="mt-4">
          <Pagination
            currentPage={data.pagination.page}
            totalPages={data.pagination.totalPages}
            totalItems={data.pagination.total}
            itemsPerPage={data.pagination.limit}
            onPageChange={(newPage) => {
              setPage(newPage);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onItemsPerPageChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title={editingProduct ? "Edit Product" : "Add Product"}
        size="lg"
      >
        <ProductForm
          productId={editingProduct}
          onSuccess={() => {
            handleClose();
            refetch();
          }}
        />
      </Modal>
    </div>
  );
}
