// user's permission is in 'allowedEmails' collection
// note that I dropped: נשקים אישיים (עם שמות אנשי הצוות)-

// TODO make sure that users outside of the list are disabled, and have proper notification
// TODO why loading is slow?
// TODO use DB to persist
// TODO phone's back completely exits
// TODO reduce size of Issues table when empty (because of phone's keyboard)
// TODO always show 'fixed'
// TODO disable column moving in Issues
// TODO חוסרים isn't a good name ; write explictly to write how many exists
// TODO no need for arrows in צ numbers, default value in other numbers
// TODO don't accept empty answers

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
