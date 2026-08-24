use std::path::Path;

use document_parser::{ChapterContent, Document};

use crate::domain::{Book, BookMeta, Chapter};

pub struct DocumentMapper;

impl DocumentMapper {
    pub fn to_book(
        document: Document,
        path: &Path,
        size: i32,
        last_modified: i32,
        created_at: i32,
    ) -> Book {
        let chapters = document
            .content
            .chapters
            .into_iter()
            .map(|chapter| Chapter {
                title: chapter.title,
                html: match chapter.content {
                    ChapterContent::Html(html) => html,
                    ChapterContent::Text(text) => text,
                },
            })
            .collect();

        Book {
            id: document.metadata.id,
            meta: BookMeta {
                title: document.metadata.title,
                description: document.metadata.description,
                author: document.metadata.author,
                language: document.metadata.language,
                cover_path: None,
                path: path.to_string_lossy().into_owned(),
                size,
                last_read_at: 0,
                last_modified,
                created_at,
                genres: None,
            },
            chapters: Some(chapters),
        }
    }
}
