use std::sync::Arc;
use std::time::Duration;

use futures::future::join_all;

use crate::{
    domain::Book, infrastructure::browser::{
        error::BookError, provider::{BrowserProvider, DownloadEventHandler},
    },
};

#[derive(Debug, Clone)]
pub struct ClientConfig {
    pub cache_ttl: Duration,
    pub cache_capacity: usize,
    pub request_timeout: Duration,
    pub max_batch_size: usize,
    pub max_retries: usize,
    pub retry_delay: Duration,
}

impl Default for ClientConfig {
    fn default() -> Self {
        Self {
            cache_ttl: Duration::from_secs(60 * 60 * 24),
            cache_capacity: 10_000,
            request_timeout: Duration::from_secs(10),
            max_batch_size: 10,
            max_retries: 1,
            retry_delay: Duration::from_millis(250),
        }
    }
}

#[derive(Clone)]
pub struct BrowserService {
    inner: Arc<Inner>,
}

struct Inner {
    config: ClientConfig,
    providers: Vec<Arc<dyn BrowserProvider>>,
}

impl BrowserService {
    pub fn new(
        config: ClientConfig,
        providers: Vec<Arc<dyn BrowserProvider>>,
    ) -> Self {
        Self {
            inner: Arc::new(Inner {
                config,
                providers,
            }),
        }
    }

    pub fn config(&self) -> &ClientConfig {
        &self.inner.config
    }

    pub fn get_providers(&self) -> Vec<String> {
        self.inner
            .providers
            .iter()
            .map(|provider| provider.id().to_string())
            .collect()
    }

    pub fn get_provider(
        &self,
        provider_id: &str,
    ) -> Option<Arc<dyn BrowserProvider>> {
        self.inner
            .providers
            .iter()
            .find(|provider| provider.id() == provider_id)
            .cloned()
    }

    pub async fn get_book(
        &self,
        provider_id: &str,
        book_id: &str,
    ) -> Result<Book, BookError> {
        let provider = self
            .get_provider(provider_id)
            .ok_or_else(|| BookError::ProviderNotFound {
                provider: provider_id.to_string(),
            })?;

        provider.get_book(book_id).await
    }

    pub async fn get_books_by_provider(
        &self,
        provider_id: &str,
    ) -> Result<Vec<Book>, BookError> {
        let provider = self
            .get_provider(provider_id)
            .ok_or_else(|| BookError::ProviderNotFound {
                provider: provider_id.to_string(),
            })?;

        provider.get_books().await
    }

    pub async fn get_books(&self) -> Result<Vec<Book>, BookError> {
        let futures = self
            .inner
            .providers
            .iter()
            .map(|provider| provider.get_books());

        let results = join_all(futures).await;

        let mut books = Vec::new();

        for result in results {
            books.extend(result?);
        }

        Ok(books)
    }

    pub async fn search_books(
        &self,
        query: &str,
    ) -> Result<Vec<Book>, BookError> {
        let futures = self
            .inner
            .providers
            .iter()
            .map(|provider| provider.search(query));

        let results = join_all(futures).await;

        let mut books = Vec::new();

        for result in results {
            books.extend(result?);
        }

        Ok(books)
    }

    pub async fn search_provider(
        &self,
        provider_id: &str,
        query: &str,
    ) -> Result<Vec<Book>, BookError> {
        let provider = self
            .get_provider(provider_id)
            .ok_or_else(|| BookError::ProviderNotFound {
                provider: provider_id.to_string(),
            })?;

        provider.search(query).await
    }

    pub async fn download(
        &self,
        provider_id: &str,
        book_id: &str,
        format: &str,
        on_event: DownloadEventHandler,
    ) -> Result<Book, BookError> {
        let provider = self
            .get_provider(provider_id)
            .ok_or_else(|| BookError::ProviderNotFound {
                provider: provider_id.to_string(),
            })?;

        if !provider.capabilities().download {
            return Err(BookError::UnsupportedOperation {
                provider: provider_id.to_string(),
                operation: "download".to_string(),
            });
        }

        let sel_format = match format.is_empty() {
            true => "epub".to_string(),
            false => format.to_string(),
        };

        provider
            .download(book_id, &sel_format, on_event)
            .await
    }
}
