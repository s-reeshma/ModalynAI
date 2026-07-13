import {
  Routes,
  Route
} from "react-router-dom";

import Login from "./pages/login";
import Signup from "./pages/signup";
import Dashboard from "./pages/dashboard";
import Profile from "./pages/Profile";
import Onboarding from"./pages/Onboarding";
import Learn from "./pages/Learn";
import Progress from "./pages/Progress";
import Topics from "./pages/Topics";
import TopicDetails from "./pages/TopicDetails";

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
        path="/progress"
        element={<Progress />}
      />
      <Route
        path="/onboarding"
        element={<Onboarding  />}
      />
      <Route
        path="/learn/:topic"
        element={<Learn />}
      />
      <Route path="/learn"
       element={<Learn />} />
      <Route
        path="/topics"
        element={<Topics />}
      />
      <Route
        path="/topics/:topicId"
        element={<TopicDetails />}
      />
    </Routes>
  );
}

export default App;