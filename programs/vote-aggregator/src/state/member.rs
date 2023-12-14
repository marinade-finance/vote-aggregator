use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct MemberBumps {
    pub address: u8,
    pub token_owner_record: u8,
}

#[account]
#[derive(Default)]
pub struct Member {
    pub root: Pubkey,     // 8
    pub owner: Pubkey,    // 40
    pub delegate: Pubkey, // 72
    pub clan: Pubkey,     // 104
    pub clan_leaving_time: i64,
    pub token_owner_record: Pubkey,
    pub voter_weight: u64,
    pub voter_weight_expiry: Option<u64>, // Only None is supported for now
    pub bumps: MemberBumps,
}

impl Member {
    pub const SPACE: usize = 8 + std::mem::size_of::<Self>();
    pub const ADDRESS_SEED: &'static [u8] = b"member";
}
