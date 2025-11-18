"use client";

import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { removeItem, updateQuantity } from "@/lib/slices/cartSlice";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { Button } from "@/components/ui/Button";

interface CartProps {
  onCheckout?: () => void;
}

export function Cart({ onCheckout }: CartProps) {
  const dispatch = useAppDispatch();
  const { items, discount, tax } = useAppSelector((state) => state.cart);
  const { format: formatCurrency } = useCurrency();

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const finalTotal = subtotal - discount + tax;

  return (
    <div className="flex flex-col rounded-lg bg-white p-4 shadow-lg sm:p-6">
      <h2 className="mb-4 text-xl font-bold sm:text-2xl">Cart</h2>
      <div className="mb-4 max-h-[400px] flex-1 overflow-y-auto sm:max-h-[500px]">
        {items.length === 0 ? (
          <p className="py-8 text-center text-gray-500">Cart is empty</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.product_id}
                className="flex flex-col gap-2 rounded border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(item.price)} x {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      dispatch(
                        updateQuantity({
                          product_id: item.product_id,
                          quantity: parseInt(e.target.value) || 1,
                        })
                      )
                    }
                    className="w-16 rounded border px-2 py-1 text-center"
                  />
                  <button
                    onClick={() => dispatch(removeItem(item.product_id))}
                    className="text-sm text-red-600 hover:text-red-800 sm:text-base"
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
        <div className="flex justify-between text-sm sm:text-base">
          <span>Subtotal:</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm sm:text-base">
          <span>Discount:</span>
          <span>-{formatCurrency(discount)}</span>
        </div>
        <div className="flex justify-between text-sm sm:text-base">
          <span>Tax:</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-bold sm:text-lg">
          <span>Total:</span>
          <span>{formatCurrency(finalTotal)}</span>
        </div>
        {onCheckout && (
          <Button
            className="mt-4 w-full"
            onClick={onCheckout}
            disabled={items.length === 0}
          >
            Checkout
          </Button>
        )}
      </div>
    </div>
  );
}
