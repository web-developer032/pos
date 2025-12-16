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
import { parseDatabaseTimestamp, formatTimeOnly } from "@/lib/utils/dateTime";
import { format } from "date-fns";

interface ReceiptProps {
  sale: Sale;
  items: SaleItem[];
  amountPaid?: number; // For partial/credit payments
}

export interface ReceiptRef {
  print: () => void;
}

export const Receipt = forwardRef<ReceiptRef, ReceiptProps>(
  ({ sale, items, amountPaid }, ref) => {
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

    // Format date and time using centralized utility
    const saleDate = parseDatabaseTimestamp(sale.created_at);
    // Use DD/MM/YYYY format for receipt (as per design)
    const formattedDate = format(saleDate, "dd/MM/yyyy");
    const formattedTime = formatTimeOnly(saleDate, {
      includeSeconds: true,
      hour12: true,
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
          <div className="flex justify-between font-semibold">
            <span>TOTAL:</span>
            <span>{formatCurrency(sale.final_amount)}</span>
          </div>

          {/* Payment Details */}
          {amountPaid !== undefined ? (
            <>
              <div className="flex justify-between pt-1">
                <span>{sale.payment_method?.toUpperCase()}-PAID:</span>
                <span>{formatCurrency(amountPaid)}</span>
              </div>
              {amountPaid < sale.final_amount && (
                <div className="flex justify-between font-semibold text-amber-600">
                  <span>CREDIT (OWED):</span>
                  <span>{formatCurrency(sale.final_amount - amountPaid)}</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex justify-between">
              <span>{sale.payment_method?.toUpperCase()}-PAID:</span>
              <span>{formatCurrency(sale.final_amount)}</span>
            </div>
          )}
        </div>

        {/* Customer Info for Credit Sales */}
        {sale.customer_name && sale.payment_status !== "completed" && (
          <div className="mb-3 rounded border border-amber-300 bg-amber-50 p-2 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold">CUSTOMER:</span>
              <span>{sale.customer_name}</span>
            </div>
          </div>
        )}

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
