
use crate::domain::config::{Config, DownloadConfig, ExercisesConfig, LearningConfig, ReaderConfig, ReviewConfig, TranslateConfig};

use super::error::ConfigError;

impl Config {
    pub fn validate(&self) -> Result<(), ConfigError> {
        self.download.validate()?;
        self.translate.validate()?;
        self.reader.validate()?;
        self.learning.validate()?;

        Ok(())
    }
}

impl DownloadConfig {
    pub fn validate(&self) -> Result<(), ConfigError> {
        if self.max_concurrent_downloads == 0 {
            return Err(ConfigError::Validation(
                "max_concurrent_downloads must be greater than 0".into(),
            ));
        }

        if self.request_timeout_secs == 0 {
            return Err(ConfigError::Validation(
                "download request timeout must be greater than 0".into(),
            ));
        }

        if self.max_book_size_mb == 0 {
            return Err(ConfigError::Validation(
                "max_book_size_mb must be greater than 0".into(),
            ));
        }

        Ok(())
    }
}

impl TranslateConfig {
    pub fn validate(&self) -> Result<(), ConfigError> {
        if self.source_language.trim().is_empty() {
            return Err(ConfigError::Validation(
                "source_language cannot be empty".into(),
            ));
        }

        if self.target_language.trim().is_empty() {
            return Err(ConfigError::Validation(
                "target_language cannot be empty".into(),
            ));
        }

        if self.online.batch_size == 0 {
            return Err(ConfigError::Validation(
                "translation batch_size must be greater than 0".into(),
            ));
        }

        if self.cache.ttl_secs == 0 {
            return Err(ConfigError::Validation(
                "translation cache ttl must be greater than 0".into(),
            ));
        }

        Ok(())
    }
}


impl ReaderConfig {
    pub fn validate(&self) -> Result<(), ConfigError> {
        if self.font_family.trim().is_empty() {
            return Err(ConfigError::Validation(
                "reader.font_family cannot be empty".into(),
            ));
        }

        if self.font_size == 0 {
            return Err(ConfigError::Validation(
                "reader.font_size must be greater than 0".into(),
            ));
        }

        if self.font_size > 100 {
            return Err(ConfigError::Validation(
                "reader.font_size cannot be greater than 100".into(),
            ));
        }

        if !self.line_height.is_finite() {
            return Err(ConfigError::Validation(
                "reader.line_height must be a finite number".into(),
            ));
        }

        if self.line_height <= 0.0 {
            return Err(ConfigError::Validation(
                "reader.line_height must be greater than 0".into(),
            ));
        }

        if self.line_height > 5.0 {
            return Err(ConfigError::Validation(
                "reader.line_height cannot be greater than 5".into(),
            ));
        }

        if self.content_width == 0 {
            return Err(ConfigError::Validation(
                "reader.content_width must be greater than 0".into(),
            ));
        }

        if self.content_width < 300 {
            return Err(ConfigError::Validation(
                "reader.content_width cannot be less than 300".into(),
            ));
        }

        if self.content_width > 3000 {
            return Err(ConfigError::Validation(
                "reader.content_width cannot be greater than 3000".into(),
            ));
        }

        if self.progress_save_interval_secs == 0 {
            return Err(ConfigError::Validation(
                "reader.progress_save_interval_secs must be greater than 0".into(),
            ));
        }

        Ok(())
    }
}

impl LearningConfig {
    pub fn validate(&self) -> Result<(), ConfigError> {
        self.exercises.validate()?;
        self.review.validate()?;

        Ok(())
    }
}

impl ExercisesConfig {
    pub fn validate(&self) -> Result<(), ConfigError> {
        if self.words_per_exercise == 0 {
            return Err(ConfigError::Validation(
                "learning.exercises.words_per_exercise must be greater than 0".into(),
            ));
        }

        if self.max_per_session == 0 {
            return Err(ConfigError::Validation(
                "learning.exercises.max_per_session must be greater than 0".into(),
            ));
        }

        if self.words_per_exercise > self.max_per_session {
            return Err(ConfigError::Validation(
                "learning.exercises.words_per_exercise cannot be greater than max_per_session"
                    .into(),
            ));
        }

        if !self.translation && !self.comprehension && self.enabled {
            return Err(ConfigError::Validation(
                "at least one learning exercise type must be enabled".into(),
            ));
        }

        Ok(())
    }
}

impl ReviewConfig {
    pub fn validate(&self) -> Result<(), ConfigError> {
        if self.initial_interval_days == 0 {
            return Err(ConfigError::Validation(
                "learning.review.initial_interval_days must be greater than 0".into(),
            ));
        }

        if self.max_interval_days == 0 {
            return Err(ConfigError::Validation(
                "learning.review.max_interval_days must be greater than 0".into(),
            ));
        }

        if self.initial_interval_days > self.max_interval_days {
            return Err(ConfigError::Validation(
                "learning.review.initial_interval_days cannot be greater than max_interval_days"
                    .into(),
            ));
        }

        if !self.known_word_threshold.is_finite() {
            return Err(ConfigError::Validation(
                "learning.review.known_word_threshold must be a finite number".into(),
            ));
        }

        if !(0.0..=1.0).contains(&self.known_word_threshold) {
            return Err(ConfigError::Validation(
                "learning.review.known_word_threshold must be between 0 and 1".into(),
            ));
        }

        Ok(())
    }
}
