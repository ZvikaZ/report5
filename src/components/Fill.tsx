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

// Define default values once
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

// Function to generate default answers object
const generateDefaultAnswers = (tankId = null) => {
  const defaultAnswers = {};
  questionsData.screens.forEach((screen) => {
    screen.questions.forEach((question) => {
      defaultAnswers[question.text] = getDefaultValue(question);
    });
  });
  if (tankId) {
    defaultAnswers["צ. הטנק"] = tankId;
  }
  return defaultAnswers;
};

export function Fill({ user, onFinish }) {
  const [activeScreen, setActiveScreen] = useState(0);
  const [answers, setAnswers] = useState(generateDefaultAnswers());
  const [popupOpened, { open: openPopup, close: closePopup }] =
    useDisclosure(false);

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

  // Initialize answers with previous tank
  useEffect(() => {
    const initializeAnswers = async () => {
      // Get previous tank ID
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

  // Update answers when tankId changes
  useEffect(() => {
    const fetchLatestStatus = async () => {
      const tankId = answers["צ. הטנק"];
      if (tankId) {
        const latestStatus = await getLatestTankStatusEntry(tankId);
        if (latestStatus) {
          setAnswers((prev) => ({
            ...prev,
            ...latestStatus,
            "צ. הטנק": tankId, // Ensure tankId remains
          }));
        } else {
          // Reset all fields to default values if no status found
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

  const nextScreen = () => {
    setActiveScreen((current) =>
      current < questionsData.screens.length - 1 ? current + 1 : current,
    );
  };

  const prevScreen = () => {
    setActiveScreen((current) => (current > 0 ? current - 1 : current));
  };

  const renderInput = (question) => {
    // Set default value if not already set
    if (answers[question.text] === undefined) {
      setAnswers((prev) => ({
        ...prev,
        [question.text]: getDefaultValue(question),
      }));
    }

    switch (question.type) {
      case "text":
        return (
          <TextInput
            value={answers[question.text] || ""}
            description={question.description}
            onChange={(e) => handleAnswerChange(question.text, e.target.value)}
          />
        );
      case "long-text":
        return (
          <Textarea
            value={answers[question.text] || ""}
            autosize
            minRows={5}
            description={question.description}
            onChange={(e) => handleAnswerChange(question.text, e.target.value)}
          />
        );
      case "number":
        return (
          <NumberInput
            value={answers[question.text] ?? getDefaultValue(question)}
            description={question.description}
            hideControls={question.fixed}
            allowNegative={false}
            min={0}
            onChange={(val) => handleAnswerChange(question.text, val)}
          />
        );
      case "boolean":
        return (
          <Checkbox
            checked={answers[question.text] || false}
            label={question.text}
            description={question.description}
            color={question.color}
            onChange={(e) =>
              handleAnswerChange(question.text, e.target.checked)
            }
          />
        );
      case "issues":
        return (
          <Issues
            key={`issues-${question.topic}-${activeScreen}`}
            topic={question.topic}
            singleIssue={question.singleIssue}
            value={answers[question.topic] || []}
            onChange={(value) => handleAnswerChange(question.topic, value)}
          />
        );
      case "select":
        return (
          <Select
            value={answers[question.text] || ""}
            description={question.description}
            onChange={(value) => handleAnswerChange(question.text, value)}
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
    openPopup();
    onFinish();
    saveData("tankStatus", {
      ...answers,
      tankId: answers["צ. הטנק"],
      timestamp: serverTimestamp(),
      //TODO
      user: user.email,
      displayName: user.displayName ?? "John Doe",
    });
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
        {`${activeScreen + 1}. ${questionsData.screens[activeScreen].screen}`}
      </Badge>

      <Card shadow="sm" padding="lg" style={{ marginTop: "20px" }}>
        {questionsData.screens[activeScreen].questions.map((question) => (
          <div key={question.text} style={{ marginBottom: "20px" }}>
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
        <Button onClick={prevScreen} disabled={activeScreen === 0}>
          הקודם
        </Button>
        {activeScreen < questionsData.screens.length - 1 ? (
          <Button
            onClick={nextScreen}
            disabled={activeScreen === questionsData.screens.length - 1}
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
          showButton={activeScreen === questionsData.screens.length - 1}
        />{" "}
      </Group>
    </div>
  );
}
