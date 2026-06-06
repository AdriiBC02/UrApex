import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { OverlayApp } from "./components/Overlay"
import "./styles.css"

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement)

if (window.location.hash === "#overlay") {
  root.render(
    <React.StrictMode>
      <OverlayApp />
    </React.StrictMode>
  )
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
