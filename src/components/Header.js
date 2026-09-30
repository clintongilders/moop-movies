import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/moop-movies.png";

const Header = () => (
  <header className="site-header">
    <Link to="/" className="site-brand" aria-label="MOOP Movies — Trending home">
      <img src={logo} alt="MOOP Movies" className="site-logo" width="156" height="104" />
    </Link>
  </header>
);

export default Header;
