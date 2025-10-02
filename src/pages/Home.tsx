import type { JSX } from "react"
import logo from "../assets/nautilus.svg"

export const Home = (): JSX.Element => (
  <header className="App-splash">
    <img src={logo} className="App-logo" alt="logo" />
    <p>OceanDataTools.org</p>
    <p>Vite + React + Redux Template</p>
  </header>
)
