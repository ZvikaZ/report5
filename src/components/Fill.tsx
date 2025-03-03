// TODO make tankId and שצל references generic (according to questions data from DB)

import { useState, useEffect } from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  NumberInput,
  Select,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
} from "firebase/firestore";
import {
  useNavigate,
  useParams,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";

import { questionsData } from "./questions-data.js";
import { Issues } from "./Issues.tsx";
import { ReportPopup } from "./ReportPopup.tsx";
import { db } from "../firebaseConfig.ts";

const saveData = async (key, value) => {
  try {
    console.log("saving", { key, value });
    const docRef = await addDoc(collection(db, key), value);
    console.log("Document written with ID: ", docRef.id, docRef);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};

async function getLatestTankStatusEntry(tankId) {
  const q = query(
    collection(db, "tankStatus"),
    where("tankId", "==", tankId),
    orderBy("timestamp", "desc"),
    limit(1),
  );

  const snapshot = await getDocs(q);
  const doc = snapshot.docs[0];
  return doc ? doc.data() : null;
}

const getDefaultValue = (question) => {
  const defaults = {
    text: "",
    "long-text": "",
    number: question.fixed ? "" : 0,
    boolean: false,
    select: "",
    issues: [],
  };
  return defaults[question.type];
};

const getQuestionKey = (question) =>
  question.text ?? question.topic ?? `question_${question.type}`;

const generateDefaultAnswers = (tankId = null) => {
  const defaultAnswers = {};
  questionsData.screens.forEach((screen) => {
    screen.questions.forEach((question) => {
      const key = getQuestionKey(question); // Now uses getQuestionKey
      defaultAnswers[key] = getDefaultValue(question);
    });
  });
  if (tankId) {
    defaultAnswers["צ. הטנק"] = tankId;
  }
  return defaultAnswers;
};

const filterAnswers = (answers) => {
  for (const key in answers) {
    if (key.includes("שצל")) {
      answers[key] = 0;
    } else if (Array.isArray(answers[key])) {
      answers[key] = answers[key].filter((item) => !item.fixed);
    }
  }
  return answers;
};

const Screen = ({
  screenIndex,
  answers,
  handleAnswerChange,
  user,
  onFinish,
}) => {
  const navigate = useNavigate();
  const [popupOpened, { open: openPopup, close: closePopup }] =
    useDisclosure(false);

  const renderInput = (question) => {
    const key = getQuestionKey(question);

    if (answers[key] === undefined) {
      handleAnswerChange(key, getDefaultValue(question));
    }

    switch (question.type) {
      case "text":
        return (
          <TextInput
            value={answers[key] || ""}
            description={question.description}
            onChange={(e) => handleAnswerChange(key, e.target.value)}
          />
        );
      case "long-text":
        return (
          <Textarea
            value={answers[key] || ""}
            autosize
            minRows={5}
            description={question.description}
            onChange={(e) => handleAnswerChange(key, e.target.value)}
          />
        );
      case "number":
        return (
          <NumberInput
            value={answers[key] ?? getDefaultValue(question)}
            description={question.description}
            hideControls={question.fixed}
            allowNegative={false}
            min={0}
            max={question.max}
            onChange={(val) => handleAnswerChange(key, val)}
            step={question.step}
            onFocus={(e) => {
              if (e.target.value === "0") {
                e.target.value = "";
              }
            }}
          />
        );
      case "boolean":
        return (
          <Checkbox
            checked={answers[key] || false}
            label={question.text}
            description={question.description}
            color={question.color}
            onChange={(e) => handleAnswerChange(key, e.target.checked)}
          />
        );
      case "issues":
        return (
          <Issues
            key={`issues-${question.topic}-${screenIndex}`}
            topic={question.topic}
            singleIssue={question.singleIssue}
            value={answers[key] || []}
            onChange={(value) => handleAnswerChange(key, value)}
          />
        );
      case "select":
        return (
          <Select
            value={answers[key] || ""}
            description={question.description}
            onChange={(value) => handleAnswerChange(key, value)}
            data={question.options}
          />
        );
      // case "radio":
      //   return (
      //     <Radio.Group
      //       value={answers[question.text] || ""}
      //       description={question.description}
      //       onChange={(value) => handleAnswerChange(question.text, value)}
      //     >
      //       {question.options.map((option, index) => (
      //         <Radio key={index} value={option} label={option} />
      //       ))}
      //     </Radio.Group>
      //   );
      default:
        console.error("Unknown question", question);
        return null;
    }
  };

  const onFinishClick = () => {
    saveData("tankStatus", {
      ...answers,
      tankId: answers["צ. הטנק"],
      timestamp: serverTimestamp(),
      user: user.email,
      displayName: user.displayName ?? "John Doe",
    });
    openPopup();
    onFinish();
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* Sticky Badge with Rounded Corners */}
      <Badge
        color="blue"
        size="xl"
        fullWidth
        styles={{
          root: {
            position: "sticky",
            top: 0, // Sticks to the top when scrolled past
            zIndex: 10, // Stays above content when sticky
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "16px", // Rounded corners for a "round shape"
            padding: "10px", // Consistent padding
          },
        }}
      >
        {`${screenIndex + 1}. ${questionsData.screens[screenIndex].screen}`}
      </Badge>

      <Card shadow="sm" padding="lg" style={{ marginTop: "20px" }}>
        {questionsData.screens[screenIndex].questions.map((question) => (
          <div key={getQuestionKey(question)} style={{ marginBottom: "20px" }}>
            {question.type !== "boolean" && (
              <Text size="md" weight={500} style={{ marginBottom: "10px" }}>
                {question.text}
              </Text>
            )}
            {renderInput(question)}
          </div>
        ))}
      </Card>

      <Group position="center" style={{ marginTop: "20px" }}>
        <Button
          onClick={() =>
            navigate(screenIndex > 0 ? `/fill/${screenIndex}` : "/fill/1")
          }
          disabled={screenIndex === 0}
        >
          הקודם
        </Button>
        {screenIndex < questionsData.screens.length - 1 ? (
          <Button
            onClick={() => navigate(`/fill/${screenIndex + 2}`)}
            disabled={!answers["צ. הטנק"]}
          >
            הבא
          </Button>
        ) : (
          // <Button onClick={onFinishClick}>סיים</Button>
          <>{/*  TODO return Button after ReportPopup will be removed*/}</>
        )}
        <ReportPopup
          opened={popupOpened}
          onClose={closePopup}
          answers={answers}
          onFinishClick={onFinishClick}
          showButton={screenIndex === questionsData.screens.length - 1}
        />
      </Group>
    </div>
  );
};

export function Fill({ user, onFinish }) {
  const { screenId } = useParams();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState(generateDefaultAnswers());

  async function getUsersPrevTank(user) {
    try {
      const q = query(
        collection(db, "tankStatus"),
        where("user", "==", user.email),
        orderBy("timestamp", "desc"),
        limit(1),
      );
      const snapshot = await getDocs(q);
      const doc = snapshot.docs[0];
      return doc ? doc.data().tankId : null;
    } catch (e) {
      console.error("Error getting previous tank:", e);
      return null;
    }
  }

  useEffect(() => {
    const initializeAnswers = async () => {
      const prevTankId = await getUsersPrevTank(user);
      if (prevTankId) {
        setAnswers((prev) => ({
          ...prev,
          "צ. הטנק": prevTankId,
        }));
      }
    };
    initializeAnswers();
  }, [user]);

  useEffect(() => {
    const fetchLatestStatus = async () => {
      const tankId = answers["צ. הטנק"];
      if (tankId) {
        const latestStatus = filterAnswers(
          await getLatestTankStatusEntry(tankId),
        );
        if (latestStatus) {
          setAnswers((prev) => ({
            ...prev,
            ...latestStatus,
            "צ. הטנק": tankId,
          }));
        } else {
          setAnswers(generateDefaultAnswers(tankId));
        }
      }
    };
    fetchLatestStatus();
  }, [answers["צ. הטנק"]]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // Convert screenId to number and adjust for 1-based indexing
  const currentScreenIndex = screenId ? parseInt(screenId) - 1 : 0;

  return (
    <Routes>
      {questionsData.screens.map((_, index) => (
        <Route
          key={index}
          path={`${index + 1}`}
          element={
            <Screen
              screenIndex={index}
              answers={answers}
              handleAnswerChange={handleAnswerChange}
              user={user}
              onFinish={onFinish}
            />
          }
        />
      ))}
      <Route path="" element={<Navigate to="/fill/1" replace />} />
    </Routes>
  );
}
