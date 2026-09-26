use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TTSVoice {
    pub id: String,
    pub name: String,
    pub language: String,
    pub description: String,
}
