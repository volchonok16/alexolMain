import React from "react";
import ReactDOM from "react-dom/client";
import "./index.scss";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import HomeView from "./views/HomeView";

const router = createBrowserRouter([
    {
        path: "/",
        element: <HomeView />,
    },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <ToastContainer></ToastContainer>
        <RouterProvider router={router} />
    </React.StrictMode>
);
