
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireError,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "#ui/questionnaire";
import { QuestionElementType } from "../../lib/paragraph";

export type QuestionElementProps = {
  element: QuestionElementType;
};

export const QuestionElement = ({
  element,
}: QuestionElementProps) => {
  const questionnaireItems = element.questions.map(
    (question, index) => ({
      choices: [
        {
          description: question.question,
          value: question.answer,
        },
      ],
      name: `question-${index}`,
      required: true,
      title: element.label,
    }),
  );

  return (
    <Questionnaire
      className="gap-1!"
      defaultItem={questionnaireItems[0]?.name}
      items={questionnaireItems}
      shortcuts="letters"
    >
      {questionnaireItems.map((question) => (
        <QuestionnaireItem
          key={question.name}
          name={question.name}
          required={question.required}
        >
          <QuestionnaireTitle className="mb-1!">
            {question.title}
          </QuestionnaireTitle>

          <QuestionnaireChoices>
            {question.choices.map((choice) => (
              <QuestionnaireChoice
                key={choice.value}
                value={choice.value}
              >
                <span className="text-muted-foreground">
                  {choice.description}
                </span>
              </QuestionnaireChoice>
            ))}
          </QuestionnaireChoices>

          <QuestionnaireError />
        </QuestionnaireItem>
      ))}

      <QuestionnaireActions>
        <QuestionnairePrevious />
        <QuestionnaireSkip />
        <QuestionnaireNext>Далее</QuestionnaireNext>
        <QuestionnaireSubmit>Ответить</QuestionnaireSubmit>
      </QuestionnaireActions>
    </Questionnaire>
  );
};
