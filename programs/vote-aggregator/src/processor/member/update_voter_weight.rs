use anchor_lang::prelude::*;
use spl_governance::addins::voter_weight::get_voter_weight_record_data;

use crate::error::Error;
use crate::state::{Clan, VoterWeightRecord, MaxVoterWeightRecord, Member, Root};

#[derive(Accounts)]
pub struct UpdateVoterWeight<'info> {
    #[account(
        mut,
        has_one = root,
    )]
    member: Account<'info, Member>,

    /// CHECK: dynamic owner
    #[account(
        owner = root.voting_weight_plugin,
        address = member.voter_weight_record,
    )]
    member_vwr: UncheckedAccount<'info>,

    #[account(mut)]
    root: Account<'info, Root>,
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
    clan_vwr: Option<Account<'info, VoterWeightRecord>>,
}

impl<'info> UpdateVoterWeight<'info> {
    pub fn process(&mut self) -> Result<()> {
        let new_member_vwr =
            get_voter_weight_record_data(&self.root.voting_weight_plugin, &self.member_vwr)
                .map_err(|e| {
                    ProgramErrorWithOrigin::from(e).with_account_name("member_voter_weight_record")
                })?;
        require_keys_eq!(new_member_vwr.realm, self.root.realm);
        require_keys_eq!(
            new_member_vwr.governing_token_mint,
            self.root.governing_token_mint
        );
        require_keys_eq!(new_member_vwr.governing_token_owner, self.member.owner);

        let clock = Clock::get()?;
        self.root.update_next_voter_weight_reset_time(&clock);

        if self.member.clan != Pubkey::default()
            && self.member.clan_leaving_time == Member::NOT_LEAVING_CLAN
        {
            let clan = self.clan.as_mut().ok_or(error!(Error::ClanIsRequired))?;
            let clan_vwr = self
                .clan_vwr
                .as_mut()
                .ok_or(error!(Error::ClanVoterWeightRecordIsRequired))?;
            clan.reset_voter_weight_if_needed(&self.root, clan_vwr);
            Clan::update_member(
                clan,
                &self.member,
                Some(&new_member_vwr),
                clan_vwr,
                true, // keep membership
                true,
                &clock,
            )?;
        }

        Member::update_voter_weight(
            &mut self.member,
            self.member_vwr.key(),
            &new_member_vwr,
            &mut self.max_vwr,
        )?;
        self.member.next_voter_weight_reset_time = self.root.next_voter_weight_reset_time;

        Ok(())
    }
}
