package com.skillex.service.impl;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.credits.CreditTransactionDto;
import com.skillex.dto.credits.CreditWalletDto;
import com.skillex.model.AdminAuditLog;
import com.skillex.model.CreditTransaction;
import com.skillex.model.Exchange;
import com.skillex.model.User;
import com.skillex.model.UserCreditWallet;
import com.skillex.repository.AdminAuditLogRepository;
import com.skillex.repository.CreditTransactionRepository;
import com.skillex.repository.UserCreditWalletRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.CreditService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CreditServiceImpl implements CreditService {
    private final UserCreditWalletRepository walletRepository;
    private final CreditTransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final AdminAuditLogRepository auditRepository;

    /**
     * Minimum profile-completeness percent required (alongside a verified email) to
     * release the one-time starter credit grant. Lowered from a strict 80 to a demo-
     * friendly default so seeded/real accounts reliably receive starter credits.
     */
    @Value("${app.credits.starter-grant-min-completeness:50}")
    private int starterGrantMinCompleteness;

    @Override
    @Transactional
    public CreditWalletDto getWallet(String userId) {
        return toWalletDto(ensureWallet(findUser(userId)));
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CreditTransactionDto> getTransactions(String userId, int page, int size) {
        return PagedResponse.of(transactionRepository
            .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size))
            .map(this::toDto));
    }

    @Override
    @Transactional
    public void chargeForCreditExchange(String learnerId, String teacherId, Exchange exchange, int amount) {
        if (amount <= 0) return;
        User learner = findUser(learnerId);
        UserCreditWallet learnerWallet = ensureWallet(learner);
        if (learnerWallet.getBalance() < amount) {
            throw new IllegalArgumentException("You need " + amount + " SkillEX credits for this request.");
        }
        learnerWallet.setBalance(learnerWallet.getBalance() - amount);
        learnerWallet.setLifetimeSpent(learnerWallet.getLifetimeSpent() + amount);
        walletRepository.save(learnerWallet);
        User teacher = findUser(teacherId);
        saveTx(learner, teacher, exchange, -amount, CreditTransaction.TransactionType.CREDIT_PAYMENT_SPEND, "Spent credits for one-way skill learning.");
    }

    @Override
    @Transactional
    public void refundCreditExchange(Exchange exchange) {
        if (exchange == null || exchange.getCreditCost() == null || exchange.getCreditCost() <= 0) return;
        User learner = exchange.getRequester();
        User teacher = exchange.getReceiver();
        int amount = exchange.getCreditCost();
        UserCreditWallet learnerWallet = ensureWallet(learner);
        learnerWallet.setBalance(learnerWallet.getBalance() + amount);
        learnerWallet.setLifetimeSpent(Math.max(0, learnerWallet.getLifetimeSpent() - amount));
        walletRepository.save(learnerWallet);
        saveTx(learner, teacher, exchange, amount, CreditTransaction.TransactionType.CREDIT_REFUND, "Refunded credits after exchange was declined or cancelled.");
    }

    @Override
    @Transactional
    public void rewardSkillCheck(String userId, int amount, String reason) {
        if (amount <= 0) return;
        User user = findUser(userId);
        UserCreditWallet wallet = ensureWallet(user);
        wallet.setBalance(wallet.getBalance() + amount);
        wallet.setLifetimeEarned(wallet.getLifetimeEarned() + amount);
        walletRepository.save(wallet);
        saveTx(user, null, null, amount, CreditTransaction.TransactionType.SKILL_CHECK_REWARD, reason);
    }

    @Override
    @Transactional
    public void rewardTeachingSession(String teacherId, Exchange exchange, int amount, String reason) {
        if (amount <= 0) return;
        User teacher = findUser(teacherId);
        UserCreditWallet wallet = ensureWallet(teacher);
        wallet.setBalance(wallet.getBalance() + amount);
        wallet.setLifetimeEarned(wallet.getLifetimeEarned() + amount);
        walletRepository.save(wallet);
        saveTx(teacher, null, exchange, amount, CreditTransaction.TransactionType.TEACHING_SESSION_REWARD, reason);
    }

    @Override
    @Transactional
    public void rewardCommunityContribution(String userId, int amount, String reason) {
        if (amount <= 0) return;
        User user = findUser(userId);
        UserCreditWallet wallet = ensureWallet(user);
        wallet.setBalance(wallet.getBalance() + amount);
        wallet.setLifetimeEarned(wallet.getLifetimeEarned() + amount);
        walletRepository.save(wallet);
        saveTx(user, null, null, amount, CreditTransaction.TransactionType.COMMUNITY_CONTRIBUTION_REWARD, reason);
    }

    @Override
    @Transactional
    public CreditWalletDto adjustByAdmin(String adminUserId, String targetUserId, int amount, String reason) {
        User admin = findUser(adminUserId);
        User target = findUser(targetUserId);
        UserCreditWallet wallet = ensureWallet(target);
        int next = wallet.getBalance() + amount;
        if (next < 0) {
            throw new IllegalArgumentException("Credit adjustment would make the wallet negative.");
        }
        wallet.setBalance(next);
        if (amount >= 0) wallet.setLifetimeEarned(wallet.getLifetimeEarned() + amount);
        else wallet.setLifetimeSpent(wallet.getLifetimeSpent() + Math.abs(amount));
        wallet = walletRepository.save(wallet);
        saveTx(target, admin, null, amount, CreditTransaction.TransactionType.ADMIN_ADJUSTMENT, reason);
        auditRepository.save(AdminAuditLog.builder()
            .admin(admin)
            .action("CREDIT_ADJUSTMENT")
            .entityType("USER_CREDIT_WALLET")
            .entityId(targetUserId)
            .details(amount + " credits: " + reason)
            .build());
        return toWalletDto(wallet);
    }

    @Override
    public CreditTransactionDto toDto(CreditTransaction t) {
        return new CreditTransactionDto(
            t.getId(),
            t.getUser().getId(),
            t.getCounterparty() != null ? t.getCounterparty().getId() : null,
            t.getCounterparty() != null ? t.getCounterparty().getName() : null,
            t.getExchange() != null ? t.getExchange().getId() : null,
            t.getAmount(),
            t.getTransactionType().name(),
            t.getReason(),
            t.getCreatedAt()
        );
    }

    private UserCreditWallet ensureWallet(User user) {
        User lockedUser = userRepository.findByIdForUpdate(user.getId()).orElse(user);

        return walletRepository.findByUserIdForUpdate(lockedUser.getId()).map(wallet -> {
            if (!Boolean.TRUE.equals(wallet.getStarterGrantReleased()) && isStarterGrantEligible(lockedUser)) {
                wallet.setBalance(wallet.getBalance() + DEFAULT_STARTER_CREDITS);
                wallet.setLifetimeEarned(wallet.getLifetimeEarned() + DEFAULT_STARTER_CREDITS);
                wallet.setStarterGrantReleased(true);
                wallet = walletRepository.save(wallet);
                saveTx(user, null, null, DEFAULT_STARTER_CREDITS, CreditTransaction.TransactionType.STARTER_GRANT, "Starter credits unlocked after email verification and profile completion.");
            }
            return wallet;
        }).orElseGet(() -> {
            boolean eligibleForStarter = isStarterGrantEligible(lockedUser);
            UserCreditWallet wallet = UserCreditWallet.builder()
                .user(lockedUser)
                .balance(eligibleForStarter ? DEFAULT_STARTER_CREDITS : 0)
                .lifetimeEarned(eligibleForStarter ? DEFAULT_STARTER_CREDITS : 0)
                .lifetimeSpent(0)
                .starterGrantReleased(eligibleForStarter)
                .build();
            wallet = walletRepository.save(wallet);
            if (eligibleForStarter) {
                saveTx(lockedUser, null, null, DEFAULT_STARTER_CREDITS, CreditTransaction.TransactionType.STARTER_GRANT, "Starter credits for verified SkillEX learners with a complete profile.");
            }
            return wallet;
        });
    }

    private boolean isStarterGrantEligible(User user) {
        if (!Boolean.TRUE.equals(user.getEmailVerified())) return false;
        int filled = 0;
        int total = 8;
        if (hasText(user.getName())) filled++;
        if (hasText(user.getUsername())) filled++;
        if (hasText(user.getEmail())) filled++;
        if (hasText(user.getUniversity())) filled++;
        if (hasText(user.getLocation())) filled++;
        if (hasText(user.getBio())) filled++;
        if (user.getSkillsOffered() != null && !user.getSkillsOffered().isEmpty()) filled++;
        if (user.getSkillsWanted() != null && !user.getSkillsWanted().isEmpty()) filled++;
        return (filled * 100 / total) >= starterGrantMinCompleteness;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private CreditTransaction saveTx(User user, User counterparty, Exchange exchange, int amount, CreditTransaction.TransactionType type, String reason) {
        return transactionRepository.save(CreditTransaction.builder()
            .user(user)
            .counterparty(counterparty)
            .exchange(exchange)
            .amount(amount)
            .transactionType(type)
            .reason(reason)
            .build());
    }

    private User findUser(String id) {
        return userRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
    }

    private CreditWalletDto toWalletDto(UserCreditWallet wallet) {
        return new CreditWalletDto(wallet.getUser().getId(), wallet.getBalance(), wallet.getLifetimeEarned(), wallet.getLifetimeSpent());
    }
}
