use std::{
    io::Cursor,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc,
        RwLock,
    },
};

use rodio::{Decoder, DeviceSinkBuilder, Player};

use windows::{
    Media::SpeechSynthesis::{
        ISpeechSynthesisStream,
        SpeechSynthesizer,
    }, Storage::Streams::{
        DataReader,
        IRandomAccessStream,
    }, core::{HSTRING, Interface},
};

use crate::{
    domain::tts::TTSVoice,
    infrastructure::tts::{
        error::TTSError,
        provider::TTSProvider,
        service::TTSConfig,
    },
};

#[derive(Clone)]
pub struct WindowsTtsProvider {
    synthesizer: SpeechSynthesizer,

    /// Держим audio stream живым столько же, сколько Player.
    audio: Arc<rodio::MixerDeviceSink>,

    /// Один Player на весь provider.
    ///
    /// Это позволяет:
    /// - stop
    /// - pause
    /// - resume
    /// - сменять текущую фразу
    player: Arc<Player>,

    /// Каждому speak() выдаём собственный generation.
    ///
    /// Если во время синтеза пользователь запустил новую фразу,
    /// старый результат просто игнорируется.
    generation: Arc<AtomicU64>,

    config: Arc<RwLock<TTSConfig>>,
}

impl WindowsTtsProvider {
    pub fn new(config: TTSConfig) -> Result<Self, TTSError> {
        let synthesizer = SpeechSynthesizer::new()?;

        let audio = DeviceSinkBuilder::open_default_sink()
            .map_err(|error| TTSError::Audio(error.to_string()))?;

        let player = Player::connect_new(audio.mixer());

        Ok(Self {
            synthesizer,

            audio: Arc::new(audio),

            player: Arc::new(player),

            generation: Arc::new(AtomicU64::new(0)),

            config: Arc::new(RwLock::new(config)),
        })
    }

    fn config(&self) -> Result<TTSConfig, TTSError> {
        self.config
            .read()
            .map(|config| config.clone())
            .map_err(|_| {
                TTSError::Internal(
                    "Failed to acquire TTS config read lock".to_string(),
                )
            })
    }

    fn select_voice(
        &self,
        voice_id: Option<&str>,
        language: Option<&str>,
    ) -> Result<(), TTSError> {
        /*
         * Явно указанный voice имеет приоритет
         * над language.
         */
        if let Some(voice_id) = voice_id {
            let voices = SpeechSynthesizer::AllVoices()?;

            let count = voices.Size()?;

            for index in 0..count {
                let voice = voices.GetAt(index)?;

                if voice.Id()?.to_string() == voice_id {
                    self.synthesizer.SetVoice(&voice)?;

                    return Ok(());
                }
            }

            return Err(TTSError::VoiceNotFound(
                voice_id.to_string(),
            ));
        }

        /*
         * Если конкретный voice не указан,
         * ищем голос по language.
         */
        if let Some(language) = language {
            let voices = SpeechSynthesizer::AllVoices()?;

            let count = voices.Size()?;

            let language_lower = language.to_ascii_lowercase();

            for index in 0..count {
                let voice = voices.GetAt(index)?;

                let voice_language =
                    voice.Language()?.to_string();

                let voice_language_lower =
                    voice_language.to_ascii_lowercase();

                /*
                 * en-US == en-US
                 *
                 * en == en-US
                 * en == en-GB
                 */
                if voice_language_lower == language_lower
                    || voice_language_lower.starts_with(
                        &format!("{language_lower}-"),
                    )
                {
                    self.synthesizer.SetVoice(&voice)?;

                    return Ok(());
                }
            }
        }

        /*
         * Если ничего не нашли — Windows
         * продолжит использовать default voice.
         */
        Ok(())
    }

    fn apply_config(
        &self,
        config: &TTSConfig,
    ) -> Result<(), TTSError> {
        if !(0.5..=2.0).contains(&config.rate) {
            return Err(TTSError::InvalidRate);
        }

        if !(0.0..=1.0).contains(&config.volume) {
            return Err(TTSError::InvalidVolume);
        }

        /*
         * Windows AudioPitch:
         *
         * 0.0 = минимальный pitch
         * 1.0 = default
         * 2.0 = максимальный pitch
         */
        if !(0.0..=2.0).contains(&config.pitch) {
            return Err(TTSError::InvalidPitch);
        }

        let options = self.synthesizer.Options()?;

        options.SetSpeakingRate(config.rate as f64)?;
        options.SetAudioVolume(config.volume as f64)?;
        options.SetAudioPitch(config.pitch as f64)?;

        Ok(())
    }

    fn current_generation(&self) -> u64 {
        self.generation.load(Ordering::SeqCst)
    }

    fn next_generation(&self) -> u64 {
        self.generation.fetch_add(1, Ordering::SeqCst) + 1
    }
}

impl TTSProvider for WindowsTtsProvider {
    fn id(&self) -> &str {
        "System"
    }

    fn voices(&self) -> Result<Vec<TTSVoice>, TTSError> {
        let voices = SpeechSynthesizer::AllVoices()?;

        let count = voices.Size()?;

        let mut result = Vec::with_capacity(count as usize);

        for index in 0..count {
            let voice = voices.GetAt(index)?;

            result.push(TTSVoice {
                id: voice.Id()?.to_string(),
                name: voice.DisplayName()?.to_string(),
                language: voice.Language()?.to_string(),
                description: voice.Description()?.to_string(),
            });
        }

        Ok(result)
    }

    fn default_voice(&self) -> Result<TTSVoice, TTSError> {
        let voice = SpeechSynthesizer::DefaultVoice()?;

        Ok(TTSVoice {
            id: voice.Id()?.to_string(),
            name: voice.DisplayName()?.to_string(),
            language: voice.Language()?.to_string(),
            description: voice.Description()?.to_string(),
        })
    }

    async fn speak(
        &self,
        text: String,
    ) -> Result<(), TTSError> {
        if text.trim().is_empty() {
            return Err(TTSError::InvalidText);
        }

        let config = self.config()?;

        /*
         * Каждая новая фраза инвалидирует предыдущую.
         */
        let generation = self.next_generation();

        /*
         * Сразу останавливаем текущий audio.
         */
        self.player.stop();

        /*
         * Выбираем голос.
         */
        self.select_voice(
            config.voice.as_deref(),
            Some(&config.language),
        )?;

        self.apply_config(&config)?;

        /*
         * Генерация Windows audio.
         */
        let stream = self
            .synthesizer
            .SynthesizeTextToStreamAsync(
                &HSTRING::from(&text),
            )?
            .await
            .map_err(|error| {
                TTSError::Windows(error.to_string())
            })?;

        /*
         * За время синтеза пользователь мог
         * запустить другую фразу.
         */
        if self.current_generation() != generation {
            return Ok(());
        }

        /*
         * Забираем WAV/PCM данные из Windows stream.
         */
        let audio_data = read_stream(&stream).await?;

        /*
         * Повторная проверка.
         */
        if self.current_generation() != generation {
            return Ok(());
        }

        /*
         * Decoder определяет формат аудио,
         * который вернул Windows SpeechSynthesizer.
         */
        let decoder = Decoder::try_from(
            Cursor::new(audio_data),
        )
        .map_err(|error| {
            TTSError::Audio(error.to_string())
        })?;

        /*
         * На всякий случай очищаем предыдущую очередь.
         */
        self.player.stop();

        /*
         * Здесь скорость НЕ меняем через rodio.
         *
         * Она уже была применена Windows через
         * SpeechSynthesizerOptions::SpeakingRate.
         */
        self.player.set_volume(1.0);

        self.player.append(decoder);

        Ok(())
    }

    fn stop(&self) {
        /*
         * Инвалидируем текущий speak().
         */
        self.next_generation();

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
        !self.player.empty() && !self.player.is_paused()
    }

    fn set_volume(&self, volume: f32) {
        let volume = volume.clamp(0.0, 1.0);

        self.player.set_volume(volume);
    }

    fn set_speed(&self, speed: f32) {
        /*
         * Важно:
         *
         * Это playback speed rodio, а не TTS speaking rate.
         *
         * rodio при изменении speed одновременно меняет pitch.
         *
         * Поэтому для обычного TTS лучше использовать
         * config.rate -> Windows SpeakingRate.
         */
        self.player.set_speed(speed.clamp(0.5, 2.0));
    }

    fn set_pitch(
        &self,
        pitch: f32,
    ) -> Result<(), TTSError> {
        let pitch = pitch.clamp(0.0, 2.0);

        let options = self
            .synthesizer
            .Options()?;

        options.SetAudioPitch(pitch as f64)?;

        let mut config = self
            .config
            .write()
            .map_err(|_| {
                TTSError::Internal(
                    "Failed to acquire TTS config write lock"
                        .to_string(),
                )
            })?;

        config.pitch = pitch;

        Ok(())
    }

    fn set_config(
        &self,
        config: TTSConfig,
    ) -> Result<(), TTSError> {
        /*
         * Валидируем до сохранения.
         */
        if !(0.5..=2.0).contains(&config.rate) {
            return Err(TTSError::InvalidRate);
        }

        if !(0.0..=1.0).contains(&config.volume) {
            return Err(TTSError::InvalidVolume);
        }

        if !(0.0..=2.0).contains(&config.pitch) {
            return Err(TTSError::InvalidPitch);
        }

        /*
         * Если voice указан — сразу проверяем,
         * что такой voice существует.
         */
        if let Some(voice_id) = config.voice.as_deref() {
            let voices = SpeechSynthesizer::AllVoices()?;

            let count = voices.Size()?;

            let exists = (0..count).any(|index| {
                voices
                    .GetAt(index)
                    .and_then(|voice| voice.Id())
                    .map(|id| id.to_string() == voice_id)
                    .unwrap_or(false)
            });

            if !exists {
                return Err(TTSError::VoiceNotFound(
                    voice_id.to_string(),
                ));
            }
        }

        /*
         * Применяем настройки Windows.
         */
        self.apply_config(&config)?;

        /*
         * Сохраняем конфиг.
         */
        let mut current = self
            .config
            .write()
            .map_err(|_| {
                TTSError::Internal(
                    "Failed to acquire TTS config write lock"
                        .to_string(),
                )
            })?;

        *current = config;

        Ok(())
    }
}

async fn read_stream(
    stream: &ISpeechSynthesisStream,
) -> Result<Vec<u8>, TTSError> {
    let stream = stream
        .cast::<IRandomAccessStream>()
        .map_err(|error| TTSError::Windows(error.to_string()))?;

    let size = stream
        .Size()
        .map_err(|error| TTSError::Windows(error.to_string()))?;

    if size == 0 {
        return Err(TTSError::Audio(
            "Speech synthesis returned empty audio".to_string(),
        ));
    }

    if size > u32::MAX as u64 {
        return Err(TTSError::Audio(
            "Speech synthesis stream is too large".to_string(),
        ));
    }

    let input = stream
        .GetInputStreamAt(0)
        .map_err(|error| TTSError::Windows(error.to_string()))?;

    let reader = DataReader::CreateDataReader(&input)
        .map_err(|error| TTSError::Windows(error.to_string()))?;

    let size = size as u32;

    reader
        .LoadAsync(size)
        .map_err(|error| TTSError::Windows(error.to_string()))?
        .await
        .map_err(|error| TTSError::Windows(error.to_string()))?;

    let mut buffer = vec![0u8; size as usize];

    reader
        .ReadBytes(&mut buffer)
        .map_err(|error| TTSError::Windows(error.to_string()))?;

    reader
        .Close()
        .map_err(|error| TTSError::Windows(error.to_string()))?;

    Ok(buffer)
}
