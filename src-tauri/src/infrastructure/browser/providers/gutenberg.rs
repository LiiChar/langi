use std::{fmt::format, path::Path, sync::Arc};

use async_trait::async_trait;
use reqwest::{Client, Response};
use serde::{Deserialize, Serialize};

use crate::{
    domain::{
        Book, BookMeta, book::{
            DownloadEvent,
            DownloadEventType,
        },
    }, infrastructure::browser::{
        download::BookDownloader, error::BookError, provider::{
            BookCapabilities, BrowserProvider, DownloadEventHandler,
        },
    },
};

const API_URL: &str = "https://gutendex.com/books/";

pub struct GutenbergProvider {
    client: Client,
    downloader: BookDownloader,
}

impl GutenbergProvider {
    pub fn new(client: Client) -> Self {
        let downloader = BookDownloader::new(
            client.clone()
        );

        Self {
            client,
            downloader,
        }
    }

    async fn send_request(
        &self,
        response: Response,
    ) -> Result<Response, BookError> {
        let status = response.status();

        if !status.is_success() {
            let message = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown HTTP error".to_string());

            return Err(BookError::Http {
                status: status.as_u16(),
                message,
            });
        }

        Ok(response)
    }

    async fn get_json<T>(
        &self,
        response: Response,
    ) -> Result<T, BookError>
    where
        T: serde::de::DeserializeOwned,
    {
        let response = self.send_request(response).await?;

        response
            .json::<T>()
            .await
            .map_err(|error| {
                BookError::InvalidResponse(error.to_string())
            })
    }

    async fn get_gutenberg_book(
        &self,
        id: &str,
    ) -> Result<GutenbergBook, BookError> {
        let response = self
            .client
            .get(format!("{API_URL}{id}"))
            .send()
            .await
            .map_err(|error| BookError::Network(error.to_string()))?;

        self.get_json(response).await
    }

    fn select_download_url(
        book: &GutenbergBook,
        format: &str,
    ) -> Option<String> {
        // Сначала пробуем точное совпадение:
        //
        // "epub"
        // "application/epub+zip"
        // "txt"
        // "text/plain"
        if let Some(url) = book.formats.get(format) {
            return Some(url.clone());
        }

        let format = format.to_ascii_lowercase();

        book.formats
            .iter()
            .find(|(mime, _)| {
                let mime = mime.to_ascii_lowercase();

                match format.as_str() {
                    "epub" => {
                        mime.starts_with("application/epub")
                    }

                    "txt" => {
                        mime.starts_with("text/plain")
                    }

                    "html" => {
                        mime.starts_with("text/html")
                    }

                    _ => false,
                }
            })
            .map(|(_, url)| url.clone())
    }

    fn extension(format: &str) -> &'static str {
        match format.to_ascii_lowercase().as_str() {
            "epub" | "application/epub+zip" => "epub",
            "txt" | "text/plain" => "txt",
            "html" | "text/html" => "html",
            _ => "bin",
        }
    }

    fn sanitize_file_name(value: &str) -> String {
        let value = value
            .chars()
            .map(|character| match character {
                '/' | '\\' | ':' | '*' | '?' |
                '"' | '<' | '>' | '|' => '_',
                _ => character,
            })
            .collect::<String>();

        let value = value.trim();

        if value.is_empty() {
            "book".to_string()
        } else {
            value.to_string()
        }
    }

    fn file_name(
        book: &GutenbergBook,
        format: &str,
    ) -> String {
        let title = Self::sanitize_file_name(&book.title);
        let extension = Self::extension(format);

        format!("{} - {}.{}", book.id, title, extension)
    }

    fn build_book_path(
        book: &GutenbergBook,
        format: &str,
    ) -> String {
        Self::file_name(book, format)
    }

    fn emit_event(
        handler: &DownloadEventHandler,
        event: DownloadEvent,
    ) {
        handler(event);
    }

    fn now() -> i32 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|duration| duration.as_secs() as i32)
            .unwrap_or_default()
    }

    fn map_book(
        book: GutenbergBook,
    ) -> Book {
        book.into()
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct GutenbergAuthor {
    pub name: String,

    pub birth_year: Option<i32>,

    pub death_year: Option<i32>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct GutenbergBook {
    pub id: u32,

    pub title: String,

    #[serde(default)]
    pub authors: Vec<GutenbergAuthor>,

    #[serde(default)]
    pub summaries: Vec<String>,

    #[serde(default)]
    pub editors: Vec<GutenbergAuthor>,

    #[serde(default)]
    pub translators: Vec<GutenbergAuthor>,

    #[serde(default)]
    pub subjects: Vec<String>,

    #[serde(default)]
    pub bookshelves: Vec<String>,

    #[serde(default)]
    pub languages: Vec<String>,

    pub copyright: Option<bool>,

    pub media_type: String,

    #[serde(default)]
    pub formats: std::collections::HashMap<String, String>,

    pub download_count: u64,
}

impl From<GutenbergBook> for Book {
    fn from(book: GutenbergBook) -> Self {
        let author = book
            .authors
            .first()
            .map(|author| author.name.clone());

        let description = book
            .summaries
            .first()
            .cloned();

        let language = book
            .languages
            .first()
            .cloned();

        let mut genres = Vec::new();

        genres.extend(book.subjects.iter().cloned());
        genres.extend(book.bookshelves.iter().cloned());

        Book {
            id: book.id.to_string(),

            meta: BookMeta {
                title: book.title,

                description,

                author,

                language,

                cover_path: book
                    .formats
                    .get("image/jpeg")
                    .cloned(),

                path: String::new(),

                size: 0,

                last_read_at: 0,

                last_modified: 0,

                created_at: 0,

                genres: if genres.is_empty() {
                    None
                } else {
                    Some(genres)
                },

                source: Some(
                    "gutenberg".to_string()
                ),
            },

            chapters: None,
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct GutenbergBooksResponse {
    pub count: u32,

    pub next: Option<String>,

    pub previous: Option<String>,

    pub results: Vec<GutenbergBook>,
}

#[async_trait]
impl BrowserProvider for GutenbergProvider {
    fn id(&self) -> &'static str {
        "gutenberg"
    }

    fn capabilities(&self) -> BookCapabilities {
        BookCapabilities {
            search: true,
            metadata: true,
            download: true,
            epub: true,
            pdf: false,
            txt: true,
            borrow: false,
        }
    }

    async fn search(
        &self,
        query: &str,
    ) -> Result<Vec<Book>, BookError> {
        let response = self
            .client
            .get(API_URL)
            .query(&[("search", query)])
            .send()
            .await
            .map_err(|error| {
                BookError::Network(error.to_string())
            })?;

        let body: GutenbergBooksResponse =
            self.get_json(response).await?;

        Ok(body
            .results
            .into_iter()
            .map(Self::map_book)
            .collect())
    }

    async fn get_books(
        &self,
    ) -> Result<Vec<Book>, BookError> {
        let response = self
            .client
            .get(API_URL)
            .send()
            .await
            .map_err(|error| {
                BookError::Network(error.to_string())
            })?;

        let body: GutenbergBooksResponse =
            self.get_json(response).await?;

        Ok(body
            .results
            .into_iter()
            .map(Self::map_book)
            .collect())
    }

    async fn get_book(
        &self,
        id: &str,
    ) -> Result<Book, BookError> {
        let book = self
            .get_gutenberg_book(id)
            .await?;

        Ok(Self::map_book(book))
    }

    async fn download(
        &self,
        id: &str,
        format: &str,
        on_event: DownloadEventHandler,
    ) -> Result<Book, BookError> {
        let book = self
            .get_gutenberg_book(id)
            .await?;

        let download_url =
            Self::select_download_url(&book, format)
                .ok_or_else(|| {
                    BookError::Provider(format!(
                        "Format '{format}' is not available for book '{}'",
                        book.id
                    ))
                })?;

        let file_name =
            Self::file_name(&book, format);

        let path = format!("E:/download/browser/{}", file_name.clone());

        let download_id = format!(
            "gutenberg:{}:{}",
            book.id,
            format
        );

        self.downloader
            .download(
                download_id,
                &download_url.to_string(),
                &path,
                on_event,
            )
            .await?;

        let mut result: Book = book.into();

        result.meta.path =
            path.clone();

        result.meta.size =
            tokio::fs::metadata(&path)
                .await
                .map(|metadata| {
                    metadata
                        .len()
                        .min(i32::MAX as u64) as i32
                })
                .unwrap_or_default();

        Ok(result)
    }
}
