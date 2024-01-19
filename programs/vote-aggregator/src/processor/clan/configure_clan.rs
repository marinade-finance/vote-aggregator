use anchor_lang::prelude::*;

use crate::events::clan::{ClanDescriptionChanged, ClanNameChanged};
use crate::state::Clan;
use crate::error::Error;

#[derive(Accounts)]
pub struct ConfigureClan<'info> {
    #[account(
        mut,
    )]
    clan: Account<'info, Clan>,

    #[account(
        constraint = clan_authority.key() == clan.owner ||
            clan_authority.key() == clan.delegate
        @ Error::WrongClanAuthority,
    )]
    clan_authority: Signer<'info>,
}

impl <'info> ConfigureClan<'info> {
    pub fn set_name(&mut self, name: String) -> Result<()> {
        let old_name = self.clan.name.clone();
        self.clan.name = name.clone();
        emit!(ClanNameChanged {
            clan: self.clan.key(),
            old_name,
            new_name: name,
        });
        Ok(())
    }

    pub fn set_description(&mut self, description: String) -> Result<()> {
        let old_description = self.clan.description.clone();
        self.clan.description = description.clone();
        emit!(ClanDescriptionChanged {
            clan: self.clan.key(),
            old_description,
            new_description: description,
        });
        Ok(())
    }
}