import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "#ui/popover";
import { ParagraphElementType } from "../lib/paragraph";

export type ParagraphElementProps = {
  element: ParagraphElementType
};

export const ParagraphElement = ({ element }: ParagraphElementProps) => {
  const words = element.text.split(' ');

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
