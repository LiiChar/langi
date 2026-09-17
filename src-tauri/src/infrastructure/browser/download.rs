use std::{
    path::{Path, PathBuf},
    sync::Arc,
    time::{Duration, Instant},
};

use futures_util::StreamExt;
use reqwest::Client;
use tokio::{
    fs::File,
    io::AsyncWriteExt,
};

use crate::{
    domain::book::{
        DownloadEvent,
        DownloadEventType,
    }, infrastructure::browser::{error::BookError, provider::DownloadEventHandler},
};

pub struct BookDownloader {
    client: Client,
}

impl BookDownloader {
    pub fn new(client: Client) -> Self {
        Self { client }
    }

    pub async fn download(
        &self,
        id: String,
        url: &str,
        path: impl AsRef<Path>,
        on_event: DownloadEventHandler,
    ) -> Result<i32, BookError> {
        let path = path.as_ref();

        let started_at = Instant::now();
        let timestamp = Self::timestamp();

        Self::emit(
            &on_event,
            DownloadEvent {
                id: id.clone(),
                event_type: DownloadEventType::Started,
                timestamp,
                progress: 0.0,
                time_remaining: 0,
                speed: 0.0,
                total_time: 0,
                downloaded: 0,
                total: None,
            },
        );

        let response = match self.client.get(url).send().await {
            Ok(response) => response,
            Err(error) => {
                Self::failed(
                    &on_event,
                    &id,
                    started_at,
                );

                return Err(
                    BookError::Network(error.to_string())
                );
            }
        };

        let status = response.status();

        if !status.is_success() {
            let message = response
                .text()
                .await
                .unwrap_or_else(|_| {
                    "Unknown HTTP error".to_string()
                });

            Self::failed(
                &on_event,
                &id,
                started_at,
            );

            return Err(BookError::Http {
                status: status.as_u16(),
                message,
            });
        }

        let total = response.content_length();

        let parent = path.parent();

        if let Some(parent) = parent {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|error| {
                    Self::failed(
                        &on_event,
                        &id,
                        started_at,
                    );

                    BookError::Io(error)
                })?;
        }

        let mut file = File::create(path)
            .await
            .map_err(|error| {
                Self::failed(
                    &on_event,
                    &id,
                    started_at,
                );

                BookError::Io(error)
            })?;

        let mut stream = response.bytes_stream();

        let mut downloaded: i32 = 0;

        let mut last_event = Instant::now();

        while let Some(chunk) = stream.next().await {
            let chunk = match chunk {
                Ok(chunk) => chunk,

                Err(error) => {
                    Self::failed(
                        &on_event,
                        &id,
                        started_at,
                    );

                    return Err(
                        BookError::Network(
                            error.to_string()
                        )
                    );
                }
            };

            file.write_all(&chunk)
                .await
                .map_err(|error| {
                    Self::failed(
                        &on_event,
                        &id,
                        started_at,
                    );

                    BookError::Io(error)
                })?;

            downloaded += chunk.len() as i32;

            // Не отправляем событие на каждый chunk.
            // Иначе при быстром соединении можно заспамить frontend.
            if last_event.elapsed() >= Duration::from_millis(200) {
                Self::progress(
                    &on_event,
                    &id,
                    downloaded,
                    total.map(|t| t as i32),
                    started_at,
                );

                last_event = Instant::now();
            }
        }

        file.flush()
            .await
            .map_err(|error| {
                Self::failed(
                    &on_event,
                    &id,
                    started_at,
                );

                BookError::Io(error)
            })?;

        let elapsed = started_at.elapsed();

        Self::emit(
            &on_event,
            DownloadEvent {
                id,
                event_type: DownloadEventType::Completed,
                timestamp: Self::timestamp(),
                progress: 100.0,
                time_remaining: 0,
                speed: Self::speed(
                    downloaded,
                    elapsed,
                ),
                total_time: elapsed.as_secs() as i32,
                downloaded: downloaded,
                total: total.map(|t| t as i32),
            },
        );

        Ok(downloaded)
    }

    fn progress(
        handler: &DownloadEventHandler,
        id: &str,
        downloaded: i32,
        total: Option<i32>,
        started_at: Instant,
    ) {
        let elapsed = started_at.elapsed();

        let progress = total
            .filter(|total| *total > 0)
            .map(|total| {
                (downloaded as f32 / total as f32 * 100.0)
                    .min(100.0)
            })
            .unwrap_or(0.0);

        let speed = Self::speed(
            downloaded,
            elapsed,
        );

        let time_remaining = match (total, speed) {
            (Some(total), speed) if speed > 0.0 => {
                let remaining =
                    total.saturating_sub(downloaded);

                (remaining as f32 / speed) as i32
            }

            _ => 0,
        };

        Self::emit(
            handler,
            DownloadEvent {
                id: id.to_string(),
                event_type: DownloadEventType::Progress,
                timestamp: Self::timestamp(),
                progress,
                time_remaining,
                speed,
                total_time: elapsed.as_secs() as i32,
                downloaded: downloaded,
                total: total,
            },
        );
    }

    fn failed(
        handler: &DownloadEventHandler,
        id: &str,
        started_at: Instant,
    ) {
        let elapsed = started_at.elapsed();

        Self::emit(
            handler,
            DownloadEvent {
                id: id.to_string(),
                event_type: DownloadEventType::Failed,
                timestamp: Self::timestamp(),
                progress: 0.0,
                time_remaining: 0,
                speed: 0.0,
                total_time: elapsed.as_secs() as i32,
                downloaded: 0,
                total: None,
            },
        );
    }

    fn speed(
        downloaded: i32,
        elapsed: Duration,
    ) -> f32 {
        if elapsed.as_secs_f32() <= 0.0 {
            return 0.0;
        }

        downloaded as f32 / elapsed.as_secs_f32()
    }

    fn timestamp() -> i32 {
        std::time::SystemTime::now()
            .duration_since(
                std::time::UNIX_EPOCH
            )
            .map(|duration| {
                duration.as_secs() as i32
            })
            .unwrap_or_default()
    }

    fn emit(
        handler: &DownloadEventHandler,
        event: DownloadEvent,
    ) {
        handler(event);
    }
}
