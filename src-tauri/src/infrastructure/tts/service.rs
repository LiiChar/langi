use crate::infrastructure::tts::provider::TTSProvider;

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
    provider: Box<dyn TTSProvider>,
    config: TTSConfig,
}
