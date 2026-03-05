import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import { WebSocketProvider } from "./components/WebSocketContext";
import { MessageBoxProvider } from "./components/MessageBoxContext";

import Topbar from "./components/Topbar";
import WelcomePage from "./components/WelcomePage";
import Userview from "./components/userview/Userview";
import Albumview from "./components/albumview/Albumview";
import Adminpage from "./components/Adminpage";
import Contactpage from "./components/Contactpage";
import Plans from "./components/Plans";
import AccountPage from "./components/AccountPage";
import Policypage from "./components/Policypage";
import Termspage from "./components/Termspage";
// import CookieConsent from "./components/CookieConsent";

function NotFound() {
  return <h2>Page not found (client‑side)</h2>;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  return (
    <MessageBoxProvider>
      <WebSocketProvider>
        <Router>
          {/* <CookieConsent />*/}
          <Topbar currentUser={currentUser} setCurrentUser={setCurrentUser} />

          <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/privacy" element={<Policypage />} />
            <Route path="/terms" element={<Termspage />} />

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
    </MessageBoxProvider>
  );
}
