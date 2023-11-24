use anchor_lang::prelude::*;

declare_id!("DDN7fpM4tY3ZHdgSuf8B4UBMakh4kqPzuDZHxgVyyNg");

#[program]
pub mod vote_aggregator {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
