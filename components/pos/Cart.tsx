"use client";

import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { removeItem, updateQuantity } from "@/lib/slices/cartSlice";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function Cart() {
  const dispatch = useAppDispatch();
  const { items, customerId, discount, tax } = useAppSelector(
    (state) => state.cart
  );

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const finalTotal = subtotal - discount + tax;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-4">Cart</h2>
      <div className="flex-1 overflow-y-auto mb-4">
        {items.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Cart is empty</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.product_id}
                className="border rounded p-3 flex justify-between items-center"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">
                    ${item.price.toFixed(2)} x {item.quantity}
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
                    className="w-16 px-2 py-1 border rounded text-center text-gray-900"
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
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-gray-900">
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-900">
          <span>Discount:</span>
          <span>-${discount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-900">
          <span>Tax:</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg border-t pt-2 text-gray-900">
          <span>Total:</span>
          <span>${finalTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

