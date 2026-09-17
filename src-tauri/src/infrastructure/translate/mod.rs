mod cache;
mod provider;
mod service;
mod types;
mod local;
mod providers;

use std::{sync::Arc, time::Duration};

pub use provider::TranslationProvider;
pub use service::{
    TranslationConfig,
    TranslationService,
};
pub use types::{
    Translation,
    TranslationBatchRequest,
    TranslationError,
    TranslationMode,
    TranslationRequest,
    TranslationSource,
};

use crate::infrastructure::translate::providers::google::GoogleProvider;

pub fn create_translation_service()
    -> Result<TranslationService, Box<dyn std::error::Error>>
{
    let client = reqwest::Client::builder()
        .no_proxy()
        .timeout(Duration::from_secs(10))
        .pool_max_idle_per_host(8)
        .tcp_keepalive(Duration::from_secs(30))
        .user_agent("Langi/1.0")
        .build()?;

    let google =
        Arc::new(
            GoogleProvider::new(client)
        );

    let mut config =
        TranslationConfig::default();

    config.mode =
        TranslationMode::OnlineFirst;

    TranslationService::new(
        config,
        vec![google],
    )
    .map_err(Into::into)
}
