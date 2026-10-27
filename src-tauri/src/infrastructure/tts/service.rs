use std::sync::Arc;

use crate::infrastructure::tts::{error::TTSError, provider::TTSProvider};

#[derive(Clone, PartialEq)]
pub struct TTSConfig {
    pub enabled: bool,
    pub provider: String,
    pub language: String,
    pub voice: Option<String>,
    pub speed: f32,
    pub pitch: f32,
    pub volume: f32,
    pub rate: f32
}

pub struct TtsService {
    provider: Arc<dyn TTSProvider>,
}

impl TtsService {
    pub fn new(provider: impl TTSProvider + 'static) -> Self {
        Self { provider: Arc::new(provider) }
    }

    pub async fn speak(&self, text: String) -> Result<(), TTSError> {
        self.provider.speak(text).await
    }

    pub fn stop(&self) { self.provider.stop(); }
    pub fn pause(&self) { self.provider.pause(); }
    pub fn resume(&self) { self.provider.resume(); }
    pub fn is_playing(&self) -> bool { self.provider.is_playing() }
    pub fn voices(&self) -> Result<Vec<crate::domain::tts::TTSVoice>, TTSError> { self.provider.voices() }
    pub fn prepare_language(&self, language: &str) -> Result<(), TTSError> { self.provider.prepare_language(language) }
}
