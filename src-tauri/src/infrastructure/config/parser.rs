use crate::domain::config::Config;

use super::error::ConfigError;

pub struct ConfigParser;

impl ConfigParser {
    pub fn parse(content: &str) -> Result<Config, toml::de::Error> {
        toml::from_str(content)
    }

    pub fn serialize(config: &Config) -> Result<String, ConfigError> {
        toml::to_string_pretty(config)
            .map_err(ConfigError::Serialize)
    }
}
