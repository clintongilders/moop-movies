import React from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Trending from "./pages/Trending";
import Movies from "./pages/Movies";
import TV from "./pages/TV";
import Search from "./pages/Search";
import SingleMovie from "./pages/SingleMovie";
import Error from "./pages/Error";
import MyVerticallyCenteredModal from "./components/Modal";

const App = () => {
  const [modalShow, setModalShow] = React.useState(false);

  return (
    <>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Trending />} exact />
          <Route path="/movies" element={<Movies />} />
          <Route path="/tv" element={<TV />} />
          <Route path="/search" element={<Search />} />
          <Route path="*" element={<Error />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </>
  );
};
 
 
export default App;