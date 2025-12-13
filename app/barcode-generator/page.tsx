"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useGetProductsQuery } from "@/lib/api/productsApi";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { generateRandomBarcode } from "@/lib/utils/barcodeGenerator";
import toast from "react-hot-toast";
// Import jsbarcode - will be loaded dynamically in useEffect

interface GeneratedBarcode {
  id: number;
  barcode: string;
  productName?: string;
  quantityMultiplier?: number;
  unit?: string;
  storeName?: string;
  mfgDate?: string;
  expDate?: string;
  generatedAt: Date;
}

export default function BarcodeGeneratorPage() {
  const [quantity, setQuantity] = useState<string>("10");
  const [generatedBarcodes, setGeneratedBarcodes] = useState<
    GeneratedBarcode[]
  >([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMode, setGenerationMode] = useState<"random" | "product">(
    "random"
  );
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const debouncedProductSearch = useDebounce(productSearchTerm, 300);

  // Label settings
  const [storeName, setStoreName] = useState<string>("");
  const [mfgDate, setMfgDate] = useState<string>("");
  const [expDate, setExpDate] = useState<string>("");

  // Fetch products for selection
  const { data: productsData } = useGetProductsQuery({
    search: debouncedProductSearch || undefined,
    limit: 50,
  });

  // Get selected product details
  const selectedProduct = productsData?.products.find(
    (p) => p.id === selectedProductId
  );

  // Product options for dropdown
  const productOptions = [
    { value: "", label: "Select a product..." },
    ...(productsData?.products || []).map((p) => ({
      value: p.id,
      label: `${p.name}${p.barcode ? ` (${p.barcode})` : ""}`,
      searchText: `${p.name} ${p.barcode || ""} ${p.sku || ""}`.toLowerCase(),
    })),
  ];

  const handleGenerate = () => {
    const count = parseInt(quantity, 10);
    if (isNaN(count) || count < 1 || count > 100) {
      toast.error("Please enter a number between 1 and 100");
      return;
    }

    if (generationMode === "product") {
      if (!selectedProduct) {
        toast.error("Please select a product first");
        return;
      }
      if (!selectedProduct.barcode) {
        toast.error(
          "Selected product doesn't have a barcode. Please add one first."
        );
        return;
      }
    }

    setIsGenerating(true);

    // Generate barcodes
    const newBarcodes: GeneratedBarcode[] = [];

    // For random mode, generate one barcode and repeat it
    // For product mode, use the product's barcode
    const barcodeToUse =
      generationMode === "product" && selectedProduct?.barcode
        ? selectedProduct.barcode
        : generateRandomBarcode();

    for (let i = 0; i < count; i++) {
      if (generationMode === "product" && selectedProduct?.barcode) {
        newBarcodes.push({
          id: Date.now() + i,
          barcode: barcodeToUse,
          productName: selectedProduct.name,
          quantityMultiplier: selectedProduct.quantity_multiplier,
          unit: selectedProduct.unit,
          storeName: storeName || undefined,
          mfgDate: mfgDate || undefined,
          expDate: expDate || undefined,
          generatedAt: new Date(),
        });
      } else {
        newBarcodes.push({
          id: Date.now() + i,
          barcode: barcodeToUse,
          storeName: storeName || undefined,
          mfgDate: mfgDate || undefined,
          expDate: expDate || undefined,
          generatedAt: new Date(),
        });
      }
    }

    setGeneratedBarcodes(newBarcodes);
    toast.success(`Generated ${newBarcodes.length} barcodes successfully`);
    setIsGenerating(false);
  };

  const handleClear = () => {
    setGeneratedBarcodes([]);
    toast.success("Barcodes cleared");
  };

  const handlePrint = () => {
    // Create a new window with only barcodes for clean printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print");
      return;
    }

    const barcodeCards = document.querySelectorAll(".barcode-card");
    let barcodesHTML = "";

    barcodeCards.forEach((card) => {
      const canvas = card.querySelector("canvas");
      const storeNameEl = card.querySelector(".store-name");
      const storeName = storeNameEl?.textContent || "";
      const productInfoEl = card.querySelector(".product-info");
      const productInfo = productInfoEl?.textContent || "";
      const barcodeNumberEl = card.querySelector(".barcode-number");
      const barcodeNumber = barcodeNumberEl?.textContent || "";
      const datesRowEl = card.querySelector(".dates-row");
      const datesText = datesRowEl?.textContent || "";

      let canvasDataUrl = "";
      if (canvas) {
        canvasDataUrl = (canvas as HTMLCanvasElement).toDataURL("image/png");
      }

      barcodesHTML += `
        <div class="barcode-card">
          ${storeName ? `<div class="store-name">${storeName}</div>` : ""}
          ${productInfo ? `<div class="product-info">${productInfo}</div>` : ""}
          ${canvasDataUrl ? `<img src="${canvasDataUrl}" alt="${barcodeNumber}" />` : ""}
          <div class="barcode-number">${barcodeNumber}</div>
          ${datesText ? `<div class="dates-row">${datesText}</div>` : ""}
        </div>
      `;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcodes</title>
          <style>
            @page {
              size: A4;
              margin: 5mm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 5mm;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 2mm;
            }
            .barcode-card {
              border: 1px solid #999;
              padding: 2mm;
              text-align: center;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .store-name {
              font-size: 8px;
              font-weight: bold;
              margin-bottom: 0.5mm;
            }
            .product-info {
              font-size: 7px;
              font-weight: 500;
              margin-bottom: 0.5mm;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .barcode-card img {
              max-width: 100%;
              height: auto;
              margin: 1mm 0;
            }
            .barcode-number {
              font-family: monospace;
              font-size: 8px;
              font-weight: bold;
            }
            .dates-row {
              font-size: 6px;
              color: #666;
              margin-top: 0.5mm;
              display: flex;
              justify-content: space-between;
              padding: 0 1mm;
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${barcodesHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopyAll = () => {
    const allBarcodes = generatedBarcodes.map((b) => b.barcode).join("\n");
    navigator.clipboard.writeText(allBarcodes);
    toast.success("All barcodes copied to clipboard");
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Barcode Generator</h1>
          <p className="mt-2 text-gray-600">
            Generate unique barcodes in bulk for printing and labeling products
          </p>
        </div>

        {/* Generation Controls */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          {/* Mode Selection */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Generation Mode
            </label>
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  value="random"
                  checked={generationMode === "random"}
                  onChange={() => setGenerationMode("random")}
                  className="h-4 w-4 text-indigo-600"
                />
                <span className="text-sm">Random Barcodes</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  value="product"
                  checked={generationMode === "product"}
                  onChange={() => setGenerationMode("product")}
                  className="h-4 w-4 text-indigo-600"
                />
                <span className="text-sm">Product Barcode</span>
              </label>
            </div>
          </div>

          {/* Product Selection (when in product mode) */}
          {generationMode === "product" && (
            <div className="mb-4">
              <SearchableSelect
                label="Select Product"
                options={productOptions}
                value={selectedProductId || ""}
                onChange={(value) =>
                  setSelectedProductId(value ? Number(value) : null)
                }
                placeholder="Search by name or barcode..."
                searchPlaceholder="Type to search products..."
                onSearch={(term) => setProductSearchTerm(term)}
              />
              {selectedProduct && (
                <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="text-sm font-medium text-green-800">
                    Selected: {selectedProduct.name}
                    {selectedProduct.quantity_multiplier && (
                      <span className="ml-2 text-green-600">
                        ({selectedProduct.quantity_multiplier}{" "}
                        {selectedProduct.unit || "piece"})
                      </span>
                    )}
                  </p>
                  {selectedProduct.barcode ? (
                    <p className="text-sm text-green-600">
                      Barcode:{" "}
                      <span className="font-mono font-bold">
                        {selectedProduct.barcode}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-red-600">
                      ⚠️ This product doesn&apos;t have a barcode yet
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Label Settings */}
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              Label Settings
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Store Name"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Your Store Name"
              />
              <Input
                label="Mfg Date"
                type="date"
                value={mfgDate}
                onChange={(e) => setMfgDate(e.target.value)}
              />
              <Input
                label="Exp Date"
                type="date"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-32">
              <Input
                label="Quantity (1-100)"
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                disabled={
                  isGenerating ||
                  (generationMode === "product" && !selectedProduct?.barcode)
                }
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isGenerating ? "Generating..." : "Generate Barcodes"}
              </Button>
              {generatedBarcodes.length > 0 && (
                <>
                  <Button onClick={handleClear} variant="outline">
                    Clear
                  </Button>
                  <Button onClick={handleCopyAll} variant="outline">
                    Copy All
                  </Button>
                  <Button onClick={handlePrint} variant="outline">
                    🖨️ Print
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Generated Barcodes */}
        {generatedBarcodes.length > 0 && (
          <div
            id="barcode-print-area"
            className="rounded-lg bg-white p-6 shadow"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Generated Barcodes ({generatedBarcodes.length})
              </h2>
            </div>
            <div className="barcode-grid grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {generatedBarcodes.map((item) => (
                <BarcodeCard
                  key={item.id}
                  barcode={item.barcode}
                  productName={item.productName}
                  quantityMultiplier={item.quantityMultiplier}
                  unit={item.unit}
                  storeName={item.storeName}
                  mfgDate={item.mfgDate}
                  expDate={item.expDate}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {generatedBarcodes.length === 0 && !isGenerating && (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No barcodes generated yet
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Enter a quantity and click &quot;Generate Barcodes&quot; to get
              started
            </p>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

// Barcode Card Component for printing
interface BarcodeCardProps {
  barcode: string;
  productName?: string;
  quantityMultiplier?: number;
  unit?: string;
  storeName?: string;
  mfgDate?: string;
  expDate?: string;
}

function BarcodeCard({
  barcode,
  productName,
  quantityMultiplier,
  unit,
  storeName,
  mfgDate,
  expDate,
}: BarcodeCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Format dates for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  };

  useEffect(() => {
    if (canvasRef.current && typeof window !== "undefined") {
      // Dynamically import jsbarcode only on client side
      import("jsbarcode")
        .then(
          (JsBarcodeModule: { default?: unknown; [key: string]: unknown }) => {
            try {
              // Handle both default export and named export
              const JsBarcode = (JsBarcodeModule.default ||
                JsBarcodeModule) as (
                element: HTMLCanvasElement,
                value: string,
                options: {
                  format: string;
                  width: number;
                  height: number;
                  displayValue: boolean;
                  margin: number;
                }
              ) => void;
              if (JsBarcode && canvasRef.current) {
                JsBarcode(canvasRef.current, barcode, {
                  format: "CODE128",
                  width: 1.5,
                  height: 35,
                  displayValue: false,
                  margin: 2,
                });
              }
            } catch (error) {
              console.error("Error generating barcode:", error);
            }
          }
        )
        .catch((error) => {
          console.error("Error loading jsbarcode:", error);
        });
    }
  }, [barcode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(barcode);
    toast.success("Barcode copied to clipboard");
  };

  return (
    <div className="barcode-card flex flex-col items-center rounded border border-gray-300 bg-white p-2">
      {/* Store Name */}
      {storeName && (
        <div className="store-name mb-0.5 w-full truncate text-center text-xs font-bold text-gray-800">
          {storeName}
        </div>
      )}

      {/* Product name with quantity multiplier and unit */}
      {productName && (
        <div
          className="product-info mb-0.5 w-full truncate text-center text-[10px] font-medium text-gray-700"
          title={productName}
        >
          {productName}
          {quantityMultiplier && (
            <span className="ml-1 text-gray-500">
              {quantityMultiplier} {unit || "pc"}
            </span>
          )}
        </div>
      )}

      {/* Barcode image */}
      <div className="barcode-image flex w-full items-center justify-center bg-white">
        <canvas ref={canvasRef} className="max-w-full" />
      </div>

      {/* Barcode number */}
      <div className="barcode-number font-mono text-[10px] font-bold">
        {barcode}
      </div>

      {/* Mfg and Exp dates */}
      {(mfgDate || expDate) && (
        <div className="dates-row mt-0.5 flex w-full justify-between px-1 text-[8px] text-gray-500">
          {mfgDate && <span>Mfg: {formatDate(mfgDate)}</span>}
          {expDate && <span>Exp: {formatDate(expDate)}</span>}
        </div>
      )}

      <button
        onClick={handleCopy}
        className="mt-1 text-[10px] text-indigo-600 hover:text-indigo-800 print:hidden"
      >
        Copy
      </button>
    </div>
  );
}
