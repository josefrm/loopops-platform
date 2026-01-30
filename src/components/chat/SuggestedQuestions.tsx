import React from 'react';
import { Button } from '@/components/ui/button';

interface SuggestedQuestionsProps {
  show: boolean;
  questions: string[];
  onQuestionSelect: (question: string) => void;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  show,
  questions,
  onQuestionSelect,
}) => {
  if (!show) return null;

  return (
    <div className="relative flex-shrink-0" data-testid="suggested-questions">
      {/* <div className="text-sm text-slate-600 mb-2">💡 Try asking:</div> */}
      <div className="flex flex-wrap gap-loop-2 text-neutral-grayscale-50 border-none" data-testid="suggested-questions-list">
        {questions.slice(0, 4).map((question) => (
          <Button
            key={question}
            variant="outline"
            size="sm"
            onClick={() => onQuestionSelect(question)}
            className="text-md rounded-sm text-neutral-grayscale-50 border-none h-loop-8"
            data-testid={`suggested-question-${questions.indexOf(question)}`}
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
};
