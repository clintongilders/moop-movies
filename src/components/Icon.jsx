import React from "react";
const paths = {
  Account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21v-2a8 8 0 0 1 16 0v2",
  Trending: "m3 17 6-6 4 4 8-10M15 5h6v6",
  Movies: "M3 3h18v18H3zM3 8h18M3 16h18M7 3v18M17 3v18",
  "TV Series": "M3 7h18v14H3zM8 2l4 5 4-5",
};
export default function Icon({ name }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
