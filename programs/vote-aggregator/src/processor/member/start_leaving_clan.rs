use anchor_lang::prelude::*;

use crate::{
    error::Error,
    events::member::StartingLeavingClan,
    state::{Clan, Member, Root, VoterWeightRecord},
};

#[derive(Accounts)]
pub struct StartLeavingClan<'info> {
    #[account(
        mut,
        has_one = clan,
        has_one = root,
        constraint = member.clan_leaving_time == Member::NOT_LEAVING_CLAN
            @ Error::RerequestingLeavingClan,
    )]
    member: Account<'info, Member>,
    #[account(
        mut,
        has_one = root,
    )]
    clan: Account<'info, Clan>,
    #[account(mut)]
    root: Account<'info, Root>,
    #[account(
        mut,
        seeds = [
            VoterWeightRecord::ADDRESS_SEED,
            &clan.key().to_bytes()
        ],
        bump = clan.bumps.voter_weight_record,
    )]
    clan_vwr: Box<Account<'info, VoterWeightRecord>>,
    #[account(
        constraint = member_authority.key() == member.owner ||
            member_authority.key() == member.delegate
        @ Error::WrongMemberAuthority
    )]
    member_authority: Signer<'info>,
}

impl<'info> StartLeavingClan<'info> {
    pub fn process(&mut self) -> Result<()> {
        let clock = Clock::get()?;
        self.root.update_next_voter_weight_reset_time(&clock);
        self.clan
            .reset_voter_weight_if_needed(&mut self.root, &mut self.clan_vwr);
        Clan::update_member(
            &mut self.clan,
            &self.member,
            None,
            &mut self.clan_vwr,
            true,
            false, // Leaving the clan
            &clock,
        )?;
        self.member.clan_leaving_time =
            clock.unix_timestamp + i64::try_from(self.root.max_proposal_lifetime).unwrap();
        self.clan.leaving_members += 1;
        emit!(StartingLeavingClan {
            member: self.member.key(),
            clan: self.clan.key(),
            root: self.root.key(),
            owner: self.member.owner,
        });
        Ok(())
    }
}
