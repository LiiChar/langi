use serde::{Deserialize, Serialize};
use specta::Type;
use tauri_specta::Event;

use crate::domain::learning::LearningEventType;

#[derive(Type, Debug, Clone, Serialize, Deserialize)]
pub struct Book {
    pub id: String,
    pub meta: BookMeta,
    pub chapters: Option<Vec<Chapter>>,
}

#[derive(Type, Debug, Clone, Serialize, Deserialize)]
pub struct BookMeta {
    pub title: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub language: Option<String>,
    pub cover_path: Option<String>,
    pub path: String,
    pub size: i32,
    pub last_read_at: i32,
    pub last_modified: i32,
    pub created_at: i32,
    pub genres: Option<Vec<String>>,
    pub source: Option<String>
}

#[derive(Type, Debug, Clone, Serialize, Deserialize)]
pub struct Chapter {
    pub id: String,
    pub title: Option<String>,
    pub html: String,
}

#[derive(
    Debug,
    Clone,
    Deserialize,
    Serialize,
    Type,
    Event,
)]
pub struct DownloadEvent {
    pub id: String,
    pub event_type: DownloadEventType,
    pub timestamp: i32,
    pub progress: f32,
    pub downloaded: i32,
    pub total: Option<i32>,
    pub speed: f32,
    pub time_remaining: i32,
    pub total_time: i32,
}

#[derive(
    Debug,
    Clone,
    Deserialize,
    Serialize,
    Type,
    Event,
)]
pub enum DownloadEventType {
    Started,
    Progress,
    Completed,
    Failed,
}
