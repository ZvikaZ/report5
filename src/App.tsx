// user's permission is in 'allowedEmails' collection
// note that I dropped: נשקים אישיים (עם שמות אנשי הצוות)-

// TODO reduce size of Issues table when empty (because of phone's keyboard)
// TODO separate DBs for prod and dev, with indication for dev
// TODO remove the 'undefined' entry from answers in DB
// TODO when finished filling, and clicking back - return to start of fill

// TODO fix 'npm build' (and then fix firebase-hosting-merge.yml)
// TODO PWA
// TODO clean warnings
// TODO replace favicon

import "@mantine/core/styles.css";
import { Button, Container, MantineProvider, Stack } from "@mantine/core";
import { useState } from "react";
import { User } from "firebase/auth";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate,
} from "react-router-dom";

import Auth from "./components/Auth.tsx";
import { Fill } from "./components/Fill.tsx";
import { Read } from "./components/Read.tsx";

const MainMenu = ({ user }: { user: User | null }) => {
  if (!user) return <Navigate to="/" />;

  return (
    <Stack>
      <Button component={Link} to="/fill/1">
        הגש דוח 5 לטנק
      </Button>
      <Button component={Link} to="/read" color="green">
        קרא דוח 5 פלוגתי
      </Button>
    </Stack>
  );
};

const ProtectedRoute = ({
  user,
  children,
}: {
  user: User | null;
  children: JSX.Element;
}) => {
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const AppContent = ({
  user,
  setUser,
}: {
  user: User | null;
  setUser: (user: User | null) => void;
}) => {
  const navigate = useNavigate(); // Now inside BrowserRouter context

  return (
    <MantineProvider>
      <Container size="sm" px="sm" pt="md">
        <Stack>
          <Auth user={user} setUser={setUser} />
          <Routes>
            <Route path="/" element={<MainMenu user={user} />} />
            <Route
              path="/fill/*"
              element={
                <ProtectedRoute user={user}>
                  <Fill user={user!} onFinish={() => navigate("/")} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/read"
              element={
                <ProtectedRoute user={user}>
                  <Read onFinish={() => navigate("/")} />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={
                <Stack align="center" py="xl">
                  <div>404 - דף לא נמצא</div>
                  <Button component={Link} to="/">
                    חזור לדף הראשי
                  </Button>
                </Stack>
              }
            />
          </Routes>
        </Stack>
      </Container>
    </MantineProvider>
  );
};

function App() {
  const [user, setUser] = useState<User | null>(null);

  return (
    <BrowserRouter>
      <AppContent user={user} setUser={setUser} />
    </BrowserRouter>
  );
}

export default App;
