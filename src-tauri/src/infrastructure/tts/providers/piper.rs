use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};

use async_trait::async_trait;
use piper_rs::Piper;
use rodio::{
    buffer::SamplesBuffer,
    OutputStream,
    OutputStreamBuilder,
    Sink,
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

struct PlaybackState {
    sink: Option<Sink>,
}

pub struct PiperProvider {
    models_path: PathBuf,

    /// Audio output.
    ///
    /// OutputStream должен жить всё время жизни provider.
    output_stream: OutputStream,

    /// Текущий playback.
    playback: Arc<Mutex<PlaybackState>>,

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
            OutputStreamBuilder::open_default_stream()
                .map_err(|error| {
                    TTSError::Audio(error.to_string())
                })?;

        Ok(Self {
            models_path,
            output_stream,
            playback: Arc::new(Mutex::new(
                PlaybackState {
                    sink: None,
                },
            )),
            voices,
            config: Mutex::new(config),
        })
    }

    pub fn resource_path() -> PathBuf {
        std::env::current_exe()
            .ok()
            .and_then(|path| {
                path.parent().map(Path::to_path_buf)
            })
            .unwrap_or_else(|| PathBuf::from("."))
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

        if let Some(voice_id) = &config.voice_id {
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

        /*
         * Piper inference CPU-heavy.
         *
         * Не блокируем Tokio runtime.
         */
        let (samples, sample_rate) =
            tokio::task::spawn_blocking(move || {
                let mut piper =
                    Piper::new(
                        &onnx_path,
                        &config_path,
                    )
                    .map_err(|error| {
                        TTSError::Internal(
                            error.to_string(),
                        )
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

        /*
         * rodio 0.22:
         *
         * OutputStream
         *      ↓
         * mixer()
         *      ↓
         * Sink::connect_new()
         */
        let sink =
            Sink::connect_new(
                self.output_stream.mixer()
            );

        sink.set_volume(
            config.volume as f32
        );

        sink.set_speed(
            config.rate as f32
        );

        let source =
            SamplesBuffer::new(
                1,
                sample_rate,
                samples,
            );

        sink.append(source);

        let mut playback =
            self.playback
                .lock()
                .map_err(|_| {
                    TTSError::Internal(
                        "Playback mutex poisoned"
                            .into(),
                    )
                })?;

        playback.sink =
            Some(sink);

        Ok(())
    }

    fn stop(&self) {
        if let Ok(mut playback) =
            self.playback.lock()
        {
            if let Some(sink) =
                playback.sink.take()
            {
                sink.stop();
            }
        }
    }

    fn pause(&self) {
        if let Ok(playback) =
            self.playback.lock()
        {
            if let Some(sink) =
                playback.sink.as_ref()
            {
                sink.pause();
            }
        }
    }

    fn resume(&self) {
        if let Ok(playback) =
            self.playback.lock()
        {
            if let Some(sink) =
                playback.sink.as_ref()
            {
                sink.play();
            }
        }
    }

    fn is_paused(&self) -> bool {
        self.playback
            .lock()
            .ok()
            .and_then(|playback| {
                playback.sink.as_ref()
                    .map(|sink| {
                        sink.is_paused()
                    })
            })
            .unwrap_or(false)
    }

    fn is_playing(&self) -> bool {
        self.playback
            .lock()
            .ok()
            .and_then(|playback| {
                playback.sink.as_ref()
                    .map(|sink| {
                        !sink.is_paused()
                            && !sink.empty()
                    })
            })
            .unwrap_or(false)
    }

    fn set_volume(
        &self,
        volume: f32,
    ) {
        let volume =
            volume.clamp(0.0, 1.0);

        if let Ok(playback) =
            self.playback.lock()
        {
            if let Some(sink) =
                playback.sink.as_ref()
            {
                sink.set_volume(volume);
            }
        }

        if let Ok(mut config) =
            self.config.lock()
        {
            config.volume =
                volume as f64;
        }
    }

    fn set_speed(
        &self,
        speed: f32,
    ) {
        let speed =
            speed.clamp(0.1, 3.0);

        if let Ok(playback) =
            self.playback.lock()
        {
            if let Some(sink) =
                playback.sink.as_ref()
            {
                sink.set_speed(speed);
            }
        }

        if let Ok(mut config) =
            self.config.lock()
        {
            config.rate =
                speed as f64;
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
            config.pitch =
                pitch as f64;
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
            &config.voice_id
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
