"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { setupListeners } from "@reduxjs/toolkit/query";
import { SessionExpiry } from "./session-expiry";
import { makeStore } from "./store";

export function StoreProvider({ children }: { readonly children: ReactNode }) {
  const [store] = useState(makeStore);
  useEffect(() => setupListeners(store.dispatch), [store]);
  return (
    <Provider store={store}>
      <SessionExpiry />
      {children}
    </Provider>
  );
}
