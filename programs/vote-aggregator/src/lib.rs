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

    pub fn create_root<'a, 'b, 'c, 'info>(ctx: Context<'a, 'b, 'c, 'info, CreateRoot<'info>>) -> Result<()> {
        ctx.accounts.process(ctx.remaining_accounts, ctx.bumps)
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
}
