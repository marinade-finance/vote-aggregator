use anchor_lang::prelude::*;
use spl_governance::{
    instruction::remove_token_owner_record_lock, solana_program::program::invoke_signed,
    PROGRAM_AUTHORITY_SEED,
};

use crate::{
    error::Error,
    events::clan::ClanMemberLeft,
    state::{Clan, Member, Root},
};

#[derive(Accounts)]
pub struct LeaveClan<'info> {
    #[account(
        mut,
        has_one = root,
        has_one = clan,
        constraint = member.clan_leaving_time != Member::NOT_LEAVING_CLAN
            @ Error::UnexpectedLeavingClan
    )]
    member: Account<'info, Member>,
    #[account(
        mut,
        has_one = root,
    )]
    clan: Account<'info, Clan>,

    #[account(
        constraint = member_authority.key() == member.owner ||
            member_authority.key() == member.delegate
        @ Error::WrongMemberAuthority
    )]
    member_authority: Signer<'info>,

    /// CHECK: dynamic owner
    #[account(
        mut,
        seeds = [
            PROGRAM_AUTHORITY_SEED,
            &root.realm.to_bytes(),
            &root.governing_token_mint.to_bytes(),
            &member.owner.key().to_bytes(),
        ],
        seeds::program = governance_program.key(),
        bump = member.bumps.token_owner_record,
    )]
    member_token_owner_record: UncheckedAccount<'info>,

    #[account(
        has_one = governance_program,
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

    /// CHECK: program
    #[account(executable)]
    governance_program: UncheckedAccount<'info>,
}

impl<'info> LeaveClan<'info> {
    pub fn process(&mut self) -> Result<()> {
        let clock = Clock::get()?;
        require_gte!(
            clock.unix_timestamp,
            self.member.clan_leaving_time,
            Error::TooEarlyToLeaveClan
        );

        self.member.clan = Member::NO_CLAN;
        self.member.clan_leaving_time = Member::NOT_LEAVING_CLAN;
        self.clan.leaving_members -= 1;
        self.clan.potential_voter_weight -= self.member.voter_weight;

        invoke_signed(
            &remove_token_owner_record_lock(
                self.governance_program.key,
                self.member_token_owner_record.key,
                self.lock_authority.key,
                0,
            ),
            &[
                self.governance_program.to_account_info(),
                self.member_token_owner_record.to_account_info(),
                self.lock_authority.to_account_info(),
            ],
            &[&[
                Root::LOCK_AUTHORITY_SEED,
                &self.root.key().to_bytes(),
                &[self.root.bumps.lock_authority],
            ]],
        )?;

        emit!(ClanMemberLeft {
            member: self.member.key(),
            clan: self.clan.key(),
            root: self.root.key(),
            owner: self.member.owner,
        });
        Ok(())
    }
}
