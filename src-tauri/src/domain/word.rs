#[derive(Debug, Clone)]
pub struct Word {
    pub id: String,
    pub lemma: String,
    pub translation: String,
    pub level: Option<String>,
}
