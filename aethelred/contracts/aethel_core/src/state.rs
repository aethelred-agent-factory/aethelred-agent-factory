//! state.rs
//!
//! @author Aethelred Team
//! @notice Defines the core data structures and enums used in the Aethelred protocol's on-chain state.
//! This includes the representation of tasks, disputes, and their various statuses.

extern crate alloc;

use stylus_sdk::prelude::*;
use stylus_sdk::storage::{StorageAddress, StorageB256, StorageU256, StorageVec};
use alloy_primitives::{U256};

sol_storage! {
    /// @notice Represents a single computation task submitted to the network.
    pub struct Task {
        /// @notice The unique identifier for the task.
        StorageU256 id;
        /// @notice The address of the user who submitted the task.
        StorageAddress user;
        /// @notice A cryptographic hash representing the AI model to be executed (e.g., IPFS CID).
        StorageB256 model_hash;
        /// @notice A cryptographic hash representing the input data for the model.
        StorageB256 input_hash;
        /// @notice The hash of the result submitted by the Executor.
        StorageB256 result_hash;
        /// @notice The current status of the task, encoded as a `U256` from the `TaskStatus` enum.
        StorageU256 status;
        /// @notice The address of the Executor who is performing or has performed the computation.
        StorageAddress executor;
        /// @notice The bond amount staked by the Executor for this specific task.
        StorageU256 bond;
        /// @notice The fee paid by the user for this task.
        StorageU256 fee;
        /// @notice The block timestamp when the task was submitted.
        StorageU256 submission_timestamp;
        /// @notice The block timestamp when the Executor submitted their result.
        StorageU256 execution_timestamp;
        /// @notice Quality score assigned to this task (0-100), if applicable.
        StorageU256 quality_score;
        /// @notice Whether this task has been subject to quality assessment.
        bool quality_assessed;
    }

    /// @notice Represents an active dispute over a task's result.
    /// @dev This struct holds the state for the interactive bisection fraud-proof game.
    pub struct Dispute {
        /// @notice The ID of the task being disputed.
        StorageU256 task_id;
        /// @notice The address of the party challenging the result.
        StorageAddress challenger;
        /// @notice The address of the Executor who submitted the original result.
        StorageAddress executor;
        /// @notice The hash of the result asserted by the Executor.
        StorageB256 executor_assertion;
        /// @notice The hash of the result asserted by the Challenger.
        StorageB256 challenger_assertion;
        /// @notice The bond posted by the Challenger to initiate the dispute.
        StorageU256 challenge_bond;
        /// @notice The block timestamp of the last move made in the dispute game.
        StorageU256 last_move_timestamp;
        /// @notice The address of the participant whose turn it is to make the next move in the game.
        StorageAddress next_turn;
        /// @notice The starting step of the computation currently under dispute in the bisection protocol.
        StorageU256 bisection_start;
        /// @notice The ending step of the computation currently under dispute.
        StorageU256 bisection_end;
        /// @notice The current round number in the bisection protocol.
        StorageU256 current_round;
        /// @notice Whether the dispute is currently active.
        bool is_active;
        /// @notice The maximum number of rounds allowed for this dispute.
        StorageU256 max_rounds;
        /// @notice History of bisection rounds for transparency.
        StorageVec<BisectionRound> rounds;
    }

    /// @notice Represents a single round in the bisection protocol.
    pub struct BisectionRound {
        /// @notice The round number.
        StorageU256 round_number;
        /// @notice The participant who made the move.
        StorageAddress participant;
        /// @notice The claimed state at this bisection point.
        StorageB256 claimed_state;
        /// @notice The step number being claimed.
        StorageU256 step_number;
        /// @notice Timestamp when this round was completed.
        StorageU256 timestamp;
    }
}

/// @notice Enum representing the possible statuses of a computation task.
/// @dev Stored as a `U256` on-chain for gas efficiency and future extensibility.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum TaskStatus {
    /// @notice The task has been submitted by a user and is awaiting execution.
    Pending = 0,
    /// @notice An Executor has submitted a result and the verification/challenge window is open.
    Verifying = 1,
    /// @notice The result has been challenged, and an interactive dispute game is in progress.
    Dispute = 2,
    /// @notice The Executor was found to have submitted a fraudulent result and their bond was slashed.
    Slashed = 3,
    /// @notice The verification window closed without a challenge, and the result is considered final.
    Finalized = 4,
    /// @notice The dispute was resolved in favor of the Executor.
    ExecutorWin = 5,
    /// @notice The task failed quality assessment and requires re-evaluation.
    QualityFailed = 6,
    /// @notice The task is undergoing quality assessment.
    QualityAssessment = 7,
}

impl From<U256> for TaskStatus {
    fn from(value: U256) -> Self {
        match value.to::<u8>() {
            0 => TaskStatus::Pending,
            1 => TaskStatus::Verifying,
            2 => TaskStatus::Dispute,
            3 => TaskStatus::Slashed,
            4 => TaskStatus::Finalized,
            5 => TaskStatus::ExecutorWin,
            6 => TaskStatus::QualityFailed,
            7 => TaskStatus::QualityAssessment,
            _ => TaskStatus::Finalized, // Default to finalized for unknown values
        }
    }
}

impl From<TaskStatus> for u8 {
    fn from(value: TaskStatus) -> Self {
        value as u8
    }
}

impl From<TaskStatus> for U256 {
    fn from(value: TaskStatus) -> Self {
        U256::from(value as u8)
    }
}

/// @notice Enum representing the possible dispute resolution outcomes.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum DisputeOutcome {
    /// @notice The dispute is still ongoing.
    Pending,
    /// @notice The challenger proved the executor wrong.
    ChallengerWins,
    /// @notice The executor successfully defended their result.
    ExecutorWins,
    /// @notice The dispute timed out (challenger failed to respond).
    TimeoutExecutorWins,
    /// @notice The dispute timed out (executor failed to respond).
    TimeoutChallengerWins,
}

/// @notice Helper functions for task and dispute management.
impl TaskStatus {
    /// @notice Check if a task status allows for challenges.
    pub fn can_be_challenged(&self) -> bool {
        matches!(self, TaskStatus::Verifying | TaskStatus::QualityAssessment)
    }

    /// @notice Check if a task status indicates completion.
    pub fn is_completed(&self) -> bool {
        matches!(
            self,
            TaskStatus::Finalized | TaskStatus::ExecutorWin | TaskStatus::Slashed
        )
    }

    /// @notice Check if a task status indicates an active dispute.
    pub fn is_disputed(&self) -> bool {
        matches!(self, TaskStatus::Dispute)
    }

    /// @notice Check if a task requires quality assessment.
    pub fn requires_quality_assessment(&self) -> bool {
        matches!(self, TaskStatus::QualityAssessment)
    }

    /// @notice Get a human-readable description of the status.
    pub fn description(&self) -> &'static str {
        match self {
            TaskStatus::Pending => "Awaiting execution",
            TaskStatus::Verifying => "Under verification window",
            TaskStatus::Dispute => "Active dispute in progress",
            TaskStatus::Slashed => "Executor penalized for fraud",
            TaskStatus::Finalized => "Successfully completed",
            TaskStatus::ExecutorWin => "Dispute resolved in executor's favor",
            TaskStatus::QualityFailed => "Failed quality assessment",
            TaskStatus::QualityAssessment => "Undergoing quality assessment",
        }
    }
}

/// @notice Constants for the Aethelred protocol.
pub mod constants {
    use alloy_primitives::U256;

    /// @notice Default minimum quality score threshold (out of 100).
    pub const DEFAULT_QUALITY_THRESHOLD: u64 = 70;

    /// @notice Maximum number of bisection rounds allowed in a dispute.
    pub const MAX_BISECTION_ROUNDS: u64 = 20;

    /// @notice Default challenge period in seconds (2 hours).
    pub const DEFAULT_CHALLENGE_PERIOD: u64 = 7200;

    /// @notice Minimum executor stake in AETHEL tokens (with 18 decimals).
    pub const MIN_EXECUTOR_STAKE: u64 = 1000; // 1000 AETHEL

    /// @notice Default task bond amount.
    pub const DEFAULT_TASK_BOND: u64 = 100; // 100 AETHEL

    /// @notice Default challenge bond amount.
    pub const DEFAULT_CHALLENGE_BOND: u64 = 200; // 200 AETHEL

    /// @notice Maximum number of quality assessors per task.
    pub const MAX_QUALITY_ASSESSORS: usize = 5;

    /// @notice Timeout for quality assessment (in seconds).
    pub const QUALITY_ASSESSMENT_TIMEOUT: u64 = 3600; // 1 hour

    /// @notice Convert constants to U256 for on-chain usage.
    pub fn default_quality_threshold_u256() -> U256 {
        U256::from(DEFAULT_QUALITY_THRESHOLD)
    }

    pub fn max_bisection_rounds_u256() -> U256 {
        U256::from(MAX_BISECTION_ROUNDS)
    }

    pub fn default_challenge_period_u256() -> U256 {
        U256::from(DEFAULT_CHALLENGE_PERIOD)
    }

    pub fn min_executor_stake_u256() -> U256 {
        U256::from(MIN_EXECUTOR_STAKE) * U256::from(10).pow(U256::from(18))
    }

    pub fn default_task_bond_u256() -> U256 {
        U256::from(DEFAULT_TASK_BOND) * U256::from(10).pow(U256::from(18))
    }

    pub fn default_challenge_bond_u256() -> U256 {
        U256::from(DEFAULT_CHALLENGE_BOND) * U256::from(10).pow(U256::from(18))
    }
}

/// @notice Utility functions for working with task and dispute state.
pub mod utils {
    use super::*;

    /// @notice Calculate the bisection midpoint between two step numbers.
    pub fn calculate_bisection_midpoint(start: U256, end: U256) -> U256 {
        if end <= start {
            return start;
        }
        start + (end - start) / U256::from(2)
    }

    /// @notice Check if a bisection range is valid (start < end).
    pub fn is_valid_bisection_range(start: U256, end: U256) -> bool {
        start < end && (end - start) >= U256::from(1)
    }

    /// @notice Calculate the maximum number of rounds needed for a given computation size.
    pub fn calculate_max_rounds(total_steps: U256) -> U256 {
        if total_steps <= U256::from(1) {
            return U256::from(1);
        }

        // Calculate log2 of total_steps + 1 for safety margin
        let mut rounds = U256::from(0);
        let mut temp = total_steps;

        while temp > U256::from(1) {
            temp = temp / U256::from(2);
            rounds = rounds + U256::from(1);
        }

        rounds + U256::from(2) // Add safety margin
    }

    /// @notice Validate that a quality score is within acceptable bounds.
    pub fn is_valid_quality_score(score: U256) -> bool {
        score <= U256::from(100)
    }

    /// @notice Check if enough time has passed for a timeout.
    pub fn has_timeout_occurred(last_timestamp: U256, timeout_period: U256, current_time: U256) -> bool {
        current_time >= last_timestamp + timeout_period
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::utils::*;

    #[test]
    fn test_task_status_conversions() {
        assert_eq!(TaskStatus::from(U256::from(0)), TaskStatus::Pending);
        assert_eq!(TaskStatus::from(U256::from(1)), TaskStatus::Verifying);
        assert_eq!(TaskStatus::from(U256::from(2)), TaskStatus::Dispute);
        assert_eq!(u8::from(TaskStatus::Pending), 0);
        assert_eq!(u8::from(TaskStatus::Verifying), 1);
    }

    #[test]
    fn test_bisection_calculations() {
        assert_eq!(calculate_bisection_midpoint(U256::from(0), U256::from(10)), U256::from(5));
        assert_eq!(calculate_bisection_midpoint(U256::from(100), U256::from(200)), U256::from(150));
        assert!(is_valid_bisection_range(U256::from(0), U256::from(10)));
        assert!(!is_valid_bisection_range(U256::from(10), U256::from(10)));
        assert!(is_valid_bisection_range(U256::from(10), U256::from(11)));
    }

    #[test]
    fn test_quality_score_validation() {
        assert!(is_valid_quality_score(U256::from(0)));
        assert!(is_valid_quality_score(U256::from(50)));
        assert!(is_valid_quality_score(U256::from(100)));
        assert!(!is_valid_quality_score(U256::from(101)));
    }

    #[test]
    fn test_timeout_calculations() {
        let last_time = U256::from(1000);
        let timeout = U256::from(300);
        let current_time = U256::from(1350);

        assert!(has_timeout_occurred(last_time, timeout, current_time));
        assert!(!has_timeout_occurred(last_time, timeout, U256::from(1200)));
    }
}
