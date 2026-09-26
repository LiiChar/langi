use async_trait::async_trait;

use crate::{domain::tts::TTSVoice, infrastructure::tts::{error::TTSError, service::TTSConfig}};

#[async_trait]
pub trait TTSProvider: Send + Sync {
    fn id(&self) -> &str;

    fn voices(&self) -> Result<Vec<TTSVoice>, TTSError>;

    fn default_voice(&self) -> Result<TTSVoice, TTSError>;

    async fn speak(
        &self,
        text: String,
    ) -> Result<(), TTSError>;

    fn stop(&self);

    fn pause(&self);

    fn resume(&self);

    fn is_paused(&self) -> bool;

    fn is_playing(&self) -> bool;

    fn set_volume(&self, volume: f32);

    fn set_speed(&self, speed: f32);

    fn set_pitch(&self, pitch: f32)
        -> Result<(), TTSError>;

    fn set_config(
        &self,
        config: TTSConfig,
    ) -> Result<(), TTSError>;
}
