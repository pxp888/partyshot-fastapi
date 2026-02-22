import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import Topbar from "./components/Topbar";
import WelcomePage from "./components/WelcomePage";
import Userview from "./components/Userview";
import Albumview from "./components/Albumview";
import Adminpage from "./components/Adminpage";
import Contactpage from "./components/Contactpage";
import { WebSocketProvider } from "./components/WebSocketContext";

import AccountPage from "./components/AccountPage";
import Howitworks from "./components/Howitworks";

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
          <Route path="/" element={<Howitworks />} />
          <Route path="/welcome" element={<WelcomePage />} />
          {/* <Route path="/about" element={<About />} /> */}
          <Route
            path="/user/:username"
            element={<Userview currentUser={currentUser} />}
          />
          <Route
            path="/album/:albumcode"
            element={<Albumview currentUser={currentUser} />}
          />
          <Route path="/contact" element={<Contactpage />} />
          <Route
            path="/admin"
            element={<Adminpage currentUser={currentUser} />}
          />
          <Route
            path="/account"
            element={
              <AccountPage
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
              />
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </WebSocketProvider>
  );
}
