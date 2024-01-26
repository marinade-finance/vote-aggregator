use anchor_lang::{prelude::*, solana_program::program::invoke_signed, system_program};

use anchor_spl::token::Mint;
use spl_governance::{
    instruction::{cast_vote, relinquish_vote},
    state::vote_record::get_vote_record_data,
    PROGRAM_AUTHORITY_SEED,
};

use crate::events::clan::ProposalVoteUpdated;
use crate::state::{Clan, Root, VoterWeightRecord};

#[derive(Accounts)]
pub struct UpdateProposalVote<'info> {
    #[account(
        mut,
        has_one = root,
        has_one = token_owner_record,
    )]
    clan: Box<Account<'info, Clan>>,
    #[account(
        has_one = realm,
        has_one = governing_token_mint,
        has_one = governance_program,
    )]
    root: Box<Account<'info, Root>>,
    /// CHECK: dynamic owner
    #[account(
        mut,
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
    governing_token_mint: Box<Account<'info, Mint>>,
    /// CHECK: dynamic owner
    #[account(
        mut,
        owner = governance_program.key(),
    )]
    governance: UncheckedAccount<'info>,
    /// CHECK: dynamic owner
    #[account(
        mut,
        owner = governance_program.key(),
    )]
    proposal: UncheckedAccount<'info>,
    /// CHECK: dynamic owner
    #[account(
        mut,
        owner = governance_program.key(),
    )]
    proposal_owner_record: UncheckedAccount<'info>,
    /// CHECK: PDA
    #[account(
        seeds = [
            Clan::VOTER_AUTHORITY_SEED,
            &clan.key().to_bytes()
        ],
        bump = clan.bumps.voter_authority,
    )]
    voter_authority: UncheckedAccount<'info>,
    /// CHECK: dynamic owner
    #[account(
        mut,
        owner = governance_program.key(),
        seeds = [
            PROGRAM_AUTHORITY_SEED,
            &realm.key.to_bytes(),
            &root.governing_token_mint.key().to_bytes(),
            &voter_authority.key.to_bytes(),
        ],
        seeds::program = root.governance_program,
        bump = clan.bumps.token_owner_record
    )]
    token_owner_record: UncheckedAccount<'info>,
    #[account(
        seeds = [
            VoterWeightRecord::ADDRESS_SEED,
            &clan.key().to_bytes()
        ],
        bump = clan.bumps.voter_weight_record,
    )]
    clan_voter_weight_record: Box<Account<'info, VoterWeightRecord>>,
    /// CHECK: CPI
    max_voter_weight: UncheckedAccount<'info>,
    /// CHECK: dynamic owner
    #[account(
        mut,
        owner = governance_program.key(),
        seeds = [
            PROGRAM_AUTHORITY_SEED,
            &proposal.key.to_bytes(),
            &token_owner_record.key.to_bytes()],
        bump,
        seeds::program = governance_program.key(),
    )]
    vote_record: UncheckedAccount<'info>,
    #[account(
        mut,
        owner = system_program::ID,
    )]
    payer: Signer<'info>,

    system_program: Program<'info, System>,
    /// CHECK: program
    #[account(executable)]
    governance_program: UncheckedAccount<'info>,
}

impl<'info> UpdateProposalVote<'info> {
    pub fn process(&mut self) -> Result<()> {
        let vote_record = get_vote_record_data(
            self.governance_program.key,
            &self.vote_record.to_account_info(),
        )
        .map_err(|e| {
            ProgramErrorWithOrigin::from(e)
                .with_source(source!())
                .with_account_name("vote_record")
        })?;
        if vote_record.voter_weight == self.clan_voter_weight_record.voter_weight {
            msg!("Already up to date");
            return Ok(());
        }
        let old_voting_weight = vote_record.voter_weight;
        let vote = vote_record.vote;
        invoke_signed(
            &relinquish_vote(
                self.governance_program.key,
                self.realm.key,
                self.governance.key,
                self.proposal.key,
                self.token_owner_record.key,
                &self.governing_token_mint.key(),
                Some(self.voter_authority.key()),
                Some(self.payer.key()),
            ),
            &[
                self.governance_program.to_account_info(),
                self.realm.to_account_info(),
                self.governance.to_account_info(),
                self.proposal.to_account_info(),
                self.token_owner_record.to_account_info(),
                self.vote_record.to_account_info(),
                self.governing_token_mint.to_account_info(),
                self.voter_authority.to_account_info(),
                self.payer.to_account_info(),
            ],
            &[&[
                Clan::VOTER_AUTHORITY_SEED,
                &self.clan.key().to_bytes(),
                &[self.clan.bumps.voter_authority],
            ]],
        )?;
        invoke_signed(
            &cast_vote(
                self.governance_program.key,
                self.realm.key,
                self.governance.key,
                self.proposal.key,
                self.proposal_owner_record.key,
                self.token_owner_record.key,
                self.voter_authority.key,
                &self.governing_token_mint.key(),
                self.payer.key,
                Some(self.clan_voter_weight_record.key()),
                Some(self.max_voter_weight.key()),
                vote,
            ),
            &[
                self.governance_program.to_account_info(),
                self.realm.to_account_info(),
                self.governance.to_account_info(),
                self.proposal.to_account_info(),
                self.proposal_owner_record.to_account_info(),
                self.token_owner_record.to_account_info(),
                self.voter_authority.to_account_info(),
                self.vote_record.to_account_info(),
                self.governing_token_mint.to_account_info(),
                self.payer.to_account_info(),
                self.system_program.to_account_info(),
                self.realm_config.to_account_info(),
                self.clan_voter_weight_record.to_account_info(),
                self.max_voter_weight.to_account_info(),
            ],
            &[&[
                Clan::VOTER_AUTHORITY_SEED,
                &self.clan.key().to_bytes(),
                &[self.clan.bumps.voter_authority],
            ]],
        )?;
        emit!(ProposalVoteUpdated {
            clan: self.clan.key(),
            proposal: self.proposal.key(),
            new_voting_weight: self.clan_voter_weight_record.voter_weight,
            old_voting_weight,
        });
        Ok(())
    }
}
