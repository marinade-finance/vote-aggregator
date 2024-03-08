use anchor_lang::prelude::*;
use spl_governance::addins::voter_weight::get_voter_weight_record_data;

use crate::state::{MaxVoterWeightRecord, Member, Root};

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
}

impl<'info> UpdateVoterWeight<'info> {
    pub fn process<'c: 'info>(&mut self, rest: &'c [AccountInfo<'info>]) -> Result<()> {
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
        for (mut chunk, entry) in self.member.load_clan_chunks(rest, |_| true)? {
            self.member.refresh_membership(
                &mut self.root,
                entry,
                &mut chunk,
                &new_member_vwr,
                &clock,
            )?;
            chunk.exit(&crate::ID)?;
        }

        Member::update_voter_weight(
            &mut self.member,
            self.member_vwr.key(),
            &new_member_vwr,
            &mut self.max_vwr,
        )?;
        self.member.next_voter_weight_reset_time = self.root.next_voter_weight_reset_time();

        Ok(())
    }
}
