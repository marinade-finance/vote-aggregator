use crate::{error::Error, events::clan::ClanVoterWeightChanged};
use anchor_lang::prelude::*;
use spl_governance_addin_api::voter_weight::VoterWeightRecord as SplVoterWeightRecord;

use super::{Member, Root, VoterWeightRecord};

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
    pub permanent_members: u64,
    pub temporary_members: u64,
    pub updated_temporary_members: u64,
    pub leaving_members: u64,
    pub accept_temporary_members: bool,
    pub permanent_voter_weight: u64, // not decaiying part
    pub next_voter_weight_reset_time: i64,
    pub name: String,
    pub description: String,
    pub bumps: ClanBumps,
}

impl Clan {
    pub const SPACE: usize = 8 + std::mem::size_of::<Self>();
    pub const VOTER_AUTHORITY_SEED: &'static [u8] = b"voter-authority";

    pub fn reset_voter_weight_if_needed(&mut self, root: &Root, clan_vwr: &mut VoterWeightRecord) {
        if self.next_voter_weight_reset_time < root.next_voter_weight_reset_time {
            self.next_voter_weight_reset_time = root.next_voter_weight_reset_time;
            clan_vwr.voter_weight = self.permanent_voter_weight;
            clan_vwr.voter_weight_expiry = None;
            self.updated_temporary_members = 0;
        }
    }

    pub fn update_member<'info>(
        clan: &mut Account<'info, Self>,
        member: &Member,
        // None is useful if we need to change membership without updating voter weight
        new_member_vwr: Option<&SplVoterWeightRecord>,
        clan_vwr: &mut VoterWeightRecord,
        was_member: bool,
        become_member: bool,
        clock: &Clock,
    ) -> Result<()> {
        if let Some(new_member_vwr) = new_member_vwr {
            require!(
                new_member_vwr.voter_weight_expiry.is_none() || clan.accept_temporary_members,
                Error::TemporaryMembersNotAllowed,
            );
        }

        // Not updating the member's VWR is the same as updating to the current values
        let new_member_voter_weight = if let Some(new_member_vwr) = new_member_vwr {
            new_member_vwr.voter_weight
        } else {
            member.voter_weight
        };
        let new_member_voter_weight_expiry = if let Some(new_member_vwr) = new_member_vwr {
            new_member_vwr.voter_weight_expiry
        } else {
            member.voter_weight_expiry
        };

        let old_clan_voter_weight = clan_vwr.voter_weight;
        let old_clan_voter_weight_expiry = clan_vwr.voter_weight_expiry;
        let old_permament_clan_voter_weight = clan.permanent_voter_weight;
        let is_outdated = member.voter_weight_expiry.is_some()
            && member.next_voter_weight_reset_time < clan.next_voter_weight_reset_time;
        // Update real vote weight
        if was_member && !is_outdated {
            // if temporary member was outdated
            // then it's power was already removed on clan reset
            clan_vwr.voter_weight -= member.voter_weight;
        }
        if become_member {
            clan_vwr.voter_weight += new_member_voter_weight;
        }
        // Update permanent vote weight
        if was_member && member.voter_weight_expiry.is_none() {
            clan.permanent_voter_weight -= member.voter_weight;
        }
        if become_member && new_member_voter_weight_expiry.is_none() {
            clan.permanent_voter_weight += new_member_voter_weight;
        }
        // Update member counts
        if was_member {
            if member.voter_weight_expiry.is_none() {
                clan.permanent_members -= 1;
            } else {
                clan.temporary_members -= 1;
                if !is_outdated {
                    // all outdates was already removed on clan reset
                    clan.updated_temporary_members -= 1;
                }
            }
        }
        if become_member {
            if new_member_voter_weight_expiry.is_none() {
                clan.permanent_members += 1;
            } else {
                clan.temporary_members += 1;
                // Counts as updated in any case
                clan.updated_temporary_members += 1;
            }
        }

        clan_vwr.voter_weight_expiry = if clan.permanent_voter_weight == clan_vwr.voter_weight {
            None
        } else {
            Some(clock.slot as i64)
        };

        emit!(ClanVoterWeightChanged {
            clan: clan.key(),
            root: clan.root,
            old_voter_weight: old_clan_voter_weight,
            new_voter_weight: clan_vwr.voter_weight,
            old_permament_voter_weight: old_permament_clan_voter_weight,
            new_permament_voter_weight: clan.permanent_voter_weight,
            old_is_permanent: old_clan_voter_weight_expiry.is_none(),
            new_is_permanent: clan_vwr.voter_weight_expiry.is_none(),
        });
        Ok(())
    }

    pub fn is_updated(&self) -> bool {
        let clock = Clock::get().unwrap();
        clock.unix_timestamp < self.next_voter_weight_reset_time
            && self.updated_temporary_members == self.temporary_members
    }
}
