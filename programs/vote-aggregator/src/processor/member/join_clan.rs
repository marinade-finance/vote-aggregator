use anchor_lang::{prelude::*, system_program};
use spl_governance::{
    addins::voter_weight::get_voter_weight_record_data_for_token_owner_record,
    instruction::set_token_owner_record_lock, solana_program::program::invoke_signed,
    state::token_owner_record::get_token_owner_record_data_for_realm_and_governing_mint,
    PROGRAM_AUTHORITY_SEED,
};

use crate::{
    error::Error,
    events::clan::{ClanMemberAdded, ClanVoterWeightChanged},
    state::{Clan, MaxVoterWeightRecord, Member, Root, VoterWeightRecord},
};

#[derive(Accounts)]
pub struct JoinClan<'info> {
    #[account(
        mut,
        has_one = root,
        constraint = member.clan == Pubkey::default() @ Error::AlreadyJoinedClan
    )]
    member: Account<'info, Member>,
    #[account(
        constraint = member_authority.key() == member.owner ||
            member_authority.key() == member.delegate
        @ Error::WrongMemberAuthority
    )]
    member_authority: Signer<'info>,

    #[account(
        mut,
        has_one = root,
    )]
    clan: Account<'info, Clan>,

    #[account(
        has_one = governance_program,
        has_one = realm,
    )]
    root: Account<'info, Root>,

    /// CHECK: PDA
    #[account(
        seeds = [
        Root::LOCK_AUTHORITY_SEED,
            &root.key().to_bytes()
        ],
        bump = root.bumps.lock_authority,
    )]
    lock_authority: UncheckedAccount<'info>,

    /// CHECK: dynamic owner
    #[account(
        owner = governance_program.key(),
    )]
    realm: UncheckedAccount<'info>,

    /// CHECK: dynamic owner
    #[account(
        owner = governance_program.key(),
        seeds = [
            b"realm-config",
            &realm.key.to_bytes()
        ],
        bump,
        seeds::program = governance_program.key(),
    )]
    realm_config: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            VoterWeightRecord::ADDRESS_SEED,
            &clan.key().to_bytes()
        ],
        bump = clan.bumps.voter_weight_record,
    )]
    clan_voter_weight_record: Box<Account<'info, VoterWeightRecord>>,

    /// CHECK: dynamic owner
    #[account(
        mut,
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

    #[account(
        mut,
        owner = system_program::ID
    )]
    payer: Signer<'info>,

    system_program: Program<'info, System>,
    /// CHECK: program
    #[account(executable)]
    governance_program: UncheckedAccount<'info>,
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

        require_gte!(vwr.voter_weight, self.clan.min_voting_weight_to_join);
        invoke_signed(
            &set_token_owner_record_lock(
                &self.governance_program.key(),
                self.realm.key,
                self.member_token_owner_record.key,
                self.lock_authority.key,
                self.payer.key,
                0,
                None,
            ),
            &[
                self.governance_program.to_account_info(),
                self.realm.to_account_info(),
                self.realm_config.to_account_info(),
                self.member_token_owner_record.to_account_info(),
                self.lock_authority.to_account_info(),
                self.payer.to_account_info(),
                self.system_program.to_account_info(),
            ],
            &[&[
                Root::LOCK_AUTHORITY_SEED,
                &self.root.key().to_bytes(),
                &[self.root.bumps.lock_authority],
            ]],
        )?;

        let old_clan_voter_weight = self.clan_voter_weight_record.voter_weight;

        let member_key = self.member.key();
        self.member.update_voter_weight(
            member_key,
            self.root.key(),
            &vwr,
            &mut self.max_voter_weight_record,
        )?;

        self.member.clan = self.clan.key();
        self.member.voter_weight_record = self.member_voter_weight_record.key();
        self.clan.active_members += 1;
        self.clan.potential_voter_weight += self.member.voter_weight;
        self.clan_voter_weight_record.voter_weight += self.member.voter_weight;

        emit!(ClanMemberAdded {
            clan: self.clan.key(),
            member: self.member.key(),
            root: self.root.key(),
            owner: self.member.owner,
        });
        emit!(ClanVoterWeightChanged {
            clan: self.clan.key(),
            root: self.root.key(),
            old_voter_weight: old_clan_voter_weight,
            new_voter_weight: self.clan_voter_weight_record.voter_weight
        });

        Ok(())
    }
}
