use std::{sync::Arc, time::Duration};

use crate::infrastructure::browser::{providers::gutenberg::GutenbergProvider, service::{BrowserService, ClientConfig}};

pub mod providers;
pub mod provider;
pub mod error;
pub mod service;
pub mod download;

pub fn create_browser_service()
    -> Result<BrowserService, Box<dyn std::error::Error>>
{
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .pool_max_idle_per_host(8)
        .tcp_keepalive(Duration::from_secs(30))
        .user_agent("Langi/1.0")
        .build()?;

    let google =
        Arc::new(
            GutenbergProvider::new(client)
        );

    let config =
        ClientConfig::default();

    Ok(BrowserService::new(
        config,
        vec![google],
    ))
}
