// dispute.rs
use sha3::Keccak256;


// @author Aethelred Team
// @notice This module contains the logic for the interactive dispute resolution game.
// It implements a sophisticated bisection protocol over a machine state trace,
// as described in the strategic blueprint.

use crate::state::{TaskStatus, DisputeOutcome, BisectionRound, Dispute, utils};
use alloy_primitives::{Address, B256, U256};

use sha3::Digest;

/// @notice The total number of computational steps assumed for a given task.
/// @dev In a real system, this would be determined by the specific model and input.
pub const TOTAL_COMPUTATION_STEPS: u64 = 1_000_000;

/// @notice Timeout period for dispute moves (in seconds).
pub const DISPUTE_TIMEOUT_SECONDS: u64 = 3600; // 1 hour

/// @notice Maximum allowed bisection rounds.
pub const MAX_BISECTION_ROUNDS: u64 = 20;



/// @notice Represents a single move in the bisection protocol.
#[derive(Clone, Debug)]
pub struct BisectionMove {
    pub participant: Address,
    pub step_number: U256,
    pub claimed_state: B256,
    pub is_valid: bool,
}

/// @notice Result of processing a bisection move.
#[derive(Clone, Debug)]
pub struct MoveResult {
    pub outcome: DisputeOutcome,
    pub new_start: U256,
    pub new_end: U256,
    pub next_participant: Address,
    pub requires_one_step_proof: bool,
    pub winner: Option<Address>,
    pub loser: Option<Address>,
}

/// @notice Initiates a new dispute, setting up the initial state for the bisection game.
/// @param task_id The ID of the task under dispute.
/// @param challenger The address of the challenger.
/// @param executor The address of the executor.
/// @param executor_assertion The result hash submitted by the executor.
/// @param challenger_assertion The result hash submitted by the challenger.
/// @param challenge_bond The bond posted by the challenger.
/// @param timestamp The timestamp when the dispute was initiated.
/// @return A new `Dispute` struct ready to be stored on-chain.
pub fn start_dispute(
    task_id: U256,
    challenger: Address,
    executor: Address,
    executor_assertion: B256,
    challenger_assertion: B256,
    challenge_bond: U256,
    timestamp: U256,
) -> Dispute {
    let total_steps = U256::from(TOTAL_COMPUTATION_STEPS);
    let max_rounds = utils::calculate_max_rounds(total_steps);

    let mut dispute = Dispute::default();
    dispute.task_id.set(task_id.into());
    dispute.challenger.set(challenger.into());
    dispute.executor.set(executor.into());
    dispute.executor_assertion.set(executor_assertion.into());
    dispute.challenger_assertion.set(challenger_assertion.into());
    dispute.challenge_bond.set(challenge_bond.into());
    dispute.last_move_timestamp.set(timestamp.into());
    dispute.next_turn.set(executor.into()); // Executor must defend first
    dispute.bisection_start.set(U256::ZERO.into());
    dispute.bisection_end.set(total_steps.into());
    dispute.current_round.set(U256::from(1).into());
    dispute.is_active.set(true);
    dispute.max_rounds.set(max_rounds.into());
    dispute.rounds.set(alloc::vec::Vec::new());
    dispute
}

/// @notice Process a bisection move in the interactive dispute protocol.
/// @param dispute The current dispute state.
/// @param move_data The bisection move being made.
/// @param current_time The current block timestamp.
/// @return The result of processing this move.
pub fn process_bisection_move(
    dispute: &mut Dispute,
    move_data: BisectionMove,
    current_time: U256,
) -> Result<MoveResult, &'static str> {
    // Validate basic preconditions
    if !dispute.is_active.get() {
        return Err("Dispute is not active");
    }

    if move_data.participant != dispute.next_turn.get().into() {
        return Err("Not participant's turn");
    }

    // Check for timeout
    if has_dispute_timed_out(dispute, current_time) {
        return Ok(handle_timeout(dispute));
    }

    // Validate the move
    if !is_valid_bisection_move(dispute, &move_data) {
        return Err("Invalid bisection move");
    }

    // Record the move
    let round = BisectionRound {
        round_number: dispute.current_round.get().into(),
        participant: move_data.participant.into(),
        claimed_state: move_data.claimed_state.into(),
        step_number: move_data.step_number.into(),
        timestamp: current_time.into(),
    };
    dispute.rounds.push(round.into());

    // Update dispute state
    dispute.last_move_timestamp.set(current_time.into());
    dispute.current_round.set((dispute.current_round.get().into() + U256::from(1)).into());

    // Determine the next state based on the bisection logic
    let result = calculate_next_bisection_state(dispute, &move_data);

    // Update dispute with new bisection range
    dispute.bisection_start.set(result.new_start.into());
    dispute.bisection_end.set(result.new_end.into());
    dispute.next_turn.set(result.next_participant.into());

    // Check if we've reached the end condition
    if result.requires_one_step_proof {
        dispute.is_active.set(false);
        return Ok(MoveResult {
            outcome: DisputeOutcome::Pending, // Will be resolved by one-step proof
            requires_one_step_proof: true,
            ..result
        });
    }

    // Check if we've exceeded maximum rounds
    if dispute.current_round.get().into() > dispute.max_rounds.get().into() {
        dispute.is_active.set(false);
        return Ok(MoveResult {
            outcome: DisputeOutcome::TimeoutExecutorWins, // Default to executor if rounds exceeded
            winner: Some(dispute.executor.get().into()),
            loser: Some(dispute.challenger.get().into()),
            requires_one_step_proof: false,
            ..result
        });
    }

    Ok(result)
}

/// @notice Calculate the next state in the bisection protocol.
/// @param dispute The current dispute state.
/// @param move_data The move that was just made.
/// @return The result indicating the next state.
fn calculate_next_bisection_state(dispute: &Dispute, move_data: &BisectionMove) -> MoveResult {
    let current_range = dispute.bisection_end.get().into() - dispute.bisection_start.get().into();

    // Check if we've narrowed down to a single step
    if current_range <= U256::from(2) {
        return MoveResult {
            outcome: DisputeOutcome::Pending,
            new_start: dispute.bisection_start.get().into(),
            new_end: dispute.bisection_end.get().into(),
            next_participant: get_other_participant(dispute, move_data.participant),
            requires_one_step_proof: true,
            winner: None,
            loser: None,
        };
    }

    // Calculate the bisection midpoint
    let midpoint = utils::calculate_bisection_midpoint(dispute.bisection_start.get().into(), dispute.bisection_end.get().into());

    // Determine new range based on where the disagreement is
    let (new_start, new_end) = if move_data.step_number <= midpoint {
        // Disagreement is in the first half
        (dispute.bisection_start.get().into(), midpoint)
    } else {
        // Disagreement is in the second half
        (midpoint, dispute.bisection_end.get().into())
    };

    // Next participant is the other party
    let next_participant = get_other_participant(dispute, move_data.participant);

    MoveResult {
        outcome: DisputeOutcome::Pending,
        new_start,
        new_end,
        next_participant,
        requires_one_step_proof: false,
        winner: None,
        loser: None,
    }
}

/// @notice Validate that a bisection move is legitimate.
/// @param dispute The current dispute state.
/// @param move_data The move to validate.
/// @return Whether the move is valid.
fn is_valid_bisection_move(dispute: &Dispute, move_data: &BisectionMove) -> bool {
    // Check step number is within current range
    if move_data.step_number < dispute.bisection_start.get().into() || move_data.step_number >= dispute.bisection_end.get().into() {
        return false;
    }

    // Check that claimed state is not zero hash (should be a real computation state)
    if move_data.claimed_state == B256::ZERO {
        return false;
    }

    // Additional validation could include:
    // - Checking consistency with previous moves
    // - Validating state transitions
    // - Ensuring computational steps are reasonable

    true
}

/// @notice Check if a dispute has timed out.
/// @param dispute The dispute to check.
/// @param current_time The current timestamp.
/// @return Whether the dispute has timed out.
fn has_dispute_timed_out(dispute: &Dispute, current_time: U256) -> bool {
    let timeout_period = U256::from(DISPUTE_TIMEOUT_SECONDS);
    utils::has_timeout_occurred(dispute.last_move_timestamp.get().into(), timeout_period, current_time)
}

/// @notice Handle a dispute timeout.
/// @param dispute The dispute that timed out.
/// @return The result of the timeout.
fn handle_timeout(dispute: &Dispute) -> MoveResult {
    // The participant whose turn it is loses due to timeout
    let (winner, loser, outcome) = if dispute.next_turn.get() == dispute.executor.get() {
        (dispute.challenger.get(), dispute.executor.get(), DisputeOutcome::TimeoutChallengerWins)
    } else {
        (dispute.executor.get(), dispute.challenger.get(), DisputeOutcome::TimeoutExecutorWins)
    };

    MoveResult {
        outcome,
        new_start: dispute.bisection_start.get().into(),
        new_end: dispute.bisection_end.get().into(),
        next_participant: dispute.next_turn.get().into(),
        requires_one_step_proof: false,
        winner: Some(winner.into()),
        loser: Some(loser.into()),
    }
}

/// @notice Get the other participant in a dispute.
/// @param dispute The dispute.
/// @param current_participant The current participant.
/// @return The other participant.
fn get_other_participant(dispute: &Dispute, current_participant: Address) -> Address {
    if current_participant == dispute.executor.get() {
        dispute.challenger.get()
    } else {
        dispute.executor.get()
    }
}

/// @notice Execute a one-step proof to resolve a dispute.
/// @dev In a real implementation, this would execute a single computational step on-chain.
/// @param dispute The dispute to resolve.
/// @param proof_data The proof data for the one-step execution.
/// @return The outcome of the dispute.
pub fn execute_one_step_proof(
    dispute: &Dispute,
    proof_data: &[u8], // In practice, this would be structured proof data
) -> DisputeOutcome {
    // This is a simplified implementation. In reality, this would:
    // 1. Parse the proof data
    // 2. Execute the single computation step on-chain
    // 3. Compare the result with both assertions
    // 4. Determine which assertion was correct

    // For demonstration, we'll use a simple heuristic based on proof data
    if proof_data.len() > 32 {
        // Assume challenger wins if proof data is substantial
        DisputeOutcome::ChallengerWins
    } else {
        // Assume executor wins otherwise
        DisputeOutcome::ExecutorWins
    }
}

/// @notice A simplified representation of resolving a dispute.
/// @dev This is the fallback for admin resolution when automatic resolution fails.
/// @param dispute A reference to the current dispute state.
/// @param is_challenger_correct A boolean indicating if the challenger's claim was proven correct.
/// @return A tuple containing the new task status, the winner's address, and the loser's address.
pub fn resolve_dispute_simplified(
    dispute: &Dispute,
    is_challenger_correct: bool,
) -> (TaskStatus, Address, Address) {
    if is_challenger_correct {
        // Challenger wins, executor is slashed.
                    (TaskStatus::Slashed, dispute.challenger.get(), dispute.executor.get())
    } else {
        // Executor wins, challenger loses their challenge stake.
        // The task is considered correct.
        (TaskStatus::ExecutorWin, dispute.executor, dispute.challenger)
    }
}

/// @notice Convert a DisputeOutcome to the appropriate TaskStatus and participants.
/// @param dispute The dispute context.
/// @param outcome The outcome of the dispute resolution.
/// @return A tuple containing the new task status, winner, and loser.
pub fn outcome_to_task_status(
    dispute: &Dispute,
    outcome: DisputeOutcome,
) -> (TaskStatus, Address, Address) {
    match outcome {
        DisputeOutcome::ChallengerWins | DisputeOutcome::TimeoutChallengerWins => {
                        (TaskStatus::Slashed, dispute.challenger.get(), dispute.executor.get())
        }
        DisputeOutcome::ExecutorWins | DisputeOutcome::TimeoutExecutorWins => {
            (TaskStatus::ExecutorWin, dispute.executor, dispute.challenger)
        }
        DisputeOutcome::Pending => {
            // Should not happen in final resolution
            (TaskStatus::Dispute, Address::ZERO, Address::ZERO)
        }
    }
}

/// @notice Generate a deterministic computation state for testing.
/// @dev This is used for simulation and testing purposes.
/// @param step The computation step number.
/// @param model_hash The hash of the AI model.
/// @param input_hash The hash of the input data.
/// @return A simulated computation state.
pub fn simulate_computation_state(step: U256, model_hash: B256, input_hash: B256) -> B256 {
    use sha3::Digest;

    let mut hasher = Keccak256::new();
    hasher.update(step.to_be_bytes::<32>());
    hasher.update(model_hash.as_slice());
    hasher.update(input_hash.as_slice());
    hasher.update(b"aethelred_computation_step");

    B256::from_slice(&hasher.finalize())
}

/// @notice Validate the integrity of a dispute's bisection history.
/// @param dispute The dispute to validate.
/// @return Whether the dispute history is consistent.
pub fn validate_dispute_history(dispute: &Dispute) -> bool {
    if dispute.rounds.is_empty() {
        return true;
    }

    let mut current_start = U256::ZERO;
    let mut current_end = U256::from(TOTAL_COMPUTATION_STEPS);

    for (i, round) in dispute.rounds.iter().enumerate() {
        // Check round number consistency
        if round.round_number.get() != U256::from(i + 1) {
            return false;
        }

        // Check step number is within current range
        if round.step_number.get() < current_start || round.step_number.get() >= current_end {
            return false;
        }

        // Check timestamp progression
        if i > 0 && round.timestamp.get() <= dispute.rounds.get(i - 1).unwrap().timestamp.get() {
            return false;
        }

        // Update range for next iteration (simplified bisection)
        let midpoint = utils::calculate_bisection_midpoint(current_start, current_end);
        if round.step_number.get() <= midpoint {
            current_end = midpoint;
        } else {
            current_start = midpoint;
        }
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;
    use alloy_primitives::{Address, B256, U256};

    fn create_test_dispute() -> Dispute {
        let executor = Address::from([1u8; 20]);
        let challenger = Address::from([2u8; 20]);

        start_dispute(
            U256::from(1),
            challenger,
            executor,
            B256::from([1u8; 32]),
            B256::from([2u8; 32]),
            U256::from(1000),
            U256::from(1000),
        )
    }

    #[test]
    fn test_dispute_initialization() {
        let dispute = create_test_dispute();
        assert!(dispute.is_active);
        assert_eq!(dispute.current_round, U256::from(1));
        assert_eq!(dispute.bisection_start, U256::ZERO);
        assert_eq!(dispute.bisection_end, U256::from(TOTAL_COMPUTATION_STEPS));
    }

    #[test]
    fn test_bisection_move_validation() {
        let dispute = create_test_dispute();

        let valid_move = BisectionMove {
            participant: dispute.executor,
            step_number: U256::from(500_000),
            claimed_state: B256::from([3u8; 32]),
            is_valid: true,
        };

        assert!(is_valid_bisection_move(&dispute, &valid_move));

        let invalid_move = BisectionMove {
            participant: dispute.executor,
            step_number: U256::from(2_000_000), // Outside range
            claimed_state: B256::from([3u8; 32]),
            is_valid: true,
        };

        assert!(!is_valid_bisection_move(&dispute, &invalid_move));
    }

    #[test]
    fn test_timeout_detection() {
        let mut dispute = create_test_dispute();
        let current_time = dispute.last_move_timestamp + U256::from(DISPUTE_TIMEOUT_SECONDS + 1);

        assert!(has_dispute_timed_out(&dispute, current_time));

        let recent_time = dispute.last_move_timestamp + U256::from(DISPUTE_TIMEOUT_SECONDS - 1);
        assert!(!has_dispute_timed_out(&dispute, recent_time));
    }

    #[test]
    fn test_computation_state_simulation() {
        let model_hash = B256::from([1u8; 32]);
        let input_hash = B256::from([2u8; 32]);

        let state1 = simulate_computation_state(U256::from(100), model_hash, input_hash);
        let state2 = simulate_computation_state(U256::from(200), model_hash, input_hash);

        // States for different steps should be different
        assert_ne!(state1, state2);

        // Same step should produce same state (deterministic)
        let state1_repeat = simulate_computation_state(U256::from(100), model_hash, input_hash);
        assert_eq!(state1, state1_repeat);
    }

    #[test]
    fn test_dispute_outcome_conversion() {
        let dispute = create_test_dispute();

        let (status, winner, loser) = outcome_to_task_status(&dispute, DisputeOutcome::ChallengerWins);
        assert_eq!(status, TaskStatus::Slashed);
        assert_eq!(winner, dispute.challenger);
        assert_eq!(loser, dispute.executor);

        let (status, winner, loser) = outcome_to_task_status(&dispute, DisputeOutcome::ExecutorWins);
        assert_eq!(status, TaskStatus::ExecutorWin);
        assert_eq!(winner, dispute.executor);
        assert_eq!(loser, dispute.challenger);
    }
}