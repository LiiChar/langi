use async_trait::async_trait;

use super::types::{
    TranslationBatchRequest,
    TranslationError,
    TranslationRequest,
};

#[async_trait]
pub trait TranslationProvider: Send + Sync {
    fn name(&self) -> &'static str;

    fn supports(
        &self,
        source_language: &str,
        target_language: &str,
    ) -> bool;

    async fn translate(
        &self,
        request: TranslationRequest,
    ) -> Result<String, TranslationError>;

    async fn translate_batch(
        &self,
        request: TranslationBatchRequest,
    ) -> Result<Vec<String>, TranslationError> {
        let mut result = Vec::with_capacity(request.texts.len());

        for text in request.texts {
            result.push(
                self.translate(
                    TranslationRequest::new(
                        text,
                        &request.source_language,
                        &request.target_language,
                    ),
                )
                .await?,
            );
        }

        Ok(result)
    }
}
