import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import Topbar from "./components/Topbar";
import WelcomePage from "./components/WelcomePage";
import Userview from "./components/Userview";
import Albumview from "./components/Albumview";
import Adminpage from "./components/Adminpage";
import { WebSocketProvider } from "./components/WebSocketContext";

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
    <WebSocketProvider>
      <Router>
        <Topbar currentUser={currentUser} setCurrentUser={setCurrentUser} />

        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/user/:username"
            element={<Userview currentUser={currentUser} />}
          />
          <Route
            path="/album/:albumcode"
            element={<Albumview currentUser={currentUser} />}
          />
          <Route
            path="/admin"
            element={<Adminpage currentUser={currentUser} />}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </WebSocketProvider>
  );
}
