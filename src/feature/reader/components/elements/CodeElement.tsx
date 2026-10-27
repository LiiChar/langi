import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "#ui/popover";
import { CodeElementType } from "../../lib/paragraph";

export type ParagraphElementProps = {
  element: CodeElementType
};

export const CodeElement = ({ element }: ParagraphElementProps) => {
  const words = element.code.split(' ');

  return (
    <div className="flex gap-1 flex-wrap">
      {words.map((word, index) => (
        <Popover key={index}>
          <PopoverTrigger openOnHover render={<span className="border-b border-dashed border-foreground">{word}</span>} />
          <PopoverContent>
            <PopoverHeader>
              <PopoverTitle>Title</PopoverTitle>
              <PopoverDescription>Description text here.</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  );
};
