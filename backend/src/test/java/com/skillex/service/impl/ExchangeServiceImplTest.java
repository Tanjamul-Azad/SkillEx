package com.skillex.service.impl;

import com.skillex.dto.exchange.ExchangeDto;
import com.skillex.dto.exchange.UpdateExchangeRequest;
import com.skillex.model.Exchange;
import com.skillex.model.User;
import com.skillex.repository.ConnectionRepository;
import com.skillex.repository.ExchangeRepository;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.AccountRestrictionService;
import com.skillex.service.CreditService;
import com.skillex.service.DtoMapper;
import com.skillex.service.NotificationService;
import com.skillex.service.SkillTrustService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExchangeServiceImplTest {

    @Mock private ExchangeRepository exchangeRepository;
    @Mock private UserRepository userRepository;
    @Mock private SkillRepository skillRepository;
    @Mock private ConnectionRepository connectionRepository;
    @Mock private DtoMapper mapper;
    @Mock private NotificationService notificationService;
    @Mock private AccountRestrictionService restrictionService;
    @Mock private CreditService creditService;
    @Mock private SkillTrustService skillTrustService;

    private ExchangeServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ExchangeServiceImpl(
            exchangeRepository,
            userRepository,
            skillRepository,
            connectionRepository,
            mapper,
            notificationService,
            restrictionService,
            creditService,
            skillTrustService
        );
    }

    @Test
    void updateStatus_rejectsRequesterAcceptingOwnRequest() {
        User requester = user("requester");
        User receiver = user("receiver");
        Exchange exchange = exchange("exchange-1", requester, receiver, Exchange.ExchangeStatus.PENDING);

        when(exchangeRepository.findById(exchange.getId())).thenReturn(Optional.of(exchange));

        assertThrows(AccessDeniedException.class, () ->
            service.updateStatus(exchange.getId(), requester.getId(), new UpdateExchangeRequest("ACCEPTED"))
        );

        verify(exchangeRepository, never()).save(any(Exchange.class));
        verify(creditService, never()).refundCreditExchange(any());
    }

    @Test
    void updateStatus_rejectsDeclineAfterExchangeAlreadyResolved() {
        User requester = user("requester");
        User receiver = user("receiver");
        Exchange exchange = exchange("exchange-2", requester, receiver, Exchange.ExchangeStatus.ACCEPTED);

        when(exchangeRepository.findById(exchange.getId())).thenReturn(Optional.of(exchange));

        assertThrows(IllegalStateException.class, () ->
            service.updateStatus(exchange.getId(), receiver.getId(), new UpdateExchangeRequest("DECLINED"))
        );

        verify(exchangeRepository, never()).save(any(Exchange.class));
        verify(creditService, never()).refundCreditExchange(any());
    }

    @Test
    void cancel_rejectsAlreadyDeclinedExchangeSoCreditRefundCannotRepeat() {
        User requester = user("requester");
        User receiver = user("receiver");
        Exchange exchange = exchange("exchange-3", requester, receiver, Exchange.ExchangeStatus.DECLINED);
        exchange.setExchangeMode(Exchange.ExchangeMode.CREDIT_PAYMENT);
        exchange.setCreditCost(10);

        when(exchangeRepository.findById(exchange.getId())).thenReturn(Optional.of(exchange));

        assertThrows(IllegalStateException.class, () -> service.cancel(exchange.getId(), requester.getId()));

        verify(exchangeRepository, never()).save(any(Exchange.class));
        verify(creditService, never()).refundCreditExchange(any());
    }

    @Test
    void receiverCanDeclinePendingCreditExchangeAndRefundOnce() {
        User requester = user("requester");
        User receiver = user("receiver");
        Exchange exchange = exchange("exchange-4", requester, receiver, Exchange.ExchangeStatus.PENDING);
        exchange.setExchangeMode(Exchange.ExchangeMode.CREDIT_PAYMENT);
        exchange.setCreditCost(10);

        ExchangeDto dto = new ExchangeDto(exchange.getId(), null, null, null, null, null, "CREDIT_PAYMENT", 10, "DECLINED", null, null);

        when(exchangeRepository.findById(exchange.getId())).thenReturn(Optional.of(exchange));
        when(exchangeRepository.save(exchange)).thenReturn(exchange);
        when(mapper.toExchange(exchange)).thenReturn(dto);

        service.updateStatus(exchange.getId(), receiver.getId(), new UpdateExchangeRequest("DECLINED"));

        verify(creditService).refundCreditExchange(exchange);
    }

    private static Exchange exchange(String id, User requester, User receiver, Exchange.ExchangeStatus status) {
        Exchange exchange = new Exchange();
        exchange.setId(id);
        exchange.setRequester(requester);
        exchange.setReceiver(receiver);
        exchange.setStatus(status);
        exchange.setExchangeMode(Exchange.ExchangeMode.DIRECT_SWAP);
        exchange.setCreditCost(0);
        return exchange;
    }

    private static User user(String id) {
        User user = new User();
        user.setId(id);
        user.setName(id);
        return user;
    }
}
