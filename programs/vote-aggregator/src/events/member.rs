use anchor_lang::prelude::*;

#[event]
pub struct MemberCreated {
    pub member: Pubkey,
    pub root: Pubkey,
    pub member_index: u64,
    pub owner: Pubkey,
}
