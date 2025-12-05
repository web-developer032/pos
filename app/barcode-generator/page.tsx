"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  generateRandomBarcode,
  formatBarcodeDisplay,
} from "@/lib/utils/barcodeGenerator";
import toast from "react-hot-toast";
// Import jsbarcode - will be loaded dynamically in useEffect

interface GeneratedBarcode {
  id: number;
  barcode: string;
  generatedAt: Date;
}

export default function BarcodeGeneratorPage() {
  const [quantity, setQuantity] = useState<string>("10");
  const [generatedBarcodes, setGeneratedBarcodes] = useState<
    GeneratedBarcode[]
  >([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Add print styles
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @media print {
        body {
          margin: 0;
          padding: 20px;
        }
        nav, header, button {
          display: none !important;
        }
        .print\\:grid-cols-3 {
          grid-template-columns: repeat(3, 1fr) !important;
        }
        .print\\:break-inside-avoid {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .print\\:border {
          border: 1px solid #d1d5db !important;
        }
        @page {
          size: A4;
          margin: 1cm;
        }
        .shadow {
          box-shadow: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const handleGenerate = () => {
    const count = parseInt(quantity, 10);
    if (isNaN(count) || count < 1 || count > 100) {
      toast.error("Please enter a number between 1 and 100");
      return;
    }

    setIsGenerating(true);

    // Generate barcodes synchronously (fast enough for client-side)
    const newBarcodes: GeneratedBarcode[] = [];
    for (let i = 0; i < count; i++) {
      newBarcodes.push({
        id: Date.now() + i,
        barcode: generateRandomBarcode(),
        generatedAt: new Date(),
      });
    }

    setGeneratedBarcodes((prev) => [...prev, ...newBarcodes]);
    toast.success(`Generated ${newBarcodes.length} barcodes successfully`);
    setIsGenerating(false);
  };

  const handleClear = () => {
    setGeneratedBarcodes([]);
    toast.success("Barcodes cleared");
  };

  const handlePrint = () => {
    window.print();
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
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
                disabled={isGenerating}
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
                    Print
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Generated Barcodes */}
        {generatedBarcodes.length > 0 && (
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Generated Barcodes ({generatedBarcodes.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 print:grid-cols-3">
              {generatedBarcodes.map((item) => (
                <BarcodeCard key={item.id} barcode={item.barcode} />
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
function BarcodeCard({ barcode }: { barcode: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const formattedBarcode = formatBarcodeDisplay(barcode);

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
                  width: 2,
                  height: 50,
                  displayValue: false,
                  margin: 10,
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
    <div className="flex flex-col items-center justify-between rounded border border-gray-200 bg-white p-4 print:break-inside-avoid print:border print:border-gray-300">
      <div className="mb-2 w-full text-center">
        <div className="mb-2 text-xs font-medium text-gray-500">BARCODE</div>
        <div className="mb-1 font-mono text-lg font-bold">{barcode}</div>
        <div className="text-xs text-gray-400">{formattedBarcode}</div>
      </div>
      {/* Barcode image */}
      <div className="mb-2 flex h-20 w-full items-center justify-center border border-gray-300 bg-white p-2">
        <canvas ref={canvasRef} className="max-w-full" />
      </div>
      <button
        onClick={handleCopy}
        className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 print:hidden"
      >
        Copy
      </button>
    </div>
  );
}
