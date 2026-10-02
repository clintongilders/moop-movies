import React from "react";
import Icon from "./Icon";
import { NavLink } from "react-router-dom";
const links = [
  ["Account", "/account"],
  ["Trending", "/"],
  ["Movies", "/movies"],
  ["TV Series", "/tv"],
];
export default function Footer() {
  return (
    <nav className="container-fluid" aria-label="Main navigation">
      <div className="row">
        <div className="col-12 text-center bg-dark footer">
          {links.map(([name, link]) => (
            <NavLink
              key={link}
              to={link}
              className="col-sm-2 col-md-2 btn btn-dark"
            >
              <Icon name={name} />
              <br />
              <span className="d-block pt-1 fs-6">{name}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
