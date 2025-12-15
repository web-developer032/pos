"use client";

import { useState } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import {
  removeItem,
  updateQuantity,
  updatePrice,
  clearCart,
} from "@/lib/slices/cartSlice";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { formatPriceForInput, roundPrice } from "@/lib/utils/formHelpers";
import { Button } from "@/components/ui/Button";

interface CartProps {
  onCheckout?: () => void;
  onHoldCart?: () => void;
}

export function Cart({ onCheckout, onHoldCart }: CartProps) {
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((state) => state.cart);
  const { format: formatCurrency } = useCurrency();
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [priceInputs, setPriceInputs] = useState<Record<number, string>>({});
  const [quantityInputs, setQuantityInputs] = useState<Record<number, string>>(
    {}
  );

  const handlePriceChange = (productId: number, value: string) => {
    setPriceInputs((prev) => ({ ...prev, [productId]: value }));
  };

  const handlePriceBlur = (productId: number) => {
    const inputValue = priceInputs[productId];
    if (inputValue !== undefined) {
      const newPrice = parseFloat(inputValue);
      if (!isNaN(newPrice) && newPrice >= 0) {
        dispatch(
          updatePrice({ product_id: productId, price: roundPrice(newPrice) })
        );
      }
      setPriceInputs((prev) => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
    }
    setEditingPriceId(null);
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent, productId: number) => {
    if (e.key === "Enter") {
      handlePriceBlur(productId);
    } else if (e.key === "Escape") {
      setEditingPriceId(null);
      setPriceInputs((prev) => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
    }
  };

  const cartTotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="flex flex-col rounded-xl bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900">Cart</h2>
          {items.length > 0 && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          {items.length > 0 && (
            <button
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to clear the cart? This action cannot be undone."
                  )
                ) {
                  dispatch(clearCart());
                }
              }}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Clear cart"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
          {onHoldCart && items.length > 0 && (
            <button
              onClick={onHoldCart}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-yellow-50 hover:text-yellow-600"
              title="Hold cart"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto px-3 py-2" style={{ maxHeight: "450px" }}>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <svg
              className="mb-3 h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-sm font-medium">Your cart is empty</p>
            <p className="mt-1 text-xs">Scan or select products to add</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={item.product_id}
                className="group rounded-lg border border-gray-100 bg-gray-50/50 p-3 transition-all hover:border-indigo-200 hover:bg-indigo-50/30"
              >
                {/* Product Name - Full width, wraps */}
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-gray-200 text-xs font-medium text-gray-600">
                      {index + 1}
                    </span>
                    <h3 className="text-sm font-semibold leading-tight text-gray-900">
                      {item.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => dispatch(removeItem(item.product_id))}
                    className="flex-shrink-0 rounded p-1 text-gray-400 opacity-0 transition-all hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
                    title="Remove item"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Price, Quantity, Subtotal Row */}
                <div className="flex items-center justify-between gap-2">
                  {/* Price */}
                  <div className="flex items-center gap-1">
                    {editingPriceId === item.product_id ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          priceInputs[item.product_id] ??
                          formatPriceForInput(item.price)
                        }
                        onChange={(e) =>
                          handlePriceChange(item.product_id, e.target.value)
                        }
                        onBlur={() => handlePriceBlur(item.product_id)}
                        onKeyDown={(e) =>
                          handlePriceKeyDown(e, item.product_id)
                        }
                        autoFocus
                        className="w-20 rounded border border-indigo-300 px-2 py-1 text-sm font-medium focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    ) : (
                      <button
                        onClick={() => setEditingPriceId(item.product_id)}
                        className="rounded px-1.5 py-0.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
                        title="Click to edit price"
                      >
                        {formatCurrency(item.price)}
                      </button>
                    )}
                    <span className="text-gray-400">×</span>
                  </div>

                  {/* Quantity Input */}
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={
                      quantityInputs[item.product_id] !== undefined
                        ? quantityInputs[item.product_id]
                        : item.quantity
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      if (
                        value === "" ||
                        value === "." ||
                        value === "0" ||
                        value === "0."
                      ) {
                        setQuantityInputs((prev) => ({
                          ...prev,
                          [item.product_id]: value,
                        }));
                        return;
                      }
                      const newQuantity = parseFloat(value);
                      if (!isNaN(newQuantity)) {
                        setQuantityInputs((prev) => ({
                          ...prev,
                          [item.product_id]: value,
                        }));
                      }
                    }}
                    onBlur={() => {
                      const inputValue = quantityInputs[item.product_id];
                      if (inputValue !== undefined) {
                        const newQuantity = parseFloat(inputValue);
                        if (!isNaN(newQuantity) && newQuantity >= 0.001) {
                          dispatch(
                            updateQuantity({
                              product_id: item.product_id,
                              quantity: newQuantity,
                            })
                          );
                        } else if (newQuantity < 0.001) {
                          dispatch(
                            updateQuantity({
                              product_id: item.product_id,
                              quantity: 0.001,
                            })
                          );
                        }
                        setQuantityInputs((prev) => {
                          const updated = { ...prev };
                          delete updated[item.product_id];
                          return updated;
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                    className="w-16 rounded border border-gray-200 px-2 py-1 text-center text-sm font-medium transition-colors focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />

                  {/* Subtotal */}
                  <div className="min-w-[80px] text-right">
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with Total and Checkout */}
      {items.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3">
          {/* Cart Total */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">
              Cart Total
            </span>
            <span className="text-xl font-bold text-gray-900">
              {formatCurrency(cartTotal)}
            </span>
          </div>

          {/* Checkout Button */}
          {onCheckout && (
            <Button
              className="w-full bg-indigo-600 py-3 text-base font-semibold hover:bg-indigo-700"
              onClick={onCheckout}
              disabled={items.length === 0}
            >
              Proceed to Checkout
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
