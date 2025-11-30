"use client";

import { useState } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import {
  removeItem,
  updateQuantity,
  updateWeight,
  updatePrice,
} from "@/lib/slices/cartSlice";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { Button } from "@/components/ui/Button";

interface CartProps {
  onCheckout?: () => void;
}

export function Cart({ onCheckout }: CartProps) {
  const dispatch = useAppDispatch();
  const { items, discount, tax } = useAppSelector((state) => state.cart);
  const { format: formatCurrency } = useCurrency();
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [priceInputs, setPriceInputs] = useState<Record<number, string>>({});
  const [editingWeightId, setEditingWeightId] = useState<number | null>(null);
  const [weightInputs, setWeightInputs] = useState<Record<number, string>>({});

  const subtotal = items.reduce((sum, item) => {
    const weight = item.weight ?? 1.0;
    return sum + item.price * item.quantity * weight;
  }, 0);
  const finalTotal = subtotal - discount + tax;

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
      <h2 className="mb-4 text-xl font-bold sm:text-2xl">Cart</h2>
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
                      x {item.quantity}
                      {(item.weight ?? 1.0) !== 1.0 && (
                        <span> × {(item.weight ?? 1.0).toFixed(2)}</span>
                      )}{" "}
                      ={" "}
                      {formatCurrency(
                        item.price * item.quantity * (item.weight ?? 1.0)
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
                    {editingWeightId === item.product_id ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={
                          weightInputs[item.product_id] ??
                          (item.weight ?? 1.0).toFixed(2)
                        }
                        onChange={(e) => {
                          setWeightInputs((prev) => ({
                            ...prev,
                            [item.product_id]: e.target.value,
                          }));
                        }}
                        onBlur={() => {
                          const inputValue = weightInputs[item.product_id];
                          if (inputValue !== undefined) {
                            const weight = parseFloat(inputValue);
                            if (!isNaN(weight) && weight >= 0 && weight <= 1) {
                              dispatch(
                                updateWeight({
                                  product_id: item.product_id,
                                  weight: weight,
                                })
                              );
                            }
                            setWeightInputs((prev) => {
                              const updated = { ...prev };
                              delete updated[item.product_id];
                              return updated;
                            });
                          }
                          setEditingWeightId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const inputValue = weightInputs[item.product_id];
                            if (inputValue !== undefined) {
                              const weight = parseFloat(inputValue);
                              if (
                                !isNaN(weight) &&
                                weight >= 0 &&
                                weight <= 1
                              ) {
                                dispatch(
                                  updateWeight({
                                    product_id: item.product_id,
                                    weight: weight,
                                  })
                                );
                              }
                              setWeightInputs((prev) => {
                                const updated = { ...prev };
                                delete updated[item.product_id];
                                return updated;
                              });
                            }
                            setEditingWeightId(null);
                          } else if (e.key === "Escape") {
                            setEditingWeightId(null);
                            setWeightInputs((prev) => {
                              const updated = { ...prev };
                              delete updated[item.product_id];
                              return updated;
                            });
                          }
                        }}
                        autoFocus
                        className="w-16 rounded border px-2 py-1 text-center text-sm"
                        title="Weight (0.00 - 1.00)"
                      />
                    ) : (
                      <button
                        onClick={() => setEditingWeightId(item.product_id)}
                        className="w-16 rounded border px-2 py-1 text-center text-xs text-gray-600 hover:bg-gray-50"
                        title="Click to edit weight (0.00 - 1.00)"
                      >
                        {(item.weight ?? 1.0).toFixed(2)}
                      </button>
                    )}
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
