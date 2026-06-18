import { Outlet } from "react-router-dom";
import { AmbientBackground } from "./AmbientBackground";
import { Nav } from "./Nav";
import { Footer } from "./Footer";

export const Layout = () => {
  return (
    <div className="relative min-h-screen text-white">
      <AmbientBackground />
      <Nav />
      <main className="relative z-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
