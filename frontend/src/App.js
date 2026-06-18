import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Detector from "./pages/Detector";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";
import Login from "./pages/Login";
import { Toaster } from "sonner";

function App() {
  return (
    <div className="App">
      <AppProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Layout />}>
                <Route index element={<Login />} />
              </Route>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route
                  path="detector"
                  element={
                    <ProtectedRoute>
                      <Detector />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="about" element={<About />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster theme="dark" position="bottom-right" />
        </AuthProvider>
      </AppProvider>
    </div>
  );
}

export default App;
