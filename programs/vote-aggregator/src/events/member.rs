use anchor_lang::prelude::*;

#[event]
pub struct MemberCreated {
    pub member: Pubkey,
    pub root: Pubkey,
    pub member_index: u64,
    pub owner: Pubkey,
}

#[event]
pub struct MemberVoterWeightChanged {
    pub member: Pubkey,
    pub root: Pubkey,
    pub old_voter_weight: u64,
    pub new_voter_weight: u64,
}