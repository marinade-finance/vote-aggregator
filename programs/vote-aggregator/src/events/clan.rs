use anchor_lang::prelude::*;

#[event]
pub struct ClanCreated {
    pub clan: Pubkey,
    pub root: Pubkey,
    pub clan_index: u64,
    pub owner: Pubkey,
}

#[event]
pub struct ClanOwnerChanged {
    pub clan: Pubkey,
    pub old_owner: Pubkey,
    pub new_owner: Pubkey,
}

#[event]
pub struct ClanResized {
    pub clan: Pubkey,
    pub new_size: u32,
}

#[event]
pub struct ClanNameChanged {
    pub clan: Pubkey,
    pub old_name: String,
    pub new_name: String,
}

#[event]
pub struct ClanDescriptionChanged {
    pub clan: Pubkey,
    pub old_description: String,
    pub new_description: String,
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