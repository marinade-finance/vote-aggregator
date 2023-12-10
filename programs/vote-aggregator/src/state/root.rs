use anchor_lang::prelude::*;

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct RootBumps {
    pub root: u8,
    pub max_voter_weight: u8,
}

#[account]
pub struct Root {
    pub governance_program: Pubkey,          // 8
    pub realm: Pubkey,                       // 40
    pub governing_token_mint: Pubkey,        // 72
    pub voting_weight_plugin: Pubkey,        // 104
    pub max_proposal_lifetime: u64,
    pub bumps: RootBumps,
    pub clan_count: u64,
    pub member_count: u64,
}


impl Root {
    pub const SPACE: usize = 8 + std::mem::size_of::<Self>();
    pub const ADDRESS_SEED: &'static [u8] = b"root";
}
