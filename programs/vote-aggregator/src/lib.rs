use anchor_lang::prelude::*;

pub mod error;
pub mod events;
pub mod processor;
pub mod state;

use processor::*;

declare_id!("VoTaGDreyne7jk59uwbgRRbaAzxvNbyNipaJMrRXhjT");

#[program]
pub mod vote_aggregator {
    use super::*;

    pub fn create_root(ctx: Context<CreateRoot>) -> Result<()> {
        ctx.accounts.process(ctx.bumps)
    }

    pub fn update_root(ctx: Context<UpdateRoot>) -> Result<()> {
        ctx.accounts.process()
    }

    pub fn create_clan(ctx: Context<CreateClan>, owner: Pubkey) -> Result<()> {
        ctx.accounts.process(owner, ctx.bumps)
    }

    pub fn update_clan(ctx: Context<UpdateClan>) -> Result<()> {
        ctx.accounts.process()
    }

    pub fn set_clan_owner(ctx: Context<SetClanOwner>, owner: Pubkey) -> Result<()> {
        ctx.accounts.process(owner)
    }

    pub fn resize_clan(ctx: Context<ResizeClan>, size: u32) -> Result<()> {
        ctx.accounts.process(size)
    }

    pub fn set_clan_name(ctx: Context<ConfigureClan>, name: String) -> Result<()> {
        ctx.accounts.set_name(name)
    }

    pub fn set_clan_description(ctx: Context<ConfigureClan>, description: String) -> Result<()> {
        ctx.accounts.set_description(description)
    }

    pub fn update_proposal_vote(ctx: Context<UpdateProposalVote>) -> Result<()> {
        ctx.accounts.process()
    }

    pub fn forced_cancel_proposal(ctx: Context<ForcedCancelProposal>) -> Result<()> {
        ctx.accounts.process()
    }

    pub fn create_member(ctx: Context<CreateMember>) -> Result<()> {
        ctx.accounts.process(ctx.bumps)
    }

    pub fn join_clan(ctx: Context<JoinClan>) -> Result<()> {
        ctx.accounts.process()
    }

    pub fn start_leaving_clan(ctx: Context<StartLeavingClan>) -> Result<()> {
        ctx.accounts.process()
    }

    pub fn leave_clan(ctx: Context<LeaveClan>) -> Result<()> {
        ctx.accounts.process()
    }

    pub fn set_voting_delegate(
        ctx: Context<SetVotingDelegate>,
        new_voting_delegate: Pubkey,
    ) -> Result<()> {
        ctx.accounts.process(new_voting_delegate)
    }

    pub fn update_voter_weight(ctx: Context<UpdateVoterWeight>) -> Result<()> {
        ctx.accounts.process()
    }

    pub fn set_voter_weight_record(ctx: Context<SetVoterWeightRecord>) -> Result<()> {
        ctx.accounts.process()
    }
}
