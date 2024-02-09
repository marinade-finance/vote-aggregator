use anchor_lang::prelude::*;
use spl_governance_addin_api::voter_weight::VoterWeightRecord;

use super::MaxVoterWeightRecord;
use crate::events::{member::MemberVoterWeightChanged, root::MaxVoterWeightChanged};
use crate::error::Error;

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
    pub voter_weight_record: Pubkey,
    pub voter_weight: u64,
    pub voter_weight_expiry: Option<u64>, // Only None is supported for now
    pub bumps: MemberBumps,
}

impl Member {
    pub const SPACE: usize = 8 + std::mem::size_of::<Self>();
    pub const ADDRESS_SEED: &'static [u8] = b"member";
    pub const NO_CLAN: Pubkey = Pubkey::new_from_array([0u8; 32]); // same as Pubkey::default()
    pub const NOT_LEAVING_CLAN: i64 = i64::MAX;

    pub fn update_voter_weight(
        &mut self,
        member_key: Pubkey,
        root_key: Pubkey,
        member_vwr: &VoterWeightRecord,
        max_vwr: &mut MaxVoterWeightRecord,
    ) -> Result<()> {
        if let Some(voter_weight_expiry) = member_vwr.voter_weight_expiry {
            let clock = Clock::get()?;
            require!(voter_weight_expiry >= clock.slot, Error::VoterWeightExpired);
        }
        require!(
            member_vwr.weight_action.is_none(),
            Error::UnexpectedWeightAction
        );
        require!(
            member_vwr.weight_action_target.is_none(),
            Error::UnexpectedWeightActionTarget
        );
        let old_member_voter_weight = self.voter_weight;
        let old_max_voter_weight = max_vwr.max_voter_weight;
        max_vwr.max_voter_weight -= old_member_voter_weight;
        self.voter_weight = member_vwr.voter_weight;
        self.voter_weight_expiry = member_vwr.voter_weight_expiry;
        max_vwr.max_voter_weight += member_vwr.voter_weight;

        emit!(MemberVoterWeightChanged {
            member: member_key,
            root: self.root.key(),
            old_voter_weight: old_member_voter_weight,
            new_voter_weight: self.voter_weight
        });
        emit!(MaxVoterWeightChanged {
            root: root_key,
            old_max_voter_weight,
            new_max_voter_weight: max_vwr.max_voter_weight
        });

        Ok(())
    }
}
