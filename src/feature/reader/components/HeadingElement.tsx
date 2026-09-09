import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "#ui/popover";
import { HeadingElementType, ParagraphElementType } from "../lib/paragraph";

export type ParagraphElementProps = {
  element: HeadingElementType
};

export const HeadingElement = ({ element }: ParagraphElementProps) => {
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
