import React from "react";
export default class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error("MOOP render failed", error.name);
  }
  render() {
    return this.state.failed ? (
      <main className="container py-5 my-5" role="alert">
        <h1>Unable to display this page</h1>
        <button
          className="btn btn-light"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
