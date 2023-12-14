use anchor_lang::prelude::*;

#[event]
pub struct RootCreated {
    pub root: Pubkey,
    pub governance_program: Pubkey,
    pub realm: Pubkey,
    pub governing_token_mint: Pubkey,
    pub voting_weight_plugin: Option<Pubkey>,
}

#[event]
pub struct MaxVoterWeightChanged {
    pub root: Pubkey,
    pub old_max_voter_weight: u64,
    pub new_max_voter_weight: u64,
}