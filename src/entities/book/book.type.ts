
export type Book = {
	id: string;
	meta: BookMeta;
	chapters: Chapter[];
}

export type BookMeta = {
	title: string;
	author: string | null;
	language: string  | null;
	cover_path: string  | null;
	path: string;
	size: number;
	last_read_at: number;
	last_modified: number;
	created_at: number;
	chars_read: number  | null;
	progress_read: number  | null;
	genres: string[]  | null;
	description: string  | null;
  count_chapters: number;
  current_chapter: number;
};

export type Chapter = {
  title: string  | null;
	html: string;
}


export type BookWithoutChapters = Omit<Book, 'chapters'>;
