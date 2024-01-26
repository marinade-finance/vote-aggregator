use anchor_lang::{prelude::*, solana_program::program::invoke_signed, system_program};

use anchor_spl::token::Mint;
use spl_governance::{
    instruction::{cancel_proposal, cast_vote, relinquish_vote},
    state::{
        governance::get_governance_data_for_realm, realm::get_realm_data_for_governing_token_mint,
        vote_record::get_vote_record_data,
    },
    PROGRAM_AUTHORITY_SEED,
};

use crate::events::clan::ProposalVoteUpdated;
use crate::state::{Clan, Root, VoterWeightRecord};

#[derive(Accounts)]
pub struct ForcedCancelProposal<'info> {
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

impl<'info> ForcedCancelProposal<'info> {
    pub fn process(&mut self) -> Result<()> {
        let realm = get_realm_data_for_governing_token_mint(
            self.governance_program.key,
            &self.realm.to_account_info(),
            &self.governing_token_mint.key(),
        )
        .map_err(|e| {
            ProgramErrorWithOrigin::from(e)
                .with_source(source!())
                .with_account_name("realm")
        })?;
        let governance = get_governance_data_for_realm(
            self.governance_program.key,
            &self.governance,
            self.realm.key,
        )
        .map_err(|e| {
            ProgramErrorWithOrigin::from(e)
                .with_source(source!())
                .with_account_name("governance")
        })?;
        let min_weight_to_create_proposal =
            if self.governing_token_mint.key() == realm.community_mint {
                governance.config.min_community_weight_to_create_proposal
            } else if Some(self.governing_token_mint.key()) == realm.config.council_mint {
                governance.config.min_council_weight_to_create_proposal
            } else {
                unreachable!("Mints changed")
            };
        require_gt!(
            min_weight_to_create_proposal,
            self.clan_voter_weight_record.voter_weight
        );
        invoke_signed(
            &cancel_proposal(
                self.governance_program.key,
                self.realm.key,
                self.governance.key,
                self.proposal.key,
                self.proposal_owner_record.key,
                self.voter_authority.key,
            ),
            &[
                self.governance_program.to_account_info(),
                self.realm.to_account_info(),
                self.governance.to_account_info(),
                self.proposal.to_account_info(),
                self.proposal_owner_record.to_account_info(),
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
        Ok(())
    }
}
