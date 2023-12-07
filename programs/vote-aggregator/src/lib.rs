use anchor_lang::prelude::*;

pub mod error;
pub mod events;
pub mod processor;
pub mod state;

use processor::*;

declare_id!("DDN7fpM4tY3ZHdgSuf8B4UBMakh4kqPzuDZHxgVyyNg");

#[program]
pub mod vote_aggregator {
    use super::*;

    pub fn create_root<'a, 'b, 'c, 'info>(ctx: Context<'a, 'b, 'c, 'info, CreateRoot<'info>>) -> Result<()> {
        ctx.accounts.process(ctx.remaining_accounts, ctx.bumps)
    }
}
