import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "./api/base-api";
import session from "./slices/session-slice";
import sidebar from "./slices/sidebar-slice";

export const makeStore = () =>
  configureStore({
    reducer: { session, sidebar, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  });
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
