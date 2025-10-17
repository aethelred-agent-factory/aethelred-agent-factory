// Minimal stub implementation for Aethel Token
// This is a simplified version to get the integration working
// TODO: Implement full ERC-20 functionality with Stylus

pub struct AethelToken {
    pub total_supply: u64,
    pub balances: std::collections::HashMap<String, u64>,
}

impl AethelToken {
    pub fn new(initial_supply: u64) -> Self {
        let mut balances = std::collections::HashMap::new();
        balances.insert("deployer".to_string(), initial_supply);
        
        AethelToken {
            total_supply: initial_supply,
            balances,
        }
    }
    
    pub fn total_supply(&self) -> u64 {
        self.total_supply
    }
    
    pub fn balance_of(&self, account: &str) -> u64 {
        self.balances.get(account).copied().unwrap_or(0)
    }
    
    pub fn transfer(&mut self, from: &str, to: &str, amount: u64) -> Result<bool, String> {
        let from_balance = self.balance_of(from);
        if from_balance < amount {
            return Err("Insufficient balance".to_string());
        }
        
        let to_balance = self.balance_of(to);
        self.balances.insert(from.to_string(), from_balance - amount);
        self.balances.insert(to.to_string(), to_balance + amount);
        
        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_token() {
        let token = AethelToken::new(1000);
        assert_eq!(token.total_supply(), 1000);
        assert_eq!(token.balance_of("deployer"), 1000);
    }

    #[test]
    fn test_transfer() {
        let mut token = AethelToken::new(1000);
        let result = token.transfer("deployer", "user1", 100);
        assert!(result.is_ok());
        assert_eq!(token.balance_of("deployer"), 900);
        assert_eq!(token.balance_of("user1"), 100);
    }

    #[test]
    fn test_insufficient_balance() {
        let mut token = AethelToken::new(100);
        let result = token.transfer("deployer", "user1", 200);
        assert!(result.is_err());
    }
}