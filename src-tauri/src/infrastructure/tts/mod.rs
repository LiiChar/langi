pub mod providers;
pub mod provider;
pub mod service;
pub mod error;

use service::TTSConfig;
use providers::piper::PiperProvider;

pub fn create_tts_service() -> Result<service::TtsService, error::TTSError> {
    let config = TTSConfig {
        enabled: true,
        provider: "piper".into(),
        language: "en_US".into(),
        voice: Some("en_US-mike-medium".into()),
        speed: 1.0,
        pitch: 1.0,
        volume: 1.0,
        rate: 1.0,
    };
    Ok(service::TtsService::new(PiperProvider::new(config)?))
}
