use anchor_lang::prelude::*;
use spl_governance::addins::voter_weight::get_voter_weight_record_data;

use crate::error::Error;
use crate::events::clan::ClanVoterWeightChanged;
use crate::events::member::MemberVoterWeightChanged;
use crate::events::root::MaxVoterWeightChanged;
use crate::state::{Clan, MaxVoterWeightRecord, Member, Root, VoterWeightRecord};

#[derive(Accounts)]
pub struct SetVoterWeightRecord<'info> {
    #[account(
        mut,
        has_one = root,
    )]
    member: Account<'info, Member>,

    #[account(
        constraint = member_authority.key() == member.owner ||
            member_authority.key() == member.delegate
        @ Error::WrongMemberAuthority
    )]
    member_authority: Signer<'info>,

    /// CHECK: dynamic owner
    #[account(
        owner = root.voting_weight_plugin,
    )]
    member_voter_weight_record: UncheckedAccount<'info>,

    root: Account<'info, Root>,
    #[account(
        mut,
        seeds = [
            MaxVoterWeightRecord::ADDRESS_SEED,
            &root.key().to_bytes()
        ],
        bump = root.bumps.max_voter_weight,
    )]
    max_voter_weight_record: Account<'info, MaxVoterWeightRecord>,

    #[account(
        mut,
        has_one = root,
        address = member.clan,
    )]
    clan: Option<Account<'info, Clan>>,
    #[account(
        mut,
        seeds = [
            VoterWeightRecord::ADDRESS_SEED,
            &clan.as_ref().unwrap().key().to_bytes()
        ],
        bump = clan.as_ref().unwrap().bumps.voter_weight_record,
    )]
    clan_voter_weight_record: Option<Account<'info, VoterWeightRecord>>,
}

impl<'info> SetVoterWeightRecord<'info> {
    pub fn process(&mut self) -> Result<()> {
        let vwr = get_voter_weight_record_data(
            &self.root.voting_weight_plugin,
            &self.member_voter_weight_record,
        )
        .map_err(|e| {
            ProgramErrorWithOrigin::from(e).with_account_name("member_voter_weight_record")
        })?;
        /* TODO
        require!(
            vwr.voter_weight_expiry.is_none(),
            Error::VoterWeightExpiryIsNotImplemented
        );
        */
        require_keys_eq!(vwr.realm, self.root.realm);
        require_keys_eq!(vwr.governing_token_mint, self.root.governing_token_mint);
        require_keys_eq!(vwr.governing_token_owner, self.member.owner);

        if self.member.clan != Pubkey::default() {
            let clan = self.clan.as_mut().ok_or(error!(Error::ClanIsRequired))?;
            if self.member.clan_leaving_time == Member::NOT_LEAVING_CLAN {
                let clan_voter_weight_record = self
                    .clan_voter_weight_record
                    .as_mut()
                    .ok_or(error!(Error::ClanVoterWeightRecordIsRequired))?;
                let old_clan_voter_weight = clan_voter_weight_record.voter_weight;
                clan_voter_weight_record.voter_weight -= self.member.voter_weight;
                clan_voter_weight_record.voter_weight += vwr.voter_weight;
                emit!(ClanVoterWeightChanged {
                    clan: clan.key(),
                    root: self.root.key(),
                    old_voter_weight: old_clan_voter_weight,
                    new_voter_weight: clan_voter_weight_record.voter_weight
                });
            }
            clan.potential_voter_weight -= self.member.voter_weight;
            clan.potential_voter_weight += vwr.voter_weight;
        }

        let old_max_voter_weight = self.max_voter_weight_record.max_voter_weight;
        self.max_voter_weight_record.max_voter_weight -= self.member.voter_weight;
        self.max_voter_weight_record.max_voter_weight += vwr.voter_weight;
        emit!(MaxVoterWeightChanged {
            root: self.root.key(),
            old_max_voter_weight,
            new_max_voter_weight: self.max_voter_weight_record.max_voter_weight
        });
        let old_member_voter_weight = self.member.voter_weight;
        self.member.voter_weight_record = self.member_voter_weight_record.key();
        self.member.voter_weight = vwr.voter_weight;
        self.member.voter_weight_expiry = vwr.voter_weight_expiry;
        emit!(MemberVoterWeightChanged {
            member: self.member.key(),
            root: self.root.key(),
            old_voter_weight: old_member_voter_weight,
            new_voter_weight: self.member.voter_weight
        });

        Ok(())
    }
}