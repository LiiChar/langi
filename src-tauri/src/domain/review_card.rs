pub struct ReviewCard {
    pub repetitions: u32,
    pub ease_factor: f32,
    pub interval_days: u32,
}

impl ReviewCard {
    pub fn answer_correct(mut self) -> Self {
        self.repetitions += 1;
        self.interval_days = match self.repetitions {
            1 => 1,
            2 => 3,
            _ => (self.interval_days as f32 * self.ease_factor) as u32,
        };
        self
    }
}
