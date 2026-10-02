import { useEffect } from "react";
import { useLocation } from "react-router-dom";
export default function RouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = `${{ "/": "Trending", "/movies": "Movies", "/tv": "TV", "/account": "Account" }[pathname] || "Title details"} · MOOP`;
  }, [pathname]);
  return null;
}
