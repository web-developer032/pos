"use client";

import { useRef, useImperativeHandle, forwardRef } from "react";
import { useReactToPrint } from "react-to-print";
import { formatSystemDate } from "@/lib/utils/dateFormat";
import { useCurrency } from "@/lib/hooks/useCurrency";
import type { Sale, SaleItem } from "@/lib/api/salesApi";

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

    const handlePrint = useReactToPrint({
      contentRef: receiptRef,
      documentTitle: `Receipt-${sale.sale_number}`,
    });

    useImperativeHandle(ref, () => ({
      print: handlePrint,
    }));

    return (
      <div ref={receiptRef} className="receipt-container">
        <div className="mb-4 text-center">
          <h2 className="mb-1 text-2xl font-bold">RECEIPT</h2>
          <p className="text-sm text-gray-600">Thank you for your purchase!</p>
        </div>

        <div className="mb-3 border-b border-gray-300 pb-3">
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-gray-600">Sale #:</span>
            <span className="font-semibold">{sale.sale_number}</span>
          </div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-gray-600">Date:</span>
            <span>{formatSystemDate(sale.created_at)}</span>
          </div>
          {sale.customer_name && (
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-gray-600">Customer:</span>
              <span>{sale.customer_name}</span>
            </div>
          )}
          {sale.user_name && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cashier:</span>
              <span>{sale.user_name}</span>
            </div>
          )}
        </div>

        <div className="mb-3 border-b border-gray-300 pb-3">
          <div className="mb-2 text-sm font-semibold">Items:</div>
          {items.map((item) => (
            <div key={item.id} className="mb-2 text-sm">
              <div className="mb-1 flex justify-between">
                <span className="font-medium">{item.product_name}</span>
                <span>{formatCurrency(item.subtotal)}</span>
              </div>
              <div className="ml-2 flex justify-between text-xs text-gray-600">
                <span>
                  {item.quantity} × {formatCurrency(item.unit_price)}
                  {item.discount > 0 && (
                    <span className="text-red-600">
                      {" "}
                      (-{formatCurrency(item.discount)})
                    </span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(sale.total_amount)}</span>
          </div>
          {sale.discount_amount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount:</span>
              <span>-{formatCurrency(sale.discount_amount)}</span>
            </div>
          )}
          {sale.tax_amount > 0 && (
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>{formatCurrency(sale.tax_amount)}</span>
            </div>
          )}
        </div>

        <div className="mb-3 border-t-2 border-gray-400 pt-2">
          <div className="flex justify-between text-lg font-bold">
            <span>TOTAL:</span>
            <span>{formatCurrency(sale.final_amount)}</span>
          </div>
        </div>
      </div>
    );
  }
);

Receipt.displayName = "Receipt";
