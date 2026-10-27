import React from "react";
import ReactDOM from "react-dom/client";
import "./shared/styles/theme.css";
import "./shared/styles/main.css";

import { routeTree } from './routeTree.gen'
import { createRouter, RouterProvider } from "@tanstack/react-router";

const router = createRouter({
  routeTree,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
