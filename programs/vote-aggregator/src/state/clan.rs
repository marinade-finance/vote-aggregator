use anchor_lang::prelude::*;

#[derive(Clone, AnchorSerialize, AnchorDeserialize, Default)]
pub struct ClanBumps {
    pub voter_authority: u8,
    pub token_owner_record: u8,
    pub voter_weight_record: u8,
}

#[account]
#[derive(Default)]
pub struct Clan {
    pub root: Pubkey,
    pub owner: Pubkey,
    pub delegate: Pubkey,
    pub voter_authority: Pubkey,
    pub token_owner_record: Pubkey,
    pub voter_weight_record: Pubkey,
    pub min_voting_weight_to_join: u64,
    pub bumps: ClanBumps,
    pub active_members: u64,
    pub leaving_members: u64,
    pub potential_voting_weight: u64, // Including leaving members
    pub name: String,
    pub description: String,
}

impl Clan {
    pub const SPACE: usize = 8 + std::mem::size_of::<Self>();
    pub const VOTER_AUTHORITY_SEED: &'static [u8] = b"voter-authority";
}
