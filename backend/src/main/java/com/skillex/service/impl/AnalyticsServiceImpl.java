package com.skillex.service.impl;

import com.skillex.dto.analytics.ImpactStatsDto;
import com.skillex.dto.analytics.MentorInsightDto;
import com.skillex.dto.analytics.PlatformAnalyticsDto;
import com.skillex.dto.analytics.SkillInsightDto;
import com.skillex.model.Session;
import com.skillex.model.Skill;
import com.skillex.repository.ConnectionRepository;
import com.skillex.repository.DiscussionRepository;
import com.skillex.repository.PostRepository;
import com.skillex.repository.SessionRepository;
import com.skillex.repository.SkillCertificateRepository;
import com.skillex.repository.SkillCircleRepository;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AnalyticsServiceImpl implements AnalyticsService {

    /** Average peer-tutoring market rate (USD/hour) used to express tuition value saved. */
    private static final long PEER_TUTORING_USD_PER_HOUR = 25L;

    private final SkillRepository skillRepository;
    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final SkillCircleRepository skillCircleRepository;
    private final SkillCertificateRepository skillCertificateRepository;
    private final ConnectionRepository connectionRepository;
    private final DiscussionRepository discussionRepository;
    private final PostRepository postRepository;

    @Override
    @Transactional(readOnly = true)
    public PlatformAnalyticsDto getPlatformAnalytics(int limit) {
        int resolvedLimit = Math.max(1, Math.min(limit, 20));
        var page = PageRequest.of(0, resolvedLimit);

        var demanded = skillRepository.findMostDemandedSkills(page).stream()
            .map(skill -> toSkillInsight(skill, true))
            .toList();
        var taught = skillRepository.findMostTaughtSkills(page).stream()
            .map(skill -> toSkillInsight(skill, false))
            .toList();
        var mentors = userRepository.findTopMentors(page).stream()
            .map(user -> new MentorInsightDto(
                user.getId(),
                user.getName(),
                user.getAvatar(),
                user.getUniversity(),
                user.getSessionsCompleted() == null ? 0 : user.getSessionsCompleted(),
                user.getRating(),
                user.getSkillexScore() == null ? 0 : user.getSkillexScore(),
                user.getSkillsOffered().stream().map(Skill::getName).limit(3).toList()
            ))
            .toList();

        return new PlatformAnalyticsDto(
            demanded,
            taught,
            mentors,
            userRepository.count(),
            sessionRepository.countByStatus(Session.SessionStatus.COMPLETED)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ImpactStatsDto getImpactStats(int topSkillsLimit) {
        int resolvedLimit = Math.max(1, Math.min(topSkillsLimit, 12));

        long completedSessions = sessionRepository.countByStatus(Session.SessionStatus.COMPLETED);
        long taughtMinutes = sessionRepository.sumDurationMinsByStatus(Session.SessionStatus.COMPLETED);
        long hoursTaught = taughtMinutes / 60;

        var topSkills = skillRepository.findMostTaughtSkills(PageRequest.of(0, resolvedLimit)).stream()
            .map(skill -> toSkillInsight(skill, false))
            .toList();

        return new ImpactStatsDto(
            userRepository.count(),
            completedSessions,
            hoursTaught,
            hoursTaught * PEER_TUTORING_USD_PER_HOUR,
            skillCertificateRepository.count(),
            skillCircleRepository.count(),
            discussionRepository.count() + postRepository.count(),
            connectionRepository.count(),
            skillRepository.count(),
            topSkills
        );
    }

    private SkillInsightDto toSkillInsight(Skill skill, boolean wanted) {
        long count = wanted
            ? skillRepository.countWantedUsers(skill.getId())
            : skillRepository.countOfferedUsers(skill.getId());
        return new SkillInsightDto(skill.getId(), skill.getName(), skill.getCategory(), count);
    }
}
