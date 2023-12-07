use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke, system_program},
};
use anchor_spl::token::Mint;
use spl_governance::{
    instruction::set_realm_config,
    state::{
        realm::{self, GoverningTokenConfigAccountArgs},
        realm_config::get_realm_config_data_for_realm,
    },
    PROGRAM_AUTHORITY_SEED,
};

use crate::{
    error::Error,
    events::root::RootCreated,
    program::VoteAggregator,
    state::{
        root::{Root, RootBumps},
        MaxVoterWeightRecord,
    },
};
use anchor_lang::error::Error as AnchorError;

#[derive(Accounts)]
pub struct CreateRoot<'info> {
    #[account(
        init,
        seeds = [
            Root::ADDRESS_SEED,
            &realm.key.to_bytes(),
            &governing_token_mint.key().to_bytes()
        ],
        bump,
        payer = payer,
        space = Root::SPACE,
    )]
    root: Account<'info, Root>,

    /// CHECK: An spl-governance realm (dynamic owner ID)
    #[account(
        mut,
        owner = governance_program.key(),
    )]
    realm: UncheckedAccount<'info>,
    /// CHECK: dynamic owner
    #[account(
        mut,
        owner = governance_program.key(),
        seeds = [
            b"realm-config",
            &realm.key.to_bytes()
        ],
        bump,
        seeds::program = governance_program.key(),
    )]
    realm_config: UncheckedAccount<'info>,

    /// Either the realm community mint or the council mint.
    governing_token_mint: Account<'info, Mint>,
    realm_authority: Signer<'info>,
    #[account(
        init,
        seeds = [
            MaxVoterWeightRecord::ADDRESS_SEED,
            &root.key().to_bytes()
        ],
        bump,
        payer = payer,
        space = MaxVoterWeightRecord::SPACE,
    )]
    max_voter_weight: Account<'info, MaxVoterWeightRecord>,

    #[account(
        mut,
        owner = system_program::ID,
    )]
    payer: Signer<'info>,

    /// CHECK: program
    #[account(executable)]
    governance_program: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
    // self reference to be used as a plugin in SPL-governance
    vote_aggregator_program: Program<'info, VoteAggregator>,
}

impl<'info> CreateRoot<'info> {
    pub fn process(
        &mut self,
        remaining_accounts: &[AccountInfo<'info>],
        bumps: CreateRootBumps,
    ) -> Result<()> {
        // Verify that "realm_authority" is the expected authority on "realm"
        // and that the mint matches one of the realm mints too.
        let realm = realm::get_realm_data_for_governing_token_mint(
            self.governance_program.key,
            &self.realm.to_account_info(),
            &self.governing_token_mint.key(),
        )
        .map_err(|e| {
            AnchorError::from(e)
                .with_source(source!())
                .with_account_name("realm")
        })?;

        let realm_config = get_realm_config_data_for_realm(
            self.governance_program.key,
            &self.realm_config.to_account_info(),
            self.realm.key,
        )
        .map_err(|e| {
            AnchorError::from(e)
                .with_source(source!())
                .with_account_name("realm_config")
        })?;

        require_keys_eq!(
            realm.authority.ok_or(error!(Error::EmptyRealmAuthority))?,
            self.realm_authority.key(),
            Error::WrongRealmAuthority
        );

        let (voting_weight_plugin, community_token_config_args, council_token_config_args) =
            if self.governing_token_mint.key() == realm.community_mint {
                (
                    realm_config.community_token_config.voter_weight_addin,
                    GoverningTokenConfigAccountArgs {
                        voter_weight_addin: Some(crate::ID),
                        max_voter_weight_addin: realm_config
                            .community_token_config
                            .max_voter_weight_addin,
                        token_type: realm_config.community_token_config.token_type,
                    },
                    GoverningTokenConfigAccountArgs {
                        voter_weight_addin: realm_config.council_token_config.voter_weight_addin,
                        max_voter_weight_addin: realm_config
                            .council_token_config
                            .max_voter_weight_addin,
                        token_type: realm_config.council_token_config.token_type,
                    },
                )
            } else {
                require_keys_eq!(
                    self.governing_token_mint.key(),
                    realm
                        .config
                        .council_mint
                        .ok_or(error!(Error::UnknownGoverningTokenMint))?,
                    Error::UnknownGoverningTokenMint
                );
                (
                    realm_config.council_token_config.voter_weight_addin,
                    GoverningTokenConfigAccountArgs {
                        voter_weight_addin: realm_config.community_token_config.voter_weight_addin,
                        max_voter_weight_addin: realm_config
                            .community_token_config
                            .max_voter_weight_addin,
                        token_type: realm_config.community_token_config.token_type,
                    },
                    GoverningTokenConfigAccountArgs {
                        voter_weight_addin: Some(crate::ID),
                        max_voter_weight_addin: realm_config
                            .council_token_config
                            .max_voter_weight_addin,
                        token_type: realm_config.council_token_config.token_type,
                    },
                )
            };
        if let Some(voting_weight_plugin) = voting_weight_plugin {
            require_keys_neq!(voting_weight_plugin, crate::ID, Error::CircularPluginChain);
        }

        let ix = set_realm_config(
            self.governance_program.key,
            self.realm.key,
            self.realm_authority.key,
            realm.config.council_mint,
            self.payer.key,
            Some(community_token_config_args),
            Some(council_token_config_args),
            realm.config.min_community_weight_to_create_governance,
            realm.config.community_mint_max_voter_weight_source,
        );

        let accounts = [
            &[
                self.governance_program.to_account_info(),
                self.realm_config.to_account_info(),
                self.governing_token_mint.to_account_info(),
                self.realm.to_account_info(),
                self.realm_authority.to_account_info(),
                self.payer.to_account_info(),
                self.vote_aggregator_program.to_account_info(),
            ],
            remaining_accounts,
        ]
        .concat();

        invoke(&ix, &accounts)?;

        self.root.set_inner(Root {
            governance_program: self.governance_program.key(),
            realm: self.realm.key(),
            governing_token_mint: self.governing_token_mint.key(),
            voting_weight_plugin: voting_weight_plugin.unwrap_or_default(),
            max_proposal_lifetime: 0,
            bumps: RootBumps {
                root: bumps.root,
                max_voter_weight: bumps.max_voter_weight,
            },
            clan_count: 0,
            memeber_count: 0,
        });

        self.max_voter_weight.set_inner(MaxVoterWeightRecord::new(
            self.realm.key(),
            self.governing_token_mint.key(),
        ));

        emit!(RootCreated {
            root: self.root.key(),
            governance_program: self.governance_program.key(),
            realm: self.realm.key(),
            governing_token_mint: self.governing_token_mint.key(),
            voting_weight_plugin,
        });
        Ok(())
    }
}
