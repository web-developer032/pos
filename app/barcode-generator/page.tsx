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
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      toast.error("Please allow popups to print");
      return;
    }

    const barcodeCards = document.querySelectorAll(".barcode-card");
    if (barcodeCards.length === 0) {
      toast.error("No barcodes to print. Generate some first!");
      printWindow.close();
      return;
    }

    let barcodesHTML = "";

    barcodeCards.forEach((card) => {
      const canvas = card.querySelector("canvas");
      const storeNameEl = card.querySelector(".store-name");
      const storeName = storeNameEl?.textContent || "";
      const productInfoEl = card.querySelector(".product-info");
      const productInfo = productInfoEl?.innerHTML || "";
      const barcodeNumberEl = card.querySelector(".barcode-number");
      const barcodeNumber = barcodeNumberEl?.textContent || "";

      // Get individual date spans for proper formatting
      const datesRowEl = card.querySelector(".dates-row");
      const mfgSpan = datesRowEl?.querySelector("span:first-child");
      const expSpan = datesRowEl?.querySelector("span:last-child");
      const mfgText = mfgSpan?.textContent || "";
      const expText = expSpan?.textContent || "";

      let canvasDataUrl = "";
      if (canvas) {
        try {
          canvasDataUrl = (canvas as HTMLCanvasElement).toDataURL("image/png");
        } catch (e) {
          console.error("Failed to get canvas data:", e);
        }
      }

      barcodesHTML += `
        <div class="barcode-card">
          ${storeName ? `<div class="store-name">${storeName}</div>` : ""}
          ${productInfo ? `<div class="product-info">${productInfo}</div>` : ""}
          ${canvasDataUrl ? `<img src="${canvasDataUrl}" alt="${barcodeNumber}" />` : `<div style="color:red;">No barcode image</div>`}
          <div class="barcode-number">${barcodeNumber}</div>
          ${mfgText || expText ? `<div class="dates-row"><span>${mfgText}</span><span>${expText}</span></div>` : ""}
        </div>
      `;
    });

    // Label dimensions: 1" x 1.5" = 25.4mm x 38.1mm
    // Screen preview: 3x scale for visibility (96px x 144px per label)
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcodes - TLP 2844-Z (1" x 1.5")</title>
          <style>
            /* TLP 2844-Z Label Printer - LANDSCAPE: 1.5" wide × 1" tall */
            @page {
              size: 38.1mm 25.4mm;
              margin: 0 !important;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 20px;
              font-family: Arial, Helvetica, sans-serif;
              background: #f0f0f0;
            }
            .header {
              background: #4F46E5;
              color: white;
              padding: 15px 20px;
              margin: -20px -20px 20px -20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .header h1 {
              font-size: 16px;
              font-weight: bold;
            }
            .print-btn {
              padding: 10px 25px;
              background: white;
              color: #4F46E5;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-size: 14px;
              font-weight: bold;
            }
            .print-btn:hover {
              background: #E0E7FF;
            }
            .info {
              background: #FEF3C7;
              border: 1px solid #F59E0B;
              padding: 10px 15px;
              margin-bottom: 20px;
              border-radius: 5px;
              font-size: 12px;
              color: #92400E;
            }
            .grid {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              justify-content: flex-start;
            }
            .barcode-card {
              width: 180px;
              height: 120px;
              padding: 6px;
              text-align: center;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              background: white;
              border: 2px solid #333;
              border-radius: 4px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .store-name {
              font-size: 10px;
              font-weight: bold;
              line-height: 1.1;
              max-width: 170px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              color: #000;
            }
            .product-info {
              font-size: 9px;
              font-weight: 600;
              max-width: 170px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              line-height: 1.1;
              color: #000;
            }
            .barcode-card img {
              width: 170px;
              height: 50px;
              object-fit: contain;
              margin: 2px 0;
            }
            .barcode-number {
              font-family: 'Courier New', monospace;
              font-size: 10px;
              font-weight: bold;
              letter-spacing: 0.5px;
              line-height: 1.1;
              color: #000;
              display: block;
            }
            .dates-row {
              font-size: 8px;
              color: #000;
              display: flex;
              justify-content: space-between;
              width: 170px;
              line-height: 1;
            }
            
            /* Print styles - LANDSCAPE: 1.5" wide × 1" tall */
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                width: 38.1mm;
              }
              .header, .info {
                display: none !important;
              }
              .grid {
                display: block;
                width: 38.1mm;
                gap: 0;
              }
              .barcode-card {
                width: 38.1mm !important;
                height: 25.4mm !important;
                padding: 0.5mm 1mm;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                page-break-after: always;
                page-break-inside: avoid;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: space-between !important;
              }
              .barcode-card:last-child {
                page-break-after: auto;
              }
              .store-name {
                font-size: 6pt !important;
                font-weight: bold !important;
                display: block !important;
                max-width: 36mm !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                white-space: nowrap !important;
                text-align: center !important;
              }
              .product-info {
                font-size: 5pt !important;
                font-weight: 600 !important;
                display: block !important;
                max-width: 36mm !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                white-space: nowrap !important;
                text-align: center !important;
              }
              /* Wide horizontal barcode */
              .barcode-card img {
                width: 36mm !important;
                height: 10mm !important;
                object-fit: contain !important;
                margin: 0 !important;
              }
              .barcode-number {
                font-size: 7pt !important;
                font-weight: bold !important;
                display: block !important;
                font-family: 'Courier New', monospace !important;
                letter-spacing: 0.5px !important;
              }
              .dates-row {
                font-size: 5pt !important;
                display: flex !important;
                justify-content: space-between !important;
                width: 36mm !important;
              }
              .dates-row span {
                display: inline !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏷️ Label Preview (${barcodeCards.length} labels)</h1>
            <button class="print-btn" onclick="window.print()">🖨️ Print Again</button>
          </div>
          <div class="info">
            <strong>⚠️ Printer Setup:</strong> Zebra TLP-2844-Z | Paper: 1.5" × 1" | Margins: None | Scale: 100%
          </div>
          <div class="grid">
            ${barcodesHTML}
          </div>
          <script>
            // Auto-print when images are loaded
            var images = document.querySelectorAll('img');
            var loaded = 0;
            var total = images.length;
            
            function tryPrint() {
              loaded++;
              if (loaded >= total) {
                setTimeout(function() { window.print(); }, 200);
              }
            }
            
            if (total === 0) {
              setTimeout(function() { window.print(); }, 200);
            } else {
              images.forEach(function(img) {
                if (img.complete) {
                  tryPrint();
                } else {
                  img.onload = tryPrint;
                  img.onerror = tryPrint;
                }
              });
            }
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
            <div className="barcode-grid grid max-w-[120px] grid-cols-1 gap-3">
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
                  width: 2, // Wide bars for thermal printing
                  height: 40, // Short height for landscape label
                  displayValue: false,
                  margin: 5, // Quiet zone for scanning
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
            <span className="qty-multiplier ml-1 text-gray-500">
              &nbsp;{quantityMultiplier} {unit || "pc"}
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
