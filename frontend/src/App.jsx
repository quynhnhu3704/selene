// frontend\src\App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppRouter from "./app/router";

function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;