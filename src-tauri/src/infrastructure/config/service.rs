use std::{
    fs,
    path::{Path, PathBuf},
    sync::{Arc, RwLock},
};

use crate::{domain::config::{Config, DownloadConfig, GeneralConfig, LearningConfig, ReaderConfig, TranslateConfig}, infrastructure::config::parser::ConfigParser};

use super::{
    error::ConfigError,
};

const CONFIG_FILE_NAME: &str = "config.toml";

#[derive(Clone)]
pub struct ConfigService {
    config: Arc<RwLock<Config>>,
    path: PathBuf,
}

impl ConfigService {
    pub fn new(path: impl Into<PathBuf>) -> Result<Self, ConfigError> {
        let path = path.into();

        let config = if path.exists() {
            Self::load_from_file(&path)?
        } else {
            Config::default()
        };

        config.validate()?;

        Ok(Self {
            config: Arc::new(RwLock::new(config)),
            path,
        })
    }

    pub fn load(path: impl Into<PathBuf>) -> Result<Self, ConfigError> {
        Self::new(path)
    }

    pub fn default_path(app_data_dir: impl Into<PathBuf>) -> PathBuf {
        app_data_dir.into().join(CONFIG_FILE_NAME)
    }

    pub fn get(&self) -> Config {
        self.config
            .read()
            .expect("config lock poisoned")
            .clone()
    }

    pub fn update(&self, config: Config) -> Result<(), ConfigError> {
        config.validate()?;

        {
            let mut current = self
                .config
                .write()
                .expect("config lock poisoned");

            *current = config;
        }

        self.save()
    }

    pub fn save(&self) -> Result<(), ConfigError> {
        let config = self.get();

        config.validate()?;

        Self::save_to_file(&self.path, &config)
    }

    pub fn reload(&self) -> Result<(), ConfigError> {
        let config = Self::load_from_file(&self.path)?;

        config.validate()?;

        let mut current = self
            .config
            .write()
            .expect("config lock poisoned");

        *current = config;

        Ok(())
    }

    pub fn reset(&self) -> Result<(), ConfigError> {
        let config = Config::default();

        config.validate()?;

        {
            let mut current = self
                .config
                .write()
                .expect("config lock poisoned");

            *current = config;
        }

        self.save()
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    fn load_from_file(path: &Path) -> Result<Config, ConfigError> {
        let content = fs::read_to_string(path)
            .map_err(|source| ConfigError::Read {
                path: path.to_path_buf(),
                source,
            })?;

        let config = ConfigParser::parse(&content)
            .map_err(|source| ConfigError::Parse {
                path: path.to_path_buf(),
                source,
            })?;

        Ok(config)
    }

    fn save_to_file(path: &Path, config: &Config) -> Result<(), ConfigError> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .map_err(|source| ConfigError::CreateDirectory {
                    path: parent.to_path_buf(),
                    source,
                })?;
        }

        let content = ConfigParser::serialize(config)?;

        let temp_path = path.with_extension("toml.tmp");

        fs::write(&temp_path, content)
            .map_err(|source| ConfigError::Write {
                path: temp_path.clone(),
                source,
            })?;

        fs::rename(&temp_path, path)
            .map_err(|source| ConfigError::Rename {
                from: temp_path,
                to: path.to_path_buf(),
                source,
            })?;

        Ok(())
    }

    pub fn update_general(
            &self,
            config: GeneralConfig,
        ) -> Result<(), ConfigError> {
            let updated = {
                let mut current = self
                    .config
                    .write()
                    .expect("config lock poisoned");

                current.general = config;
                current.clone()
            };

            updated.validate()?;
            Self::save_to_file(&self.path, &updated)?;

            Ok(())
        }

        pub fn update_download(
            &self,
            config: DownloadConfig,
        ) -> Result<(), ConfigError> {
            let updated = {
                let mut current = self
                    .config
                    .write()
                    .expect("config lock poisoned");

                current.download = config;
                current.clone()
            };

            updated.validate()?;
            Self::save_to_file(&self.path, &updated)?;

            Ok(())
        }

        pub fn update_translate(
            &self,
            config: TranslateConfig,
        ) -> Result<(), ConfigError> {
            let updated = {
                let mut current = self
                    .config
                    .write()
                    .expect("config lock poisoned");

                current.translate = config;
                current.clone()
            };

            updated.validate()?;
            Self::save_to_file(&self.path, &updated)?;

            Ok(())
        }

        pub fn update_reader(
            &self,
            config: ReaderConfig,
        ) -> Result<(), ConfigError> {
            let updated = {
                let mut current = self
                    .config
                    .write()
                    .expect("config lock poisoned");

                current.reader = config;
                current.clone()
            };

            updated.validate()?;
            Self::save_to_file(&self.path, &updated)?;

            Ok(())
        }

        pub fn update_learning(
            &self,
            config: LearningConfig,
        ) -> Result<(), ConfigError> {
            let updated = {
                let mut current = self
                    .config
                    .write()
                    .expect("config lock poisoned");

                current.learning = config;
                current.clone()
            };

            updated.validate()?;
            Self::save_to_file(&self.path, &updated)?;

            Ok(())
        }
}
