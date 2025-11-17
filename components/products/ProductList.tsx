"use client";

import { useState } from "react";
import {
  useGetProductsQuery,
  useDeleteProductMutation,
  useImportProductsMutation,
  CreateProductRequest,
} from "@/lib/api/productsApi";
import { useGetCategoriesQuery } from "@/lib/api/categoriesApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { ProductForm } from "./ProductForm";
import { ImportExport } from "@/components/common/ImportExport";
import toast from "react-hot-toast";

export function ProductList() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const { data, isLoading, refetch } = useGetProductsQuery({
    search: search || undefined,
    categoryId,
  });
  const { data: categoriesData } = useGetCategoriesQuery();
  const [deleteProduct] = useDeleteProductMutation();
  const [importProducts] = useImportProductsMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const { format: formatCurrency } = useCurrency();

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct(id).unwrap();
        toast.success("Product deleted successfully");
        refetch();
      } catch (error: any) {
        toast.error(error.data?.error || "Failed to delete product");
      }
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
      // Map CSV data to product format
      const products: CreateProductRequest[] = items.map((item) => ({
        name: item.name || item.Name || "",
        barcode: item.barcode || item.Barcode || undefined,
        sku: item.sku || item.SKU || undefined,
        description: item.description || item.Description || undefined,
        category_id:
          item.category_id || item["Category ID"]
            ? parseInt(item.category_id || item["Category ID"])
            : undefined,
        supplier_id:
          item.supplier_id || item["Supplier ID"]
            ? parseInt(item.supplier_id || item["Supplier ID"])
            : undefined,
        cost_price: parseFloat(item.cost_price || item["Cost Price"] || "0"),
        selling_price: parseFloat(
          item.selling_price || item["Selling Price"] || "0"
        ),
        stock_quantity: parseInt(
          item.stock_quantity || item["Stock Quantity"] || "0"
        ),
        min_stock_level: parseInt(
          item.min_stock_level || item["Min Stock Level"] || "0"
        ),
        image_url: item.image_url || item["Image URL"] || undefined,
      }));

      const result = await importProducts({ products }).unwrap();
      return result;
    } catch (error: any) {
      throw new Error(error.data?.error || "Failed to import products");
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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">All Products</h2>
        <div className="flex gap-2">
          <ImportExport
            data={exportData}
            headers={exportHeaders}
            filename="products"
            onImport={handleImport}
            onImportSuccess={refetch}
            templateData={templateData}
          />
          <Button onClick={() => setIsModalOpen(true)}>Add Product</Button>
        </div>
      </div>

      <div className="mb-4 flex gap-4">
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
          className="w-48"
        />
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                SKU/Barcode
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Stock
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data?.products.map((product) => (
              <tr key={product.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium ">
                  {product.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {product.sku || product.barcode || "-"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {product.category_name || "-"}
                </td>
                <td className="px-6 py-4 text-sm ">
                  {formatCurrency(product.selling_price)}
                </td>
                <td className="px-6 py-4 text-sm">
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
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(product.id)}
                    className="mr-4 text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
