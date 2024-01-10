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

#[event]
pub struct ClanMemberLeft {
    pub clan: Pubkey,
    pub member: Pubkey,
    pub root: Pubkey,
    pub owner: Pubkey,
}

#[event]
pub struct ClanVotingDelegateChanged {
    pub clan: Pubkey,
    pub new_voting_delegate: Option<Pubkey>,
    pub old_voting_delegate: Option<Pubkey>,
}