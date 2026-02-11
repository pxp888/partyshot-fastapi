import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import Topbar from "./components/Topbar";
import WelcomePage from "./components/WelcomePage";

function Home() {
  return <h2>Welcome to the Home page</h2>;
}

function About() {
  return <h2>About this app</h2>;
}

function NotFound() {
  return <h2>Page not found (client‑side)</h2>;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  return (
    <Router>
      {/* <nav style={{ marginBottom: "1rem" }}>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
      </nav>*/}
      <Topbar currentUser={currentUser} setCurrentUser={setCurrentUser} />

      <Routes>
        {/* <Route path="/" element={<Home />} />*/}
        <Route path="/" element={<WelcomePage />} />
        <Route path="/about" element={<About />} />
        {/* 404 for unmatched paths */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
