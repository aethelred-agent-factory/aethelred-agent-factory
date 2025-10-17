# Contributing to Aethelred Protocol

Thank you for your interest in contributing to Aethelred! This document provides guidelines and information for contributors.

## 🌟 Ways to Contribute

- **🐛 Bug Reports**: Found a bug? Let us know!
- **✨ Feature Requests**: Have an idea? We'd love to hear it!
- **📝 Documentation**: Help improve our docs
- **🔧 Code Contributions**: Submit PRs for fixes and features
- **🧪 Testing**: Help test new features and find edge cases
- **🤝 Community**: Help others in discussions and forums

## 🚀 Getting Started

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/aethelred.git
   cd aethelred
   ```

2. **Install Dependencies**
   ```bash
   make setup-dev
   ```

3. **Start Development Environment**
   ```bash
   make dev-start
   ```

4. **Run Tests**
   ```bash
   make test
   ```

### Development Workflow

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, well-documented code
   - Follow our coding standards
   - Add tests for new functionality

3. **Test Your Changes**
   ```bash
   make test
   make lint
   make format
   ```

4. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Use the PR template
   - Provide clear description
   - Link related issues

## 📋 Contribution Guidelines

### Code Style

#### Rust Code
- Follow standard Rust formatting (`cargo fmt`)
- Use `cargo clippy` and address all warnings
- Write comprehensive tests
- Document public APIs with doc comments

```rust
/// Calculates the bisection midpoint between two step numbers.
///
/// # Arguments
/// * `start` - The starting step number
/// * `end` - The ending step number
///
/// # Returns
/// The midpoint step number
///
/// # Examples
/// ```
/// assert_eq!(calculate_bisection_midpoint(0, 10), 5);
/// ```
pub fn calculate_bisection_midpoint(start: U256, end: U256) -> U256 {
    // Implementation
}
```

#### Solidity-style Comments
For Stylus contracts, use Solidity-style documentation:

```rust
/// @notice Submits a new AI computation task to the network
/// @param model_hash The hash of the AI model to use
/// @param input_hash The hash of the input data
/// @param fee The fee amount in AETHEL tokens
/// @return task_id The unique identifier for the submitted task
pub fn submit_task(
    &mut self,
    model_hash: B256,
    input_hash: B256,
    fee: U256
) -> Result<U256, Vec<u8>> {
    // Implementation
}
```

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: add interactive dispute resolution
fix: resolve executor staking calculation bug
docs: update API documentation for quality assessment
test: add integration tests for model marketplace
```

### Testing Requirements

All contributions must include appropriate tests:

#### Unit Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_bisection_midpoint() {
        assert_eq!(calculate_bisection_midpoint(U256::from(0), U256::from(10)), U256::from(5));
        assert_eq!(calculate_bisection_midpoint(U256::from(100), U256::from(200)), U256::from(150));
    }
}
```

#### Integration Tests
Add integration tests for new features in the `tests/` directory.

#### Manual Testing
For UI/UX changes, provide manual testing instructions.

## 🏗️ Project Structure

```
aethelred/
├── contracts/              # Smart contracts
│   ├── aethel_core/       # Main protocol contract
│   │   ├── src/
│   │   │   ├── lib.rs     # Main contract logic
│   │   │   ├── state.rs   # Data structures
│   │   │   └── dispute.rs # Dispute resolution
│   │   └── Cargo.toml
│   └── aethel_token/      # ERC-20 token
├── node/                  # Off-chain node
│   ├── src/
│   │   ├── main.rs       # CLI entry point
│   │   ├── executor.rs   # Task execution
│   │   ├── verifier.rs   # Result verification
│   │   ├── assessor.rs   # Quality assessment
│   │   └── chain.rs      # Blockchain interface
│   └── Cargo.toml
├── scripts/               # Deployment and utility scripts
├── tests/                 # Integration tests
├── docs/                  # Documentation
└── docker/                # Docker configurations
```

## 🐛 Bug Reports

When reporting bugs, please include:

### Required Information
- **Environment**: OS, Rust version, Node version
- **Steps to Reproduce**: Clear, numbered steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Error Messages**: Full error output
- **Screenshots**: If applicable

### Bug Report Template
```markdown
## Bug Description
Brief description of the bug.

## Environment
- OS: [e.g., macOS 12.6]
- Rust Version: [e.g., 1.70.0]
- Contract Version: [e.g., v0.1.0]

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
Description of expected behavior.

## Actual Behavior
Description of what actually happened.

## Error Output
```
Paste error messages here
```

## Additional Context
Any other relevant information.
```

## ✨ Feature Requests

For feature requests, please:

1. **Check Existing Issues**: Avoid duplicates
2. **Provide Context**: Why is this needed?
3. **Describe Solution**: What would you like to see?
4. **Consider Alternatives**: Are there other approaches?

### Feature Request Template
```markdown
## Feature Summary
Brief description of the feature.

## Problem Statement
What problem does this solve?

## Proposed Solution
Detailed description of the proposed feature.

## Alternatives Considered
Other approaches you've considered.

## Additional Context
Any other relevant information.
```

## 🔒 Security

### Reporting Security Issues

**DO NOT** create public issues for security vulnerabilities.

Instead, please email: [security@aethelred.ai](mailto:security@aethelred.ai)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Security Guidelines

When contributing:
- Never commit private keys or secrets
- Be mindful of gas optimization
- Consider reentrancy attacks
- Validate all inputs
- Use safe math operations

## 📚 Documentation

### Types of Documentation

1. **Code Comments**: Inline documentation
2. **API Documentation**: Generated from code comments
3. **User Guides**: How-to documents
4. **Technical Specs**: Architecture and design docs

### Documentation Standards

- Use clear, concise language
- Include examples where helpful
- Keep documentation up-to-date with code changes
- Use proper markdown formatting

## 🎯 Areas for Contribution

### High Priority
- [ ] Enhanced privacy features (zk-SNARKs)
- [ ] Multi-chain deployment support
- [ ] Advanced ML model types
- [ ] Performance optimizations

### Medium Priority
- [ ] Developer tooling improvements
- [ ] Additional language bindings
- [ ] Enhanced monitoring
- [ ] Mobile applications

### Low Priority
- [ ] UI/UX improvements
- [ ] Documentation enhancements
- [ ] Community tools
- [ ] Educational content

## 🏆 Recognition

Contributors will be recognized in:
- Project README
- Release notes
- Community announcements
- Potential token rewards (TBD)

## 📞 Getting Help

- **Discord**: [Join our community](https://discord.gg/aethelred)
- **GitHub Discussions**: [Technical discussions](https://github.com/aethelred-protocol/aethelred/discussions)
- **Email**: [team@aethelred.ai](mailto:team@aethelred.ai)

## 📄 License

By contributing to Aethelred, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for contributing to Aethelred! 🚀