import { configureStore } from "@reduxjs/toolkit";
import loaderReducer from "./features/loaderSlice";
import userReducer from "./features/userSlice";

const store = configureStore({
  reducer: {
    loader: loaderReducer,
    user: userReducer,
  },
});

export default store;
