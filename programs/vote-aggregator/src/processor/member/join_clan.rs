use anchor_lang::{prelude::*, system_program};
use spl_governance::{
    addins::voter_weight::get_voter_weight_record_data_for_token_owner_record,
    instruction::set_token_owner_record_lock, solana_program::program::invoke_signed,
    state::token_owner_record::get_token_owner_record_data_for_realm_and_governing_mint,
    PROGRAM_AUTHORITY_SEED,
};

use crate::{
    error::Error,
    events::clan::ClanMemberAdded,
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
        mut,
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
    clan_vwr: Box<Account<'info, VoterWeightRecord>>,

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
        address = member.token_owner_record,
    )]
    member_tor: UncheckedAccount<'info>,

    /// CHECK: dynamic owner
    #[account(
        owner = root.voting_weight_plugin,
    )]
    member_vwr: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            MaxVoterWeightRecord::ADDRESS_SEED,
            &root.key().to_bytes()
        ],
        bump = root.bumps.max_voter_weight,
    )]
    max_vwr: Account<'info, MaxVoterWeightRecord>,

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
        let member_tor = get_token_owner_record_data_for_realm_and_governing_mint(
            &self.root.governance_program,
            &self.member_tor.to_account_info(),
            &self.root.realm,
            &self.root.governing_token_mint,
        )
        .map_err(|e| ProgramErrorWithOrigin::from(e).with_account_name("member_tor"))?;
        require_keys_eq!(member_tor.governing_token_owner, self.member.owner);
        let new_member_vwr = get_voter_weight_record_data_for_token_owner_record(
            &self.root.voting_weight_plugin,
            &self.member_vwr,
            &member_tor,
        )
        .map_err(|e| ProgramErrorWithOrigin::from(e).with_account_name("member_vwr"))?;

        require_gte!(
            new_member_vwr.voter_weight,
            self.clan.min_voting_weight_to_join
        );
        invoke_signed(
            &set_token_owner_record_lock(
                &self.governance_program.key(),
                self.realm.key,
                self.member_tor.key,
                self.lock_authority.key,
                self.payer.key,
                0,
                None,
            ),
            &[
                self.governance_program.to_account_info(),
                self.realm.to_account_info(),
                self.realm_config.to_account_info(),
                self.member_tor.to_account_info(),
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

        let clock = Clock::get()?;
        self.root.update_next_voter_weight_reset_time(&clock);
        self.clan
            .reset_voter_weight_if_needed(&mut self.root, &mut self.clan_vwr);
        Clan::update_member(
            &mut self.clan,
            &self.member,
            Some(&new_member_vwr),
            &mut self.clan_vwr,
            false,
            true,
            &clock,
        )?;

        Member::update_voter_weight(
            &mut self.member,
            self.member_vwr.key(),
            &new_member_vwr,
            &mut self.max_vwr,
        )?;
        self.member.next_voter_weight_reset_time = self.root.next_voter_weight_reset_time;
        self.member.clan = self.clan.key();

        emit!(ClanMemberAdded {
            clan: self.clan.key(),
            member: self.member.key(),
            root: self.root.key(),
            owner: self.member.owner,
        });

        Ok(())
    }
}
