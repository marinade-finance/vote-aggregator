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

    pub fn create_clan(ctx: Context<CreateClan>, owner: Pubkey) -> Result<()> {
        ctx.accounts.process(owner, ctx.bumps)
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
}
