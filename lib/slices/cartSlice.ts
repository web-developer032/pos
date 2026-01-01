import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { roundPrice } from "@/lib/utils/formHelpers";

export interface CartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  stock_quantity: number;
  isReturn?: boolean;
  returnFromSaleId?: number;
  returnFromSaleItemId?: number;
  costPrice?: number;
}

export interface HeldCart {
  id: string;
  items: CartItem[];
  customerId?: number;
  discount: number;
  tax: number;
  name?: string;
  createdAt: number;
}

interface CartState {
  items: CartItem[];
  customerId?: number;
  discount: number;
  tax: number;
  heldCarts: HeldCart[];
}

const initialState: CartState = {
  items: [],
  customerId: undefined,
  discount: 0,
  tax: 0,
  heldCarts: [],
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existingItemIndex = state.items.findIndex(
        (item) =>
          item.product_id === action.payload.product_id && !item.isReturn
      );
      if (existingItemIndex !== -1) {
        // Item exists: update quantity and move to top
        const existingItem = state.items[existingItemIndex];
        existingItem.quantity += action.payload.quantity;
        // Remove from current position and add to beginning
        state.items.splice(existingItemIndex, 1);
        state.items.unshift(existingItem);
      } else {
        // New item: add to beginning (top of cart) with rounded price
        state.items.unshift({
          ...action.payload,
          price: roundPrice(action.payload.price),
        });
      }
    },
    addReturnItem: (state, action: PayloadAction<CartItem>) => {
      // For generic returns (no linked sale), check by product_id
      // For linked returns, check by returnFromSaleItemId
      const existingReturnIndex = state.items.findIndex((item) => {
        if (!item.isReturn) return false;
        if (action.payload.returnFromSaleItemId) {
          return (
            item.returnFromSaleItemId === action.payload.returnFromSaleItemId
          );
        }
        // Generic return - match by product_id and no sale link
        return (
          item.product_id === action.payload.product_id &&
          !item.returnFromSaleItemId
        );
      });

      if (existingReturnIndex !== -1) {
        // Already added this return item, update quantity
        const existingItem = state.items[existingReturnIndex];
        existingItem.quantity += action.payload.quantity;
        // Move to top
        state.items.splice(existingReturnIndex, 1);
        state.items.unshift(existingItem);
      } else {
        // New return item: add to beginning
        state.items.unshift({
          ...action.payload,
          price: roundPrice(action.payload.price),
          isReturn: true,
        });
      }
    },
    removeItem: (
      state,
      action: PayloadAction<
        | number
        | {
            product_id: number;
            isReturn?: boolean;
            returnFromSaleItemId?: number;
          }
      >
    ) => {
      if (typeof action.payload === "number") {
        // Legacy: remove by product_id (only non-return items)
        state.items = state.items.filter(
          (item) => item.product_id !== action.payload || item.isReturn
        );
      } else {
        // New: remove by product_id and optionally returnFromSaleItemId
        const { product_id, isReturn, returnFromSaleItemId } = action.payload;
        if (isReturn) {
          if (returnFromSaleItemId !== undefined) {
            // Remove linked return item by sale_item_id
            state.items = state.items.filter(
              (item) => item.returnFromSaleItemId !== returnFromSaleItemId
            );
          } else {
            // Remove generic return item by product_id
            state.items = state.items.filter(
              (item) =>
                !(
                  item.isReturn &&
                  item.product_id === product_id &&
                  !item.returnFromSaleItemId
                )
            );
          }
        } else {
          // Remove regular item
          state.items = state.items.filter(
            (item) => item.product_id !== product_id || item.isReturn
          );
        }
      }
    },
    updateQuantity: (
      state,
      action: PayloadAction<{ product_id: number; quantity: number }>
    ) => {
      const item = state.items.find(
        (item) => item.product_id === action.payload.product_id
      );
      if (item) {
        item.quantity = Math.max(0.001, action.payload.quantity); // Ensure minimum 0.001
      }
    },
    updatePrice: (
      state,
      action: PayloadAction<{ product_id: number; price: number }>
    ) => {
      const item = state.items.find(
        (item) => item.product_id === action.payload.product_id
      );
      if (item) {
        item.price = roundPrice(action.payload.price);
      }
    },
    setCustomer: (state, action: PayloadAction<number | undefined>) => {
      state.customerId = action.payload;
    },
    setDiscount: (state, action: PayloadAction<number>) => {
      state.discount = roundPrice(action.payload);
    },
    setTax: (state, action: PayloadAction<number>) => {
      state.tax = roundPrice(action.payload);
    },
    clearCart: (state) => {
      state.items = [];
      state.customerId = undefined;
      state.discount = 0;
      state.tax = 0;
    },
    holdCart: (state, action: PayloadAction<{ name?: string } | undefined>) => {
      if (state.items.length === 0) return;

      const name = action.payload?.name;

      const heldCart: HeldCart = {
        id: `held-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        items: [...state.items],
        customerId: state.customerId,
        discount: state.discount,
        tax: state.tax,
        name: name,
        createdAt: Date.now(),
      };

      state.heldCarts.push(heldCart);
      state.items = [];
      state.customerId = undefined;
      state.discount = 0;
      state.tax = 0;
    },
    resumeCart: (state, action: PayloadAction<string>) => {
      const heldCartIndex = state.heldCarts.findIndex(
        (cart) => cart.id === action.payload
      );

      if (heldCartIndex === -1) return;

      const heldCart = state.heldCarts[heldCartIndex];

      // If there are items in the current cart, hold it first
      if (state.items.length > 0) {
        const currentHeldCart: HeldCart = {
          id: `held-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          items: [...state.items],
          customerId: state.customerId,
          discount: state.discount,
          tax: state.tax,
          createdAt: Date.now(),
        };
        state.heldCarts.push(currentHeldCart);
      }

      // Resume the selected cart
      state.items = [...heldCart.items];
      state.customerId = heldCart.customerId;
      state.discount = heldCart.discount;
      state.tax = heldCart.tax;

      // Remove from held carts
      state.heldCarts.splice(heldCartIndex, 1);
    },
    deleteHeldCart: (state, action: PayloadAction<string>) => {
      state.heldCarts = state.heldCarts.filter(
        (cart) => cart.id !== action.payload
      );
    },
    updateHeldCartName: (
      state,
      action: PayloadAction<{ id: string; name: string }>
    ) => {
      const cart = state.heldCarts.find((c) => c.id === action.payload.id);
      if (cart) {
        cart.name = action.payload.name;
      }
    },
  },
});

export const {
  addItem,
  addReturnItem,
  removeItem,
  updateQuantity,
  updatePrice,
  setCustomer,
  setDiscount,
  setTax,
  clearCart,
  holdCart,
  resumeCart,
  deleteHeldCart,
  updateHeldCartName,
} = cartSlice.actions;

export default cartSlice.reducer;
