"use client";

import {
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useState,
} from "react";
import { useReactToPrint } from "react-to-print";
import { useCurrency } from "@/lib/hooks/useCurrency";
import type { Sale, SaleItem } from "@/lib/api/salesApi";
import { useGetSettingsQuery } from "@/lib/api/settingsApi";

interface ReceiptProps {
  sale: Sale;
  items: SaleItem[];
}

export interface ReceiptRef {
  print: () => void;
}

export const Receipt = forwardRef<ReceiptRef, ReceiptProps>(
  ({ sale, items }, ref) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    const { format: formatCurrency } = useCurrency();
    const { data: settingsData } = useGetSettingsQuery();
    const [receiptSettings, setReceiptSettings] = useState({
      storeName: "",
      address: "",
      phone: "",
      phone2: "",
      operatingHours: "",
      logo: "",
      terms: "",
    });

    useEffect(() => {
      if (settingsData?.settings) {
        const settings = settingsData.settings;
        setReceiptSettings({
          storeName: settings.receipt_store_name,
          address: settings.receipt_address || "",
          phone: settings.receipt_phone || "",
          phone2: settings.receipt_phone2 || "",
          operatingHours: settings.receipt_operating_hours || "",
          logo: settings.receipt_logo || "",
          terms: settings.receipt_terms || "",
        });
      }
    }, [settingsData]);

    const handlePrint = useReactToPrint({
      contentRef: receiptRef,
      documentTitle: `Receipt-${sale.sale_number}`,
    });

    useImperativeHandle(ref, () => ({
      print: handlePrint,
    }));

    // Format date and time - handle UTC dates correctly
    let saleDate: Date;
    const dateString = sale.created_at;
    if (typeof dateString === "string") {
      // If the string doesn't have timezone info, treat it as UTC
      // Database stores times in UTC, so we need to parse them as UTC
      if (
        !dateString.includes("Z") &&
        !dateString.includes("+") &&
        !dateString.includes("-", 10)
      ) {
        // Format: "2025-11-23 19:54:00" - treat as UTC
        saleDate = new Date(dateString + "Z");
      } else {
        saleDate = new Date(dateString);
      }
    } else {
      saleDate = new Date(dateString);
    }

    const formattedDate = saleDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: undefined, // Use system timezone
    });
    const formattedTime = saleDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: undefined, // Use system timezone
    });

    // Parse terms (split by newline)
    const termsLines = receiptSettings.terms
      ? receiptSettings.terms.split("\n").filter((line) => line.trim())
      : [];

    return (
      <div ref={receiptRef} className="receipt-container">
        {/* Store Header */}
        <div className="mb-3 text-center">
          {receiptSettings.logo && (
            <div className="mb-2">
              <img
                src={receiptSettings.logo}
                alt="Store Logo"
                className="mx-auto h-16 w-auto object-contain"
              />
            </div>
          )}
          {!!receiptSettings.storeName && (
            <h2 className="mb-1 text-lg font-bold">
              {receiptSettings.storeName}
            </h2>
          )}
        </div>

        {/* Transaction Details */}
        <div className="mb-3 border-b border-gray-300 pb-2 text-xs">
          <div className="mb-1 flex justify-between">
            <span>ID:</span>
            <span className="font-semibold">{sale.sale_number}</span>
          </div>
          <div className="mb-1 flex justify-between">
            <span>DATE:</span>
            <span>
              {formattedDate} {formattedTime}
            </span>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-3">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="pb-1 text-left">S#</th>
                <th className="pb-1 text-left">ITEM</th>
                <th className="pb-1 text-right">QTY</th>
                <th className="pb-1 text-right">PRICE</th>
                <th className="pb-1 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="py-1">{index + 1}</td>
                  <td className="py-1">{item.product_name}</td>
                  <td className="py-1 text-right">{item.quantity}</td>
                  <td className="py-1 text-right">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="py-1 text-right font-semibold">
                    {formatCurrency(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="mb-3 space-y-1 border-b border-gray-300 pb-2 text-xs">
          <div className="flex justify-between">
            <span>SUB-TOTAL:</span>
            <span>{formatCurrency(sale.total_amount)}</span>
          </div>
          {sale.discount_amount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>DISCOUNT:</span>
              <span>-{formatCurrency(sale.discount_amount)}</span>
            </div>
          )}
          {sale.tax_amount > 0 && (
            <div className="flex justify-between">
              <span>TAX:</span>
              <span>{formatCurrency(sale.tax_amount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>CASH-PAID-IN:</span>
            <span>{formatCurrency(sale.final_amount)}</span>
          </div>
        </div>

        {/* Terms & Conditions */}
        {termsLines.length > 0 && (
          <div className="mb-3 pt-2 text-xs">
            <div className="mb-1.5 font-semibold">Terms & Conditions</div>
            <ul className="space-y-0.5">
              {termsLines.map((term, index) => (
                <li key={index} className="leading-tight">
                  • {term}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Store Information Footer */}
        {(receiptSettings.address ||
          receiptSettings.phone ||
          receiptSettings.operatingHours) && (
          <div className="mb-3 border-t border-gray-300 pt-2 text-center text-xs">
            {receiptSettings.address && (
              <p className="mb-1">{receiptSettings.address}</p>
            )}
            {receiptSettings.phone && (
              <p className="mb-1">
                Ph : {receiptSettings.phone}
                {receiptSettings.phone2 && ` ${receiptSettings.phone2}`}
              </p>
            )}
            {receiptSettings.operatingHours && (
              <p>{receiptSettings.operatingHours}</p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 text-center text-xs">
          <p>Thank you for your purchase!</p>
        </div>
      </div>
    );
  }
);

Receipt.displayName = "Receipt";
