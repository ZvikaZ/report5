// user's permission is in 'allowedEmails' collection
// note that I dropped: נשקים אישיים (עם שמות אנשי הצוות)-

// TODO report - enlarge screen space
// TODO report - missing צלמים and שצל
// TODO report - add deficit report
// TODO report - add columns for Mizrahi, such as סיווג and  סטטוס חוליה (verify the last one)
// TODO report - https://www.ag-grid.com/react-data-grid/filter-quick/
// TODO report - dont red color all the cell
// TODO report - maybe use context menu for interesting things (also, add missing default actions)

// TODO add תאום כוונות and טפש/ח (when and who)
// TODO reduce size of Issues table when empty (because of phone's keyboard)
// TODO separate DBs for prod and dev, with indication for dev

// TODO fix 'npm build' (and then fix firebase-hosting-merge.yml)
// TODO PWA
// TODO clean warnings
// TODO replace favicon

// TODO auto report mails
// TODO return from Report to Main

// TODO upload questions to DB
// TODO report - make it more generic
// TODO km and hours shouldnt decrease, and Z shouldn't change, unless warning issued
// TODO remove the 'undefined' entry from answers in DB
// TODO when finished filling, and clicking back - return to start of fill

// TODO report - fix Set filter

import "@mantine/core/styles.css";
import { Button, Container, MantineProvider, Stack, Box } from "@mantine/core";
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
import { ShowReport } from "./components/ShowReport.tsx";

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
      <Container size="xl" px="sm" pt="md">
        <Stack>
          <Box maw={768}>
            <Auth user={user} setUser={setUser} />
          </Box>
          <Routes>
            <Route
              path="/"
              element={
                <Box maw={768}>
                  <MainMenu user={user} />
                </Box>
              }
            />
            <Route
              path="/fill/*"
              element={
                <ProtectedRoute user={user}>
                  <Box maw={768}>
                    <Fill user={user!} onFinish={() => navigate("/")} />
                  </Box>
                </ProtectedRoute>
              }
            />
            <Route
              path="/read"
              element={
                <ProtectedRoute user={user}>
                  <ShowReport onFinish={() => navigate("/")} />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={
                <Box maw={768}>
                  <Stack align="center" py="xl">
                    <div>404 - דף לא נמצא</div>
                    <Button component={Link} to="/">
                      חזור לדף הראשי
                    </Button>
                  </Stack>
                </Box>
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
