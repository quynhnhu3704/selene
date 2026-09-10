// frontend\src\App.jsx
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AppRouter from "./app/router";

function App() {
  return (
    <BrowserRouter>
      <AppRouter />

      <ToastContainer
        position="top-right"
        autoClose={4000}
        newestOnTop
        closeOnClick
      />
    </BrowserRouter>
  );
}

export default App;
