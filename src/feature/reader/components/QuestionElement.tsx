import {  QuestionElementType } from "../lib/paragraph";

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
} from "#ui/questionnaire"

export type QuestionElementProps = {
  element: QuestionElementType
};

export const QuestionElement = ({ element }: QuestionElementProps) => {
  const questionnaireItems = ([] as any).map((question: any, index: any) => ({
    choices: question.questions.map((q: any) => {
      return {
        description: q.question,
        value: q.answer,
      }
    }),
    name: `question-${index}`,
    required: true,
    title: question.label,
  }))

  return (
    <Questionnaire
      className="gap-1!"
      defaultItem="direction"
      items={questionnaireItems}
      shortcuts="letters"
    >
      {/*<QuestionnaireProgress />*/}
      {questionnaireItems.map((question: any) => (
        <QuestionnaireItem
          key={question.name}
          name={question.name}
          required={question.required}

        >
          <QuestionnaireTitle className="mb-1!">{question.title}</QuestionnaireTitle>
          {/*<QuestionnaireDescription>
            {question.description}
          </QuestionnaireDescription>*/}
          <QuestionnaireChoices>
            {question.choices.map((choice: any) => (
              <QuestionnaireChoice key={choice.value} value={choice.value}>
                {"description" in choice ? (
                  <span className="text-muted-foreground">
                    {choice.description}
                  </span>
                ) : null}
              </QuestionnaireChoice>
            ))}
          </QuestionnaireChoices>
          <QuestionnaireError />
        </QuestionnaireItem>
      ))}
      <QuestionnaireActions>
        <QuestionnairePrevious />
        <QuestionnaireSkip />
        <QuestionnaireNext>Next</QuestionnaireNext>
        <QuestionnaireSubmit>Save plan</QuestionnaireSubmit>
      </QuestionnaireActions>
    </Questionnaire>
  )
}
