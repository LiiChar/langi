use dashmap::DashMap;
use std::time::{Duration, Instant};

use super::types::{normalize_language, TranslationError};

#[derive(Debug, Clone, Hash, PartialEq, Eq)]
pub struct CacheKey {
    pub source_language: String,
    pub target_language: String,
    pub text: String,
}

impl CacheKey {
    pub fn new(
        source_language: &str,
        target_language: &str,
        text: &str,
    ) -> Self {
        Self {
            source_language: normalize_language(source_language),
            target_language: normalize_language(target_language),
            text: normalize_text(text),
        }
    }
}

#[derive(Debug, Clone)]
struct CacheEntry {
    value: String,
    expires_at: Instant,
}

pub struct TranslationCache {
    entries: DashMap<CacheKey, CacheEntry>,
    ttl: Duration,
    max_entries: usize,
}

impl TranslationCache {
    pub fn new(
        ttl: Duration,
        max_entries: usize,
    ) -> Self {
        Self {
            entries: DashMap::new(),
            ttl,
            max_entries,
        }
    }

    pub fn get(&self, key: &CacheKey) -> Option<String> {
        let entry = self.entries.get(key)?;

        if entry.expires_at <= Instant::now() {
            drop(entry);
            self.entries.remove(key);

            return None;
        }

        Some(entry.value.clone())
    }

    pub fn insert(
        &self,
        key: CacheKey,
        value: String,
    ) {
        if value.trim().is_empty() {
            return;
        }

        self.cleanup();

        self.entries.insert(
            key,
            CacheEntry {
                value,
                expires_at: Instant::now() + self.ttl,
            },
        );
    }

    pub fn clear(&self) {
        self.entries.clear();
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    fn cleanup(&self) {
        if self.entries.len() < self.max_entries {
            return;
        }

        let now = Instant::now();

        self.entries
            .retain(|_, value| value.expires_at > now);

        while self.entries.len() >= self.max_entries {
            let Some(key) = self
                .entries
                .iter()
                .next()
                .map(|entry| entry.key().clone())
            else {
                break;
            };

            self.entries.remove(&key);
        }
    }
}

fn normalize_text(text: &str) -> String {
    text.trim()
        .to_lowercase()
}
