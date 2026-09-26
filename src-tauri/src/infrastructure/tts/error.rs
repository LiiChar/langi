use std::fmt::{Display, Formatter};

#[derive(Debug, thiserror::Error)]
pub enum TTSError {
    #[error("Windows TTS error: {0}")]
    Windows(String),
    #[error("Audio error: {0}")]
    Audio(String),
    #[error("TTS voice not found: {0}")]
    VoiceNotFound(String),
    #[error("Text is empty")]
    InvalidText,
    #[error("Rate must be between 0.5 and 6.0")]
    InvalidRate,
    #[error("Volume must be between 0.0 and 1.0")]
    InvalidVolume,
    #[error("Pitch is outside the supported range")]
    InvalidPitch,
    #[error("Windows TTS error: {0}")]
    Internal(String)
}

impl From<windows::core::Error> for TTSError {
    fn from(error: windows::core::Error) -> Self {
        Self::Windows(error.to_string())
    }
}
