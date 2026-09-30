import React from "react";
import { AuthProvider } from "./components/AuthContext";
import Account from "./pages/Account";
import Header from "./components/Header";
import Footer from "./components/Footer";
import BackToTop from "./components/BackToTop";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Trending from "./pages/Trending";
import Movies from "./pages/Movies";
import TV from "./pages/TV";
import SingleMovie from "./pages/SingleMovie";
import Error from "./pages/Error";

const App = () => {

  return (
    <>
      <BrowserRouter>
        <AuthProvider>
        <Header />
        <Routes>
          <Route path="/" element={<Trending />} exact />
          <Route path="/account" element={<Account />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/tv" element={<TV />} />
          <Route path="/movie/:id" element={<SingleMovie mediaType="movie" />} />
          <Route path="/tv/:id" element={<SingleMovie mediaType="tv" />} />
          {/* Search is temporarily hidden; preserve old links with a redirect. */}
          <Route path="/search" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Error />} />
        </Routes>
        <Footer />
        <BackToTop />
      </AuthProvider>
      </BrowserRouter>
    </>
  );
};
 
 
export default App;