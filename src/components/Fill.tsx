import { useState } from "react";
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
import { questionsData } from "./questions-data.js";
import { Issues } from "./Issues.tsx";
import { ReportPopup } from "./ReportPopup.tsx";

export function Fill({ onFinish }) {
  const [activeScreen, setActiveScreen] = useState(0);
  const [answers, setAnswers] = useState({});
  const [popupOpened, { open: openPopup, close: closePopup }] =
    useDisclosure(false);

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
            value={answers[question.text] || ""}
            description={question.description}
            onChange={(val) => handleAnswerChange(question.text, val)}
          />
        );
      case "boolean":
        return (
          <Checkbox
            value={answers[question.text] || ""}
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
            value={answers[question.topic]}
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
