// user's permission is in 'allowedEmails' collection
// note that I dropped: נשקים אישיים (עם שמות אנשי הצוות)-

// TODO reduce size of Issues table when empty (because of phone's keyboard)

// TODO use DB to persist
// TODO make sure that שצל always start at 0
// TODO make sure that users outside of the list are disabled, and have proper notification
// TODO react router (w/ grok)

// TODO AG Grid: invalid gridOptions property 'autoHeight'
// TODO separate DBs for prod and dev, with indication for dev
// TODO fix 'npm build' (and then fix firebase-hosting-merge.yml)
// TODO PWA
// TODO clean warnings

import "@mantine/core/styles.css";
import { Button, Container, MantineProvider, Stack } from "@mantine/core";
import { useState } from "react";
import { User } from "firebase/auth";
// import { getFirestore } from "firebase/firestore";
//
import Auth from "./components/Auth.tsx";
// import app from "./firebaseConfig";
import { Fill } from "./components/Fill.tsx";
import { Read } from "./components/Read.tsx";

const enum ActionType {
  MainMenu,
  FillReport,
  ReadReport,
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentAction, setCurrentAction] = useState(ActionType.MainMenu);

  // const db = getFirestore(app);

  // const saveData = async () => {
  //   try {
  //     console.log("saving");
  //     const docRef = await addDoc(collection(db, "checking"), {
  //       name: user?.displayName,
  //       mail: user?.email,
  //       zvika: "yes!",
  //     });
  //     console.log("Document written with ID: ", docRef.id, docRef);
  //   } catch (e) {
  //     console.error("Error adding document: ", e);
  //   }
  // };

  // useEffect(() => {
  //   const fetchData = async () => {
  //     const querySnapshot = await getDocs(collection(db, "checking"));
  //     console.log(querySnapshot.docs.map((doc) => doc.data()));
  //   };
  //
  //   fetchData();
  // }, [db]);

  //TODO display buttons according to permissions
  return (
    <MantineProvider>
      <Container size="sm" px="sm" pt="md">
        <Stack>
          <Auth user={user} setUser={setUser} />
          {currentAction === ActionType.MainMenu && user && (
            <>
              <Button onClick={() => setCurrentAction(ActionType.FillReport)}>
                הגש דוח 5 לטנק
              </Button>
              <Button
                onClick={() => setCurrentAction(ActionType.ReadReport)}
                color="green"
              >
                קרא דוח 5 פלוגתי
              </Button>
            </>
          )}
          {currentAction === ActionType.FillReport && user && (
            <Fill onFinish={() => setCurrentAction(ActionType.MainMenu)} />
          )}
          {currentAction === ActionType.ReadReport && user && (
            <Read onFinish={() => setCurrentAction(ActionType.MainMenu)} />
          )}
        </Stack>
      </Container>
    </MantineProvider>
  );
}

export default App;
