#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, Env,
    String as SorobanString,
};

const EVENT_VERSION_V1: u32 = 1;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum Error {
    InvalidTipAmount = 1,
    MetadataTooLong = 2,
    TotalOverflow = 3,
    NonceOverflow = 4,
    Unauthorized = 5,
    ContractPaused = 6,
    RateLimited = 7,
    InvalidRateLimitConfig = 8,
}

#[contract]
pub struct AnonymousTipping;

#[contracttype]
#[derive(Clone)]
enum DataKey {
    RecipientTotal(Address),
    SettlementNonce,
    Owner,
    IsPaused,
    RateLimitConfig,
    WalletWindow(Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RateLimitConfig {
    pub max_tips_per_window: u32,
    pub window_seconds: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WalletWindow {
    pub window_start: u64,
    pub tip_count: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SettlementReceiptEvent {
    pub recipient: Address,
    pub event_version: u32,
    pub settlement_id: u64,
    pub amount: i128,
    pub proof_metadata: SorobanString,
    pub proof_present: bool,
    pub timestamp: u64,
}

#[contractevent(topics = ["tip_settl"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SettlementEvent {
    #[topic]
    pub recipient: Address,
    pub event_version: u32,
    pub settlement_id: u64,
    pub amount: i128,
    pub proof_metadata: SorobanString,
    pub proof_present: bool,
    pub timestamp: u64,
}

#[contractevent(topics = ["tip_pause"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PauseChangedEvent {
    #[topic]
    pub actor: Address,
    pub paused: bool,
    pub reason: SorobanString,
    pub timestamp: u64,
}

#[contractimpl]
impl AnonymousTipping {
    pub const MAX_PROOF_METADATA_LEN: u32 = 128;
    pub const DEFAULT_MAX_TIPS_PER_WINDOW: u32 = 1_000;
    pub const DEFAULT_RATE_WINDOW_SECONDS: u64 = 60;

    /// Initialize the tipping contract
    pub fn init(env: Env) {
        if env.storage().instance().has(&DataKey::SettlementNonce) {
            return;
        }

        env.storage()
            .instance()
            .set(&DataKey::SettlementNonce, &0_u64);
        env.storage().instance().set(&DataKey::IsPaused, &false);
        env.storage().instance().set(
            &DataKey::RateLimitConfig,
            &RateLimitConfig {
                max_tips_per_window: Self::DEFAULT_MAX_TIPS_PER_WINDOW,
                window_seconds: Self::DEFAULT_RATE_WINDOW_SECONDS,
            },
        );
    }

    /// Send anonymous tip to a recipient
    pub fn send_tip(env: Env, recipient: Address, amount: i128) -> Result<u64, Error> {
        Self::send_tip_with_proof(env, recipient, amount, None)
    }

    /// Send anonymous tip with optional bounded settlement proof metadata.
    pub fn send_tip_with_proof(
        env: Env,
        recipient: Address,
        amount: i128,
        proof_metadata: Option<SorobanString>,
    ) -> Result<u64, Error> {
        Self::assert_not_paused(&env)?;
        if amount <= 0 {
            return Err(Error::InvalidTipAmount);
        }
        Self::assert_within_rate_limit(&env, &recipient)?;

        let metadata = match proof_metadata {
            Some(value) => {
                if value.len() > Self::MAX_PROOF_METADATA_LEN {
                    return Err(Error::MetadataTooLong);
                }
                value
            }
            None => SorobanString::from_str(&env, ""),
        };

        let previous = env
            .storage()
            .persistent()
            .get::<_, i128>(&DataKey::RecipientTotal(recipient.clone()))
            .unwrap_or(0_i128);
        let next_total = previous.checked_add(amount).ok_or(Error::TotalOverflow)?;
        env.storage()
            .persistent()
            .set(&DataKey::RecipientTotal(recipient.clone()), &next_total);

        let settlement_id = env
            .storage()
            .instance()
            .get::<_, u64>(&DataKey::SettlementNonce)
            .unwrap_or(0_u64)
            .checked_add(1)
            .ok_or(Error::NonceOverflow)?;
        env.storage()
            .instance()
            .set(&DataKey::SettlementNonce, &settlement_id);

        SettlementEvent {
            recipient,
            event_version: EVENT_VERSION_V1,
            settlement_id,
            amount,
            proof_metadata: metadata.clone(),
            proof_present: !metadata.is_empty(),
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);

        Ok(settlement_id)
    }

    /// Get tip history for a recipient
    pub fn get_tips(env: Env, recipient: Address) -> i128 {
        env.storage()
            .persistent()
            .get::<_, i128>(&DataKey::RecipientTotal(recipient))
            .unwrap_or(0_i128)
    }

    /// Read helper used by backend indexers/reconciliation workers.
    pub fn latest_settlement_nonce(env: Env) -> u64 {
        env.storage()
            .instance()
            .get::<_, u64>(&DataKey::SettlementNonce)
            .unwrap_or(0_u64)
    }

    pub fn configure_controls(
        env: Env,
        caller: Address,
        max_tips_per_window: u32,
        window_seconds: u64,
    ) -> Result<(), Error> {
        caller.require_auth();

        if max_tips_per_window == 0 || window_seconds == 0 {
            return Err(Error::InvalidRateLimitConfig);
        }

        if let Some(owner) = env.storage().instance().get::<_, Address>(&DataKey::Owner) {
            if owner != caller {
                return Err(Error::Unauthorized);
            }
        } else {
            env.storage().instance().set(&DataKey::Owner, &caller);
        }

        env.storage().instance().set(
            &DataKey::RateLimitConfig,
            &RateLimitConfig {
                max_tips_per_window,
                window_seconds,
            },
        );

        Ok(())
    }

    pub fn pause(env: Env, caller: Address, reason: SorobanString) -> Result<(), Error> {
        Self::require_owner(&env, &caller)?;
        env.storage().instance().set(&DataKey::IsPaused, &true);
        PauseChangedEvent {
            actor: caller,
            paused: true,
            reason,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    pub fn unpause(env: Env, caller: Address, reason: SorobanString) -> Result<(), Error> {
        Self::require_owner(&env, &caller)?;
        env.storage().instance().set(&DataKey::IsPaused, &false);
        PauseChangedEvent {
            actor: caller,
            paused: false,
            reason,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get::<_, bool>(&DataKey::IsPaused)
            .unwrap_or(false)
    }

    pub fn get_rate_limit_config(env: Env) -> RateLimitConfig {
        env.storage()
            .instance()
            .get::<_, RateLimitConfig>(&DataKey::RateLimitConfig)
            .unwrap_or(RateLimitConfig {
                max_tips_per_window: Self::DEFAULT_MAX_TIPS_PER_WINDOW,
                window_seconds: Self::DEFAULT_RATE_WINDOW_SECONDS,
            })
    }

    fn require_owner(env: &Env, caller: &Address) -> Result<(), Error> {
        let owner = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::Owner)
            .ok_or(Error::Unauthorized)?;
        if owner != *caller {
            return Err(Error::Unauthorized);
        }
        Ok(())
    }

    fn assert_not_paused(env: &Env) -> Result<(), Error> {
        if Self::is_paused(env.clone()) {
            return Err(Error::ContractPaused);
        }
        Ok(())
    }

    fn assert_within_rate_limit(env: &Env, wallet: &Address) -> Result<(), Error> {
        let cfg = Self::get_rate_limit_config(env.clone());
        if cfg.max_tips_per_window == 0 || cfg.window_seconds == 0 {
            return Err(Error::InvalidRateLimitConfig);
        }

        let now = env.ledger().timestamp();
        let mut state = env
            .storage()
            .persistent()
            .get::<_, WalletWindow>(&DataKey::WalletWindow(wallet.clone()))
            .unwrap_or(WalletWindow {
                window_start: now,
                tip_count: 0,
            });

        let elapsed = now.saturating_sub(state.window_start);
        if elapsed >= cfg.window_seconds {
            state.window_start = now;
            state.tip_count = 0;
        }

        if state.tip_count >= cfg.max_tips_per_window {
            return Err(Error::RateLimited);
        }

        state.tip_count = state.tip_count.saturating_add(1);
        env.storage()
            .persistent()
            .set(&DataKey::WalletWindow(wallet.clone()), &state);
        Ok(())
    }
}

#[cfg(test)]
mod tipping_adversarial;
