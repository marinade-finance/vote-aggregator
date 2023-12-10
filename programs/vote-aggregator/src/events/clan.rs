use anchor_lang::prelude::*;

#[event]
pub struct ClanCreated {
    pub clan: Pubkey,
    pub root: Pubkey,
    pub clan_index: u64,
    pub owner: Pubkey,
}
