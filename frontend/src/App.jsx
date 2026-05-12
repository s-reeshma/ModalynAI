import {
  Routes,
  Route
} from "react-router-dom";

import Login from "./pages/login";
import Signup from "./pages/signup";
import Dashboard from "./pages/dashboard";
import Profile from "./pages/Profile";
import Onboarding from"./pages/Onboarding";

function App() {

  return (

    <Routes>

      <Route
        path="/"
        element={<Login />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/signup"
        element={<Signup />}
      />

      <Route
        path="/dashboard"
        element={<Dashboard />}
      />
      <Route
        path="/profile"
        element={<Profile />}
      />
      <Route
        path="/onboarding"
        element={<Onboarding  />}
      />

    </Routes>
  );
}

export default App;