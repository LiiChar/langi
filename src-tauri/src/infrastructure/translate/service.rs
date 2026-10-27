use std::{
    sync::Arc,
    time::Duration,
};

use reqwest::Client;
use tokio::{
    sync::RwLock,
    time::sleep,
};

use super::{
    cache::{CacheKey, TranslationCache},
    local::LocalDictionary,
    provider::TranslationProvider,
    types::{
        normalize_language,
        Translation,
        TranslationBatchRequest,
        TranslationError,
        TranslationMode,
        TranslationRequest,
        TranslationSource,
    },
};

pub struct TranslationConfig {
    pub mode: TranslationMode,

    pub cache_ttl: Duration,

    pub cache_capacity: usize,

    pub request_timeout: Duration,

    pub max_batch_size: usize,

    pub max_retries: usize,

    pub retry_delay: Duration,
}

impl Default for TranslationConfig {
    fn default() -> Self {
        Self {
            mode: TranslationMode::OnlineFirst,

            cache_ttl: Duration::from_secs(
                60 * 60 * 24,
            ),

            cache_capacity: 10_000,

            request_timeout: Duration::from_secs(10),

            max_batch_size: 10,

            max_retries: 1,

            retry_delay: Duration::from_millis(250),
        }
    }
}

#[derive(Clone)]
pub struct TranslationService {
    inner: Arc<Inner>,
}

struct Inner {
    config: TranslationConfig,

    mode: RwLock<TranslationMode>,

    cache: TranslationCache,

    local: LocalDictionary,

    providers: Vec<Arc<dyn TranslationProvider>>,
}

impl TranslationService {
    pub fn new(
        config: TranslationConfig,
        providers: Vec<Arc<dyn TranslationProvider>>,
    ) -> Result<Self, TranslationError> {
        if config.max_batch_size == 0 {
            return Err(
                TranslationError::Provider(
                    "max_batch_size must be greater than zero"
                        .into(),
                )
            );
        }

        if config.cache_capacity == 0 {
            return Err(
                TranslationError::Provider(
                    "cache_capacity must be greater than zero"
                        .into(),
                )
            );
        }

        Ok(Self {
            inner: Arc::new(Inner {
                mode: RwLock::new(config.mode),

                cache: TranslationCache::new(
                    config.cache_ttl,
                    config.cache_capacity,
                ),

                local: LocalDictionary::new(),

                config,

                providers,
            }),
        })
    }

    // ========================================================================
    // Configuration
    // ========================================================================

    pub async fn set_mode(
        &self,
        mode: TranslationMode,
    ) {
        let mut current = self.inner.mode.write().await;
        if *current != mode {
            *current = mode;
            self.inner.cache.clear();
        }
    }

    pub async fn mode(&self) -> TranslationMode {
        *self.inner.mode.read().await
    }

    pub fn clear_cache(&self) {
        self.inner.cache.clear();
    }

    pub fn set_local_dictionary_directory(&self, directory: std::path::PathBuf) {
        self.inner.local.set_directory(directory);
    }

    pub fn cache_size(&self) -> usize {
        self.inner.cache.len()
    }

    // ========================================================================
    // Text
    // ========================================================================

    pub async fn translate(
        &self,
        text: impl AsRef<str>,
        from: impl AsRef<str>,
        to: impl AsRef<str>,
    ) -> Result<Translation, TranslationError> {
        let text = text.as_ref().trim();

        if text.is_empty() {
            return Err(TranslationError::EmptyInput);
        }

        let from = normalize_language(from.as_ref());
        let to = normalize_language(to.as_ref());

        let key = CacheKey::new(
            &from,
            &to,
            text,
        );

        let mode = self.mode().await;

        if let Some(value) = self.inner.cache.get(&key) {
            return Ok(Translation::new(value, TranslationSource::Cache));
        }

        // OnlineFirst really consults the online provider before WikDict.
        // Do not cache a local fallback in this mode, otherwise later calls
        // would bypass the online provider despite the selected priority.
        if mode == TranslationMode::OnlineFirst {
            if let Ok(value) = self.translate_online(text, &from, &to).await {
                self.inner.cache.insert(key, value.clone());
                return Ok(Translation::new(value, TranslationSource::Online));
            }
            let value = self.inner.local.translate(text, &from, &to)?;
            let translation = value.translations.first().ok_or(TranslationError::NotFound)?.clone();
            return Ok(Translation::new(translation, TranslationSource::LocalDictionary));
        }

        if mode == TranslationMode::OfflineFirst {
            let local = self.inner.local.translate(text, &from, &to).ok();
            if let Some(value) = local.as_ref().filter(|value| value.fully_translated) {
                let translation = value.translations.first().ok_or(TranslationError::NotFound)?.clone();
                self.inner.cache.insert(key, translation.clone());
                return Ok(Translation::new(translation, TranslationSource::LocalDictionary));
            }

            if let Ok(value) = self.translate_online(text, &from, &to).await {
                self.inner.cache.insert(key, value.clone());
                return Ok(Translation::new(value, TranslationSource::Online));
            }
            if let Some(value) = local {
                if let Some(translation) = value.translations.first() {
                    return Ok(Translation::new(translation.clone(), TranslationSource::LocalDictionary));
                }
            }
            return Err(TranslationError::NotFound);
        }

        if mode != TranslationMode::OnlineOnly {
            if let Ok(value) = self.inner.local.translate(text, &from, &to) {
                if let Some(translation) = value.translations.first() {
                    self.inner.cache.insert(key, translation.clone());
                    return Ok(Translation::new(translation, TranslationSource::LocalDictionary));
                }
            }
            if mode == TranslationMode::OfflineOnly {
                return Err(TranslationError::NotFound);
            }
        }

        let value = self
            .translate_online(
                text,
                &from,
                &to,
            )
            .await?;

        self.inner.cache.insert(
            key,
            value.clone(),
        );

        Ok(Translation::new(
            value,
            TranslationSource::Online,
        ))
    }

    pub async fn translate_text(
        &self,
        text: impl AsRef<str>,
        from: impl AsRef<str>,
        to: impl AsRef<str>,
    ) -> Result<String, TranslationError> {
        Ok(
            self.translate(text, from, to)
                .await?
                .text
        )
    }

    // ========================================================================
    // Word
    // ========================================================================

    pub async fn translate_word(
        &self,
        word: impl AsRef<str>,
        from: impl AsRef<str>,
        to: impl AsRef<str>,
    ) -> Result<Translation, TranslationError> {
        self.translate(word, from, to).await
    }

    // ========================================================================
    // Batch
    // ========================================================================

    pub async fn translate_batch(
        &self,
        texts: &[String],
        from: impl AsRef<str>,
        to: impl AsRef<str>,
    ) -> Result<Vec<Translation>, TranslationError> {
        if texts.is_empty() {
            return Ok(Vec::new());
        }

        let mode = self.mode().await;
        if matches!(mode, TranslationMode::OnlineFirst | TranslationMode::OfflineFirst) {
            let mut translations = Vec::with_capacity(texts.len());
            for text in texts {
                translations.push(self.translate(text, from.as_ref(), to.as_ref()).await?);
            }
            return Ok(translations);
        }

        let from = normalize_language(from.as_ref());
        let to = normalize_language(to.as_ref());

        let mut result =
            vec![None; texts.len()];

        let mut pending = Vec::new();

        // --------------------------------------------------------------------
        // Cache + local
        // --------------------------------------------------------------------

        for (index, text) in texts.iter().enumerate() {
            let text = text.trim();

            if text.is_empty() {
                result[index] = Some(
                    Translation::new(
                        "",
                        TranslationSource::LocalDictionary,
                    )
                );

                continue;
            }

            let key = CacheKey::new(
                &from,
                &to,
                text,
            );

            if let Some(value) =
                self.inner.cache.get(&key)
            {
                result[index] = Some(
                    Translation::new(
                        value,
                        TranslationSource::Cache,
                    )
                );

                continue;
            }

            let mode = self.mode().await;

            if mode != TranslationMode::OnlineOnly {
                let value = self.inner.local.translate(
                    text,
                    &from,
                    &to,
                )?;

                let translation = match value.translations.first() {
                    Some(v) => {
                        v
                    }
                    None => {
                        return Err(TranslationError::NotFound)
                    }
                };

                self.inner.cache.insert(
                    key.clone(),
                    translation.clone(),
                );

                result[index] = Some(
                    Translation::new(
                        translation,
                        TranslationSource::LocalDictionary,
                    )
                );

                continue;
            }

            pending.push(index);
        }

        if pending.is_empty() {
            return Ok(
                result
                    .into_iter()
                    .map(|item| {
                        item.expect(
                            "translation result missing",
                        )
                    })
                    .collect()
            );
        }

        if self.mode().await
            == TranslationMode::OfflineOnly
        {
            return Err(
                TranslationError::NotFound
            );
        }

        // --------------------------------------------------------------------
        // Online
        // --------------------------------------------------------------------

        for chunk in pending.chunks(
            self.inner.config.max_batch_size
        ) {
            let request = TranslationBatchRequest::new(
                chunk
                    .iter()
                    .map(|&index| texts[index].clone())
                    .collect(),
                &from,
                &to,
            );

            let translations =
                self.translate_online_batch(
                    request,
                )
                .await?;

            if translations.len() != chunk.len() {
                return Err(
                    TranslationError::BatchSizeMismatch {
                        expected: chunk.len(),
                        actual: translations.len(),
                    }
                );
            }

            for (
                position,
                &original_index,
            ) in chunk.iter().enumerate()
            {
                let value =
                    translations[position].clone();

                let key =
                    CacheKey::new(
                        &from,
                        &to,
                        &texts[original_index],
                    );

                self.inner.cache.insert(
                    key,
                    value.clone(),
                );

                result[original_index] =
                    Some(
                        Translation::new(
                            value,
                            TranslationSource::Online,
                        )
                    );
            }
        }

        Ok(
            result
                .into_iter()
                .map(|item| {
                    item.expect(
                        "translation result missing",
                    )
                })
                .collect()
        )
    }

    // ========================================================================
    // Context
    // ========================================================================

    pub async fn translate_with_context(
        &self,
        fragments: &[String],
        from: impl AsRef<str>,
        to: impl AsRef<str>,
    ) -> Result<Vec<Translation>, TranslationError> {
        if fragments.is_empty() {
            return Ok(Vec::new());
        }

        if fragments.len() == 1 {
            return Ok(vec![
                self.translate(
                    &fragments[0],
                    from,
                    to,
                )
                .await?
            ]);
        }

        let from = normalize_language(from.as_ref());
        let to = normalize_language(to.as_ref());

        let mut result =
            Vec::with_capacity(
                fragments.len()
            );

        for index in 0..fragments.len() {
            let current =
                fragments[index].trim();

            if current.is_empty() {
                result.push(
                    Translation::new(
                        "",
                        TranslationSource::LocalDictionary,
                    )
                );

                continue;
            }

            let request =
                if index == 0 {
                    current.to_owned()
                } else {
                    let previous =
                        fragments[index - 1]
                            .trim();

                    if previous.is_empty() {
                        current.to_owned()
                    } else {
                        format!(
                            "{previous}\n{current}"
                        )
                    }
                };

            let translation =
                self.translate(
                    &request,
                    &from,
                    &to,
                )
                .await?;

            result.push(
                Translation::new(
                    extract_last_line(
                        &translation.text
                    ),
                    translation.source,
                )
            );
        }

        Ok(result)
    }

    // ========================================================================
    // Providers
    // ========================================================================

    async fn translate_online(
        &self,
        text: &str,
        from: &str,
        to: &str,
    ) -> Result<String, TranslationError> {
        let request =
            TranslationRequest::new(
                text,
                from,
                to,
            );

        let mut last_error =
            TranslationError::NotFound;

        for provider in &self.inner.providers {
            if !provider.supports(
                from,
                to,
            ) {
                continue;
            }

            for attempt in 0
                ..=self.inner.config.max_retries
            {
                match provider
                    .translate(
                        request.clone()
                    )
                    .await
                {
                    Ok(value)
                        if !value.trim().is_empty() =>
                    {
                        return Ok(value);
                    }

                    Ok(_) => {
                        last_error =
                            TranslationError::InvalidResponse(
                                format!(
                                    "{} returned empty result",
                                    provider.name()
                                ),
                            );
                    }

                    Err(error) => {
                        last_error = error;
                    }
                }

                if attempt
                    < self.inner.config.max_retries
                {
                    sleep(
                        self.inner
                            .config
                            .retry_delay
                    )
                    .await;
                }
            }
        }

        Err(last_error)
    }

    async fn translate_online_batch(
        &self,
        request: TranslationBatchRequest,
    ) -> Result<Vec<String>, TranslationError> {
        let mut last_error =
            TranslationError::NotFound;

        for provider in &self.inner.providers {
            if !provider.supports(
                &request.source_language,
                &request.target_language,
            ) {
                continue;
            }

            match provider
                .translate_batch(
                    request.clone()
                )
                .await
            {
                Ok(result)
                    if result.len() == request.texts.len() =>
                {
                    return Ok(result);
                }

                Ok(result) => {
                    last_error =
                        TranslationError::BatchSizeMismatch {
                            expected: request.texts.len(),
                            actual: result.len(),
                        };
                }

                Err(error) => {
                    last_error = error;
                }
            }
        }

        Err(last_error)
    }
}

fn extract_last_line(
    text: &str,
) -> String {
    text.lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .last()
        .unwrap_or(text.trim())
        .to_owned()
}
