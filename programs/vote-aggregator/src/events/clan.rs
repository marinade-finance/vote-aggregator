use anchor_lang::prelude::*;

#[event]
pub struct ClanCreated {
    pub clan: Pubkey,
    pub root: Pubkey,
    pub clan_index: u64,
    pub owner: Pubkey,
}

#[event]
pub struct ClanMemberAdded {
    pub clan: Pubkey,
    pub member: Pubkey,
    pub root: Pubkey,
    pub owner: Pubkey,
}

#[event]
pub struct ClanVoterWeightChanged {
    pub clan: Pubkey,
    pub root: Pubkey,
    pub old_voter_weight: u64,
    pub new_voter_weight: u64,
}