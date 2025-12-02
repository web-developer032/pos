"use client";

import { useState } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import {
  removeItem,
  updateQuantity,
  updatePrice,
} from "@/lib/slices/cartSlice";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { Button } from "@/components/ui/Button";

interface CartProps {
  onCheckout?: () => void;
}

export function Cart({ onCheckout }: CartProps) {
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
        dispatch(updatePrice({ product_id: productId, price: newPrice }));
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

  return (
    <div className="flex flex-col rounded-lg bg-white p-4 shadow-lg sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold sm:text-2xl">Cart</h2>
        {onCheckout && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={onCheckout}
            disabled={items.length === 0}
          >
            Checkout
          </Button>
        )}
      </div>
      <div className="mb-4 max-h-[400px] flex-1 overflow-y-auto sm:max-h-[500px]">
        {items.length === 0 ? (
          <p className="py-8 text-center text-gray-500">Cart is empty</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.product_id}
                className="flex flex-col gap-2 rounded border p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Price:</span>
                      {editingPriceId === item.product_id ? (
                        <input
                          type="number"
                          min="0"
                          value={
                            priceInputs[item.product_id] ??
                            item.price.toString()
                          }
                          onChange={(e) =>
                            handlePriceChange(item.product_id, e.target.value)
                          }
                          onBlur={() => handlePriceBlur(item.product_id)}
                          onKeyDown={(e) =>
                            handlePriceKeyDown(e, item.product_id)
                          }
                          autoFocus
                          className="w-20 rounded border px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      ) : (
                        <button
                          onClick={() => setEditingPriceId(item.product_id)}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                          title="Click to edit price"
                        >
                          {formatCurrency(item.price)}
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      x {item.quantity} ={" "}
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={
                        quantityInputs[item.product_id] !== undefined
                          ? quantityInputs[item.product_id]
                          : item.quantity
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty string and intermediate typing states
                        if (value === "" || value === "." || value === "0") {
                          setQuantityInputs((prev) => ({
                            ...prev,
                            [item.product_id]: value,
                          }));
                          return;
                        }
                        const newQuantity = parseFloat(value);
                        // Only update if it's a valid number
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
                          if (!isNaN(newQuantity) && newQuantity >= 0.1) {
                            dispatch(
                              updateQuantity({
                                product_id: item.product_id,
                                quantity: newQuantity,
                              })
                            );
                          } else if (newQuantity < 0.1) {
                            // Reset to minimum if below 0.1
                            dispatch(
                              updateQuantity({
                                product_id: item.product_id,
                                quantity: 0.1,
                              })
                            );
                          }
                          // Clear the input state to show the actual quantity
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
                      className="w-20 rounded border px-2 py-1 text-center"
                    />
                  </div>
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
    </div>
  );
}
