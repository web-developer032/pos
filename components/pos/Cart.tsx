"use client";

import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { removeItem, updateQuantity } from "@/lib/slices/cartSlice";
import { useCurrency } from "@/lib/hooks/useCurrency";

export function Cart() {
  const dispatch = useAppDispatch();
  const { items, discount, tax } = useAppSelector((state) => state.cart);
  const { format: formatCurrency } = useCurrency();

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const finalTotal = subtotal - discount + tax;

  return (
    <div className="flex h-full flex-col rounded-lg bg-white p-6 shadow-lg">
      <h2 className="mb-4 text-2xl font-bold text-gray-900">Cart</h2>
      <div className="mb-4 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="py-8 text-center text-gray-500">Cart is empty</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.product_id}
                className="flex items-center justify-between rounded border p-3"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(item.price)} x {item.quantity}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max={item.stock_quantity}
                    value={item.quantity}
                    onChange={(e) =>
                      dispatch(
                        updateQuantity({
                          product_id: item.product_id,
                          quantity: parseInt(e.target.value) || 1,
                        })
                      )
                    }
                    className="w-16 rounded border px-2 py-1 text-center text-gray-900"
                  />
                  <button
                    onClick={() => dispatch(removeItem(item.product_id))}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2 border-t pt-4">
        <div className="flex justify-between text-gray-900">
          <span>Subtotal:</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-900">
          <span>Discount:</span>
          <span>-{formatCurrency(discount)}</span>
        </div>
        <div className="flex justify-between text-gray-900">
          <span>Tax:</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="flex justify-between border-t pt-2 text-lg font-bold text-gray-900">
          <span>Total:</span>
          <span>{formatCurrency(finalTotal)}</span>
        </div>
      </div>
    </div>
  );
}
