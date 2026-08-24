use crate::domain::WordRepository;

pub struct VocabularyService<R: WordRepository> {
    repo: R,
}

impl<R: WordRepository> VocabularyService<R> {
    pub fn add_word(&self, user_id: &str, lemma: &str) -> anyhow::Result<()> {
        let word = self
            .repo
            .find_by_lemma(lemma)?
            .ok_or_else(|| anyhow::anyhow!("Word not found"))?;

        self.repo.save_user_word(user_id, &word)?;
        Ok(())
    }
}
