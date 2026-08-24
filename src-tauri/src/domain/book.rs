use serde::{Deserialize, Serialize};
use specta::Type;

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
}

#[derive(Type, Debug, Clone, Serialize, Deserialize)]
pub struct Chapter {
    pub title: Option<String>,
    pub html: String,
}
