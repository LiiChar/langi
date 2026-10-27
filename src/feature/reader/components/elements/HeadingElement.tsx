import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "#ui/popover";
import { HeadingElementType } from "../../lib/paragraph";

export type ParagraphElementProps = {
  element: HeadingElementType
};

export const HeadingElement = ({ element }: ParagraphElementProps) => {
  const parts = element.text.split(/(\s+)/);

  return (
    <div className="flex flex-wrap">
      {parts.map((part, index) => /\s+/.test(part) ? (
        <span key={index}>{part}</span>
      ) : (
        <Popover key={index}>
          <PopoverTrigger openOnHover render={<span className="border-b border-dashed border-foreground">{part}</span>} />
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
