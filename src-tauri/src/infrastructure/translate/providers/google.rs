use async_trait::async_trait;
use reqwest::Client;
use serde::Deserialize;

use crate::infrastructure::translate::{TranslationBatchRequest, TranslationError, TranslationProvider, TranslationRequest};


pub struct GoogleProvider {
    client: Client,
}

impl GoogleProvider {
    pub fn new(client: Client) -> Self {
        Self { client }
    }
}

#[async_trait]
impl TranslationProvider for GoogleProvider {
    fn name(&self) -> &'static str {
        "google"
    }

    fn supports(
        &self,
        _source_language: &str,
        _target_language: &str,
    ) -> bool {
        true
    }

    async fn translate(
        &self,
        request: TranslationRequest,
    ) -> Result<String, TranslationError> {
        let response = self
            .client
            .get("https://translate.googleapis.com/translate_a/single")
            .query(&[
                ("client", "gtx"),
                ("sl", request.source_language.as_str()),
                ("tl", request.target_language.as_str()),
                ("dt", "t"),
                ("dj", "1"),
                ("q", request.text.as_str()),
            ])
            .send()
            .await
            .map_err(|error| {
                eprintln!("Google request error: {error:?}");
                TranslationError::Network(error.to_string())
            })?;

        let status = response.status();

        if !status.is_success() {
            let message = response
                .text()
                .await
                .unwrap_or_default();

            return Err(TranslationError::Http {
                status: status.as_u16(),
                message,
            });
        }

        let body: GoogleResponse = response
            .json()
            .await
            .map_err(|error| {
                TranslationError::InvalidResponse(
                    error.to_string(),
                )
            })?;

        let result = body
            .sentences
            .unwrap_or_default()
            .into_iter()
            .filter_map(|sentence| sentence.trans)
            .collect::<String>();

        if result.trim().is_empty() {
            return Err(
                TranslationError::InvalidResponse(
                    "provider returned empty translation".into(),
                ),
            );
        }

        Ok(result)
    }

    async fn translate_batch(
        &self,
        request: TranslationBatchRequest,
    ) -> Result<Vec<String>, TranslationError> {
        if request.texts.is_empty() {
            return Ok(Vec::new());
        }

        const SEPARATOR: &str = "\n";

        let combined = request.texts.join(SEPARATOR);

        let translated = self
            .translate(
                TranslationRequest::new(
                    combined,
                    request.source_language,
                    request.target_language,
                ),
            )
            .await?;

        let parts = translated
            .lines()
            .map(str::trim)
            .map(str::to_owned)
            .collect::<Vec<_>>();

        if parts.len() != request.texts.len() {
            return Err(
                TranslationError::BatchSizeMismatch {
                    expected: request.texts.len(),
                    actual: parts.len(),
                },
            );
        }

        Ok(parts)
    }
}

#[derive(Debug, Deserialize)]
struct GoogleResponse {
    sentences: Option<Vec<GoogleSentence>>,
}

#[derive(Debug, Deserialize)]
struct GoogleSentence {
    trans: Option<String>,
}
