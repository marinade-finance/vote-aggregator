use anchor_lang::prelude::*;
use spl_governance::{
    addins::voter_weight::get_voter_weight_record_data_for_token_owner_record,
    state::token_owner_record::get_token_owner_record_data_for_realm_and_governing_mint,
    PROGRAM_AUTHORITY_SEED,
};

use crate::{
    error::Error,
    events::{
        clan::{ClanMemberAdded, ClanVoterWeightChanged},
        member::MemberVoterWeightChanged,
        root::MaxVoterWeightChanged,
    },
    state::{Clan, MaxVoterWeightRecord, Member, Root, VoterWeightRecord},
};

#[derive(Accounts)]
pub struct JoinClan<'info> {
    #[account(
        mut,
        has_one = root,
        constraint = member.clan == Pubkey::default() @ Error::AlreadyJoinedClan
    )]
    pub member: Account<'info, Member>,
    #[account(
        constraint = member_authority.key() == member.owner ||
            member_authority.key() == member.delegate
        @ Error::WrongMemberAuthority
    )]
    pub member_authority: Signer<'info>,

    #[account(
        mut,
        has_one = root,
    )]
    pub clan: Account<'info, Clan>,

    pub root: Account<'info, Root>,

    #[account(
        mut,
        seeds = [
            VoterWeightRecord::ADDRESS_SEED,
            &clan.key().to_bytes()
        ],
        bump = clan.bumps.voter_weight_record,
    )]
    pub clan_voter_weight_record: Box<Account<'info, VoterWeightRecord>>,

    /// CHECK: dynamic owner
    #[account(
        seeds = [
            PROGRAM_AUTHORITY_SEED,
            &root.realm.to_bytes(),
            &root.governing_token_mint.to_bytes(),
            &member.owner.to_bytes(),
        ],
        seeds::program = root.governance_program,
        bump,
    )]
    member_token_owner_record: UncheckedAccount<'info>,

    /// CHECK: dynamic owner
    #[account(
        owner = root.voting_weight_plugin,
    )]
    member_voter_weight_record: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            MaxVoterWeightRecord::ADDRESS_SEED,
            &root.key().to_bytes()
        ],
        bump = root.bumps.max_voter_weight,
    )]
    max_voter_weight_record: Account<'info, MaxVoterWeightRecord>,
}

impl<'info> JoinClan<'info> {
    pub fn process(&mut self) -> Result<()> {
        let tor = get_token_owner_record_data_for_realm_and_governing_mint(
            &self.root.governance_program,
            &self.member_token_owner_record.to_account_info(),
            &self.root.realm,
            &self.root.governing_token_mint,
        )
        .map_err(|e| {
            ProgramErrorWithOrigin::from(e).with_account_name("member_token_owner_record")
        })?;
        require_keys_eq!(tor.governing_token_owner, self.member.owner);
        let vwr = get_voter_weight_record_data_for_token_owner_record(
            &self.root.voting_weight_plugin,
            &self.member_voter_weight_record,
            &tor,
        )
        .map_err(|e| {
            ProgramErrorWithOrigin::from(e).with_account_name("member_voter_weight_record")
        })?;
        require!(
            vwr.voter_weight_expiry.is_none(),
            Error::VoterWeightExpiryIsNotImplemented
        );
        require!(vwr.weight_action.is_none(), Error::UnexpectedWeightAction);
        require!(
            vwr.weight_action_target.is_none(),
            Error::UnexpectedWeightActionTarget
        );
        require_gte!(vwr.voter_weight, self.clan.min_voting_weight_to_join);
        let old_member_voter_weight = self.member.voter_weight;
        let old_clan_voter_weight = self.clan_voter_weight_record.voter_weight;
        let old_max_voter_weight = self.max_voter_weight_record.max_voter_weight;
        self.max_voter_weight_record.max_voter_weight -= old_member_voter_weight;
        self.member.voter_weight = vwr.voter_weight;
        self.max_voter_weight_record.max_voter_weight += self.member.voter_weight;
        // TODO: check expiry
        self.member.voter_weight_expiry = vwr.voter_weight_expiry;
        self.member.clan = self.clan.key();
        self.clan.active_members += 1;
        self.clan.potential_voter_weight += self.member.voter_weight;
        self.clan_voter_weight_record.voter_weight += self.member.voter_weight;

        emit!(ClanMemberAdded {
            clan: self.clan.key(),
            member: self.member.key(),
            root: self.root.key(),
            owner: self.member.owner,
        });
        emit!(MemberVoterWeightChanged {
            member: self.member.key(),
            root: self.root.key(),
            old_voter_weight: old_member_voter_weight,
            new_voter_weight: self.member.voter_weight
        });
        emit!(ClanVoterWeightChanged {
            clan: self.clan.key(),
            root: self.root.key(),
            old_voter_weight: old_clan_voter_weight,
            new_voter_weight: self.clan_voter_weight_record.voter_weight
        });
        emit!(MaxVoterWeightChanged {
            root: self.root.key(),
            old_max_voter_weight,
            new_max_voter_weight: self.max_voter_weight_record.max_voter_weight
        });

        Ok(())
    }
}
