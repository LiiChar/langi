import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useChapter } from "../hooks/useChapter";
import { useReader } from "../hooks/useReader";
import { useLayoutStore } from "@/feature/layout/store/LayoutStore";
import { ReaderFooter } from "../layout/Footer";
import { useEffect, useRef } from "react";
import { ContentRenderer } from "../components/ContentRenderer";

export const ReaderPage = () => {
  const setFooter = useLayoutStore((store) => store.setFooter);
  const setPrevFooter = useLayoutStore((store) => store.setPrevFooter);
  const routeApi = getRouteApi('/book/$bookId/read/')
  const navigate = useNavigate();

  const data = routeApi.useLoaderData()

  if (data.status == 'error') {
    navigate({to: "/"});
    return null;
  }

  const book = data.data;

  if (book.chapters == null) {
    navigate({to: "/"});
    return null;
  }

  const { currentChapter, currentChapterIndex, isLoading, error, handleNextChapter } = useReader(book.chapters);
  const { paragraph, nextParagraph, currentParagraphs } = useChapter(currentChapter);
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setFooter(<ReaderFooter onNext={() => {
      nextParagraph();
      if (listRef.current) {
        let listParent = listRef.current.parentElement;
        if (listParent) {
          listParent.scrollTo({
            top: listParent.scrollHeight,
            behavior: "smooth",
          })
        }
      }
    }} />)

    return () => setPrevFooter()
  }, [])

  useEffect(() => {
    if (listRef.current) {
      let listParent = listRef.current;
      if (listParent) {
        listParent.scrollTo({
          top: listParent.scrollHeight,
          behavior: "smooth",
        })
      }
    }
  }, [paragraph]);

  return (
    <div className="flex gap-1 h-full">

      <div className="p-4 flex h-full justify-center items-center window" ref={listRef}>
        <div className="w-[90%] h-full">
          <div className="flex flex-col gap-1">
            {currentParagraphs.map((p, index) => (
              <ContentRenderer element={ p } key={ index } />
            ))}
          </div>
        </div>
      </div>
      {/*<div className="window">
          dfasdas
      </div>*/}
    </div>
  );
}
