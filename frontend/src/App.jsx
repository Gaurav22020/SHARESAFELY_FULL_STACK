import React from "react";
import UploadForm from "./components/UploadForm";
import "./styles.css";

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>ShareSafely</h1>
        <p>Upload files and get time-limited secure links</p>
      </header>
      <main className="main">
        <UploadForm />
      </main>
      <footer className="footer">
        <small>
          Built with Azure Blob Storage • Keep secrets in Key Vault
        </small>
      </footer>
    </div>
  );
}
