use std::{
    collections::HashMap,
    num::{NonZeroU16, NonZeroU32},
    path::{Path, PathBuf},
    sync::{Arc, Mutex, OnceLock},
};

use async_trait::async_trait;
use piper_rs::Piper;
use rodio::{
    buffer::SamplesBuffer,
    DeviceSinkBuilder,
    Player,
};
use walkdir::WalkDir;

use crate::{
    domain::tts::TTSVoice,
    infrastructure::tts::{
        error::TTSError,
        provider::TTSProvider,
        service::TTSConfig,
    },
};

pub struct PiperProvider {
    models_path: PathBuf,

    /// Audio output.
    ///
    /// OutputStream должен жить всё время жизни provider.
    _output_stream: Arc<rodio::MixerDeviceSink>,
    player: Player,
    models: Mutex<HashMap<String, Arc<OnceLock<Result<Mutex<Piper>, String>>>>>,

    /// Доступные Piper voices.
    voices: HashMap<String, TTSVoice>,

    /// TTS configuration.
    config: Mutex<TTSConfig>,
}

impl PiperProvider {
    pub fn new(config: TTSConfig) -> Result<Self, TTSError> {
        let models_path = Self::resource_path();

        if !models_path.exists() {
            return Err(TTSError::Internal(format!(
                "Piper models directory does not exist: {}",
                models_path.display()
            )));
        }

        let voices = Self::load_voices(&models_path)?;

        if voices.is_empty() {
            return Err(TTSError::Internal(format!(
                "No Piper voices found in: {}",
                models_path.display()
            )));
        }

        let output_stream =
            DeviceSinkBuilder::open_default_sink()
                .map_err(|error| {
                    TTSError::Audio(error.to_string())
                })?;
        let player = Player::connect_new(output_stream.mixer());
        let initial_voice = config.voice.clone().unwrap_or_else(|| "ru_RU-denis-medium".into());
        let initial_slot = Arc::new(OnceLock::new());
        let mut models = HashMap::new();
        models.insert(initial_voice.clone(), Arc::clone(&initial_slot));
        Self::start_model_preload(&models_path, &initial_voice, initial_slot);

        Ok(Self {
            models_path,
            _output_stream: Arc::new(output_stream),
            player,
            models: Mutex::new(models),
            voices,
            config: Mutex::new(config),
        })
    }

    fn start_model_preload(
        models_path: &Path,
        voice_id: &str,
        slot: Arc<OnceLock<Result<Mutex<Piper>, String>>>,
    ) {
        let model_path = models_path.join(format!("{voice_id}.onnx"));
        let config_path = models_path.join(format!("{voice_id}.onnx.json"));
        let _ = std::thread::Builder::new()
            .name(format!("piper-init-{voice_id}"))
            .spawn(move || {
                slot.get_or_init(|| Piper::new(&model_path, &config_path)
                    .map(Mutex::new)
                    .map_err(|error| error.to_string()));
            });
    }

    fn model_slot(&self, voice_id: &str) -> Result<Arc<OnceLock<Result<Mutex<Piper>, String>>>, TTSError> {
        let mut models = self.models.lock().map_err(|_| TTSError::Internal("Piper model map poisoned".into()))?;
        Ok(Arc::clone(models.entry(voice_id.to_owned()).or_insert_with(|| {
            let slot = Arc::new(OnceLock::new());
            Self::start_model_preload(&self.models_path, voice_id, Arc::clone(&slot));
            slot
        })))
    }

    fn voice_for_language(&self, language: &str) -> Result<String, TTSError> {
        let language = language.trim().to_lowercase().replace('-', "_");
        let language = match language.as_str() {
            "english" => "en".to_owned(),
            "russian" | "русский" => "ru".to_owned(),
            other => other.to_owned(),
        };
        self.voices.values()
            .find(|voice| voice.language.to_lowercase().starts_with(&language))
            .map(|voice| voice.id.clone())
            .ok_or_else(|| TTSError::VoiceNotFound(format!("voice for language {language}")))
    }

    pub fn resource_path() -> PathBuf {
        let bundled = std::env::current_exe()
            .ok()
            .and_then(|path| {
                path.parent().map(Path::to_path_buf)
            })
            .unwrap_or_else(|| PathBuf::from("."))
            .join("resources")
            .join("piper-models");

        if bundled.exists() {
            return bundled;
        }

        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("resources")
            .join("piper-models")
    }

    fn load_voices(
        path: &Path,
    ) -> Result<HashMap<String, TTSVoice>, TTSError> {
        let mut voices = HashMap::new();

        for entry in WalkDir::new(path)
            .min_depth(1)
            .max_depth(1)
            .into_iter()
            .filter_map(Result::ok)
        {
            let path = entry.path();

            if !path.is_file() {
                continue;
            }

            /*
             * Нас интересуют только .onnx:
             *
             * ru_RU-denis-medium.onnx
             *
             * Конфигурация:
             *
             * ru_RU-denis-medium.onnx.json
             *
             * автоматически игнорируется.
             */
            if path.extension().and_then(|x| x.to_str()) != Some("onnx") {
                continue;
            }

            let Some(stem) =
                path.file_stem().and_then(|x| x.to_str())
            else {
                continue;
            };

            /*
             * ru_RU-denis-medium
             *
             * 0 -> ru_RU
             * 1 -> denis
             * 2 -> medium
             */
            let parts: Vec<&str> =
                stem.splitn(3, '-').collect();

            if parts.len() != 3 {
                continue;
            }

            let language = parts[0];
            let name = parts[1];
            let description = parts[2];

            voices.insert(
                stem.to_string(),
                TTSVoice {
                    id: stem.to_string(),
                    name: name.to_string(),
                    language: language.to_string(),
                    description: description.to_string(),
                },
            );
        }

        Ok(voices)
    }

    fn voice_paths(
        &self,
        voice_id: &str,
    ) -> Result<(PathBuf, PathBuf), TTSError> {
        let onnx_path = self
            .models_path
            .join(format!("{voice_id}.onnx"));

        let config_path = self
            .models_path
            .join(format!("{voice_id}.onnx.json"));

        if !onnx_path.exists() {
            return Err(TTSError::VoiceNotFound(
                voice_id.to_string(),
            ));
        }

        if !config_path.exists() {
            return Err(TTSError::Internal(format!(
                "Piper config not found: {}",
                config_path.display()
            )));
        }

        Ok((onnx_path, config_path))
    }

    fn current_voice_id(&self) -> Result<String, TTSError> {
        let config = self
            .config
            .lock()
            .map_err(|_| {
                TTSError::Internal(
                    "TTS config mutex poisoned".into(),
                )
            })?;

        if let Some(voice_id) = &config.voice {
            return Ok(voice_id.clone());
        }

        drop(config);

        Ok(self.default_voice()?.id)
    }

    fn current_config(&self) -> Result<TTSConfig, TTSError> {
        self.config
            .lock()
            .map_err(|_| {
                TTSError::Internal(
                    "TTS config mutex poisoned".into(),
                )
            })
            .map(|config| config.clone())
    }
}

#[async_trait]
impl TTSProvider for PiperProvider {
    fn id(&self) -> &str {
        "piper"
    }

    fn voices(&self) -> Result<Vec<TTSVoice>, TTSError> {
        Ok(self.voices.values().cloned().collect())
    }

    fn prepare_language(&self, language: &str) -> Result<(), TTSError> {
        let voice_id = self.voice_for_language(language)?;
        {
            let mut config = self.config.lock().map_err(|_| TTSError::Internal("TTS config mutex poisoned".into()))?;
            config.voice = Some(voice_id.clone());
        }
        self.stop();
        self.models.lock()
            .map_err(|_| TTSError::Internal("Piper model map poisoned".into()))?
            .retain(|loaded_voice, _| loaded_voice == &voice_id);
        let _ = self.model_slot(&voice_id)?;
        Ok(())
    }

    fn default_voice(&self) -> Result<TTSVoice, TTSError> {
        if let Some(voice) =
            self.voices.get("ru_RU-denis-medium")
        {
            return Ok(voice.clone());
        }

        self.voices
            .values()
            .next()
            .cloned()
            .ok_or_else(|| {
                TTSError::Internal(
                    "No Piper voices available".into(),
                )
            })
    }

    async fn speak(
        &self,
        text: String,
    ) -> Result<(), TTSError> {
        if text.trim().is_empty() {
            return Err(TTSError::InvalidText);
        }

        /*
         * Останавливаем предыдущую фразу.
         */
        self.stop();

        let voice_id =
            self.current_voice_id()?;

        let (onnx_path, config_path) =
            self.voice_paths(&voice_id)?;

        let config =
            self.current_config()?;
        let model = self.model_slot(&voice_id)?;

        /*
         * Piper inference CPU-heavy.
         *
         * Не блокируем Tokio runtime.
         */
        let (samples, sample_rate) =
            tokio::task::spawn_blocking(move || {
                let piper = model.get_or_init(|| {
                    Piper::new(&onnx_path, &config_path)
                        .map(Mutex::new)
                        .map_err(|error| error.to_string())
                }).as_ref().map_err(|error| TTSError::Internal(error.clone()))?;
                let mut piper = piper.lock().map_err(|_| {
                    TTSError::Internal("Piper model lock poisoned".into())
                })?;

                piper
                    .create(
                        &text,
                        false,
                        None,
                        None,
                        None,
                        None,
                    )
                    .map_err(|error| {
                        TTSError::Internal(
                            error.to_string(),
                        )
                    })
            })
            .await
            .map_err(|error| {
                TTSError::Internal(
                    error.to_string(),
                )
            })??;

        self.player.set_volume(config.volume);
        self.player.set_speed(config.rate);
        let channels = NonZeroU16::new(1).expect("one channel is non-zero");
        let sample_rate = NonZeroU32::new(sample_rate).ok_or_else(|| {
            TTSError::Audio("Piper returned an invalid sample rate".into())
        })?;

        let source =
            SamplesBuffer::new(
                channels,
                sample_rate,
                samples,
            );
        self.player.append(source);

        Ok(())
    }

    fn stop(&self) {
        self.player.stop();
    }

    fn pause(&self) {
        self.player.pause();
    }

    fn resume(&self) {
        self.player.play();
    }

    fn is_paused(&self) -> bool {
        self.player.is_paused()
    }

    fn is_playing(&self) -> bool {
        !self.player.is_paused() && !self.player.empty()
    }

    fn set_volume(
        &self,
        volume: f32,
    ) {
        let volume =
            volume.clamp(0.0, 1.0);

        self.player.set_volume(volume);

        if let Ok(mut config) =
            self.config.lock()
        {
            config.volume = volume;
        }
    }

    fn set_speed(
        &self,
        speed: f32,
    ) {
        let speed =
            speed.clamp(0.1, 3.0);

        self.player.set_speed(speed);

        if let Ok(mut config) =
            self.config.lock()
        {
            config.rate = speed;
        }
    }

    fn set_pitch(
        &self,
        pitch: f32,
    ) -> Result<(), TTSError> {
        if !(0.5..=2.0).contains(&pitch) {
            return Err(
                TTSError::InvalidPitch
            );
        }

        if let Ok(mut config) =
            self.config.lock()
        {
            config.pitch = pitch;
        }

        /*
         * В текущем API piper-rs нет простого
         * runtime pitch control.
         */
        Ok(())
    }

    fn set_config(
        &self,
        config: TTSConfig,
    ) -> Result<(), TTSError> {
        if let Some(voice_id) =
            &config.voice
        {
            if !self.voices.contains_key(
                voice_id
            ) {
                return Err(
                    TTSError::VoiceNotFound(
                        voice_id.clone()
                    )
                );
            }
        }

        if !(0.1..=3.0)
            .contains(&config.rate)
        {
            return Err(
                TTSError::InvalidRate
            );
        }

        if !(0.0..=1.0)
            .contains(&config.volume)
        {
            return Err(
                TTSError::InvalidVolume
            );
        }

        if !(0.5..=2.0)
            .contains(&config.pitch)
        {
            return Err(
                TTSError::InvalidPitch
            );
        }

        {
            let mut current =
                self.config
                    .lock()
                    .map_err(|_| {
                        TTSError::Internal(
                            "TTS config mutex poisoned"
                                .into(),
                        )
                    })?;

            *current =
                config.clone();
        }

        self.set_volume(
            config.volume as f32
        );

        self.set_speed(
            config.rate as f32
        );

        Ok(())
    }
}
