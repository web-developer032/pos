"use client";

import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { resumeCart, deleteHeldCart } from "@/lib/slices/cartSlice";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { roundPrice } from "@/lib/utils/formHelpers";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";

export function HeldCarts() {
  const dispatch = useAppDispatch();
  const { heldCarts } = useAppSelector((state) => state.cart);
  const { format: formatCurrency } = useCurrency();

  if (heldCarts.length === 0) {
    return null;
  }

  const calculateTotal = (
    items: Array<{ price: number; quantity: number }>
  ) => {
    return roundPrice(
      items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    );
  };

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow">
      <h3 className="mb-3 text-lg font-semibold">Held Carts</h3>
      <div className="space-y-2">
        {heldCarts.map((cart) => {
          const subtotal = calculateTotal(cart.items);
          const total = roundPrice(subtotal - cart.discount + cart.tax);
          const itemCount = cart.items.length;

          return (
            <div
              key={cart.id}
              className="rounded border border-gray-200 bg-gray-50 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {cart.name || `Cart ${itemCount} items`}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {itemCount} {itemCount === 1 ? "item" : "items"} •{" "}
                    {formatCurrency(total)} •{" "}
                    {format(new Date(cart.createdAt), "MMM dd, HH:mm")}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => dispatch(resumeCart(cart.id))}
                    className="bg-indigo-600 hover:bg-indigo-700"
                    size="sm"
                  >
                    Resume
                  </Button>
                  <Button
                    onClick={() => {
                      if (
                        confirm(
                          "Are you sure you want to delete this held cart? This action cannot be undone."
                        )
                      ) {
                        dispatch(deleteHeldCart(cart.id));
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
