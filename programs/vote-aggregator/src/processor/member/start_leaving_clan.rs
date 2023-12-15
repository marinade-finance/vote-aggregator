use anchor_lang::prelude::*;

use crate::{
    error::Error,
    state::{Clan, Member, Root, VoterWeightRecord}, events::{clan::ClanVoterWeightChanged, member::StartingLeavingClan},
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
    pub member: Account<'info, Member>,
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
    #[account(
        constraint = member_authority.key() == member.owner ||
            member_authority.key() == member.delegate
        @ Error::WrongMemberAuthority
    )]
    pub member_authority: Signer<'info>,
}

impl<'info> StartLeavingClan<'info> {
    pub fn process(&mut self) -> Result<()> {
        let clock = Clock::get()?;
        self.member.clan_leaving_time =
            clock.unix_timestamp + i64::try_from(self.root.max_proposal_lifetime).unwrap();
        self.clan.active_members -= 1;
        self.clan.leaving_members += 1;
        let old_clan_voter_weight = self.clan_voter_weight_record.voter_weight;
        self.clan_voter_weight_record.voter_weight -= self.member.voter_weight;
        emit!(StartingLeavingClan {
            member: self.member.key(),
            clan: self.clan.key(),
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
