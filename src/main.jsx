import React, { Component } from "react";
import { createRoot } from "react-dom/client";
import CloudGate from "./components/CloudGate.jsx";
import "./styles.css";
class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="recovery panel">
        <h1>تعذر عرض الصفحة</h1>
        <p>أعد تحميل الصفحة. بياناتك المحلية لن تُحذف.</p>
        <button className="btn primary" onClick={() => location.reload()}>
          إعادة المحاولة
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <CloudGate />
    </ErrorBoundary>
  </React.StrictMode>,
);
// Network-first worker, production only. No worker registration while developing.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        reg.update();
      })
      .catch(() => {
        /* Offline/PWA support is optional; app remains functional. */
      });
  });
}
