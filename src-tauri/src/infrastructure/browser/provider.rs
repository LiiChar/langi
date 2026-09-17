use std::sync::Arc;

use async_trait::async_trait;

use crate::{
    domain::{
        book::DownloadEvent,
        Book,
    },
    infrastructure::browser::error::BookError,
};

pub type DownloadEventHandler =
    Arc<dyn Fn(DownloadEvent) + Send + Sync + 'static>;

#[derive(Debug, Clone, Copy, Default)]
pub struct BookCapabilities {
    pub search: bool,
    pub metadata: bool,
    pub download: bool,
    pub epub: bool,
    pub pdf: bool,
    pub txt: bool,
    pub borrow: bool,
}

#[async_trait]
pub trait BrowserProvider: Send + Sync {
    /// Уникальный идентификатор провайдера.
    fn id(&self) -> &'static str;

    /// Возможности провайдера.
    fn capabilities(&self) -> BookCapabilities;

    /// Поиск книг.
    async fn search(
        &self,
        query: &str,
    ) -> Result<Vec<Book>, BookError>;

    /// Получение одной книги по ID.
    async fn get_book(
        &self,
        id: &str,
    ) -> Result<Book, BookError>;

    /// Получение списка книг.
    async fn get_books(
        &self,
    ) -> Result<Vec<Book>, BookError>;

    /// Скачать книгу.
    ///
    /// Provider сообщает о состоянии загрузки через `on_event`.
    async fn download(
        &self,
        id: &str,
        format: &str,
        on_event: DownloadEventHandler,
    ) -> Result<Book, BookError>;
}
