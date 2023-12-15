use anchor_lang::prelude::*;

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
    pub member: Account<'info, Member>,
    /// CHECK: in code
    #[account(
        mut,
        has_one = root,
    )]
    pub clan: Account<'info, Clan>,
    #[account(
        constraint = member_authority.key() == member.owner ||
            member_authority.key() == member.delegate
        @ Error::WrongMemberAuthority
    )]
    pub member_authority: Signer<'info>,
    pub root: Account<'info, Root>,
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

        emit!(ClanMemberLeft {
            member: self.member.key(),
            clan: self.clan.key(),
            root: self.root.key(),
            owner: self.member.owner,
        });
        Ok(())
    }
}
