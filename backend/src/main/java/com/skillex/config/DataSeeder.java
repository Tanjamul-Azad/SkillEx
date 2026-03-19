package com.skillex.config;

import com.skillex.model.*;
import com.skillex.model.UserSkillOffered.SkillProficiency;
import com.skillex.model.UserSkillOffered.UserSkillId;
import com.skillex.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Seeds demo data into a fresh database.
 * Runs once on startup — skipped if users already exist.
 *
 * Demo credentials:  any demo user  /  Password: Demo1234!
 * Admin account:     admin@skillex.app  /  Password: Admin1234!
 */
@Slf4j
@Component
@RequiredArgsConstructor
@SuppressWarnings("null")
public class DataSeeder {

    private final UserRepository             userRepository;
    private final SkillRepository            skillRepository;
    private final UserSkillOfferedRepository offeredRepo;
    private final UserSkillWantedRepository  wantedRepo;
    private final EventRepository            eventRepository;
    private final DiscussionRepository       discussionRepository;
    private final SkillCircleRepository      circleRepository;
    private final PasswordEncoder            passwordEncoder;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seed() {
        if (userRepository.count() > 0) {
            log.info("[DataSeeder] Users already exist — skipping seed.");
            return;
        }

        List<Skill> skills = skillRepository.findAll();
        if (skills.isEmpty()) {
            log.warn("[DataSeeder] No skills found — Flyway V3 may not have run yet. Skipping seed.");
            return;
        }

        log.info("[DataSeeder] Seeding demo data…");

        // ── 1. Users ─────────────────────────────────────────────────────────
        String demoPass  = passwordEncoder.encode("Demo1234!");
        String adminPass = passwordEncoder.encode("Admin1234!");

        saveUser("Admin User",    "admin@skillex.app",   adminPass, "SkiilEX HQ",  User.UserRole.ADMIN,   User.UserLevel.MASTER,       1500, 30,  new BigDecimal("5.00"), true,  "Platform administrator and community manager.");
        User u1    = saveUser("Rahim Ahmed",   "rahim@buet.ac.bd",    demoPass,  "BUET",         User.UserRole.STUDENT, User.UserLevel.SKILLED,      900,  15,  new BigDecimal("4.80"), true,  "CS student passionate about algorithms and music.");
        User u2    = saveUser("Nadia Islam",   "nadia@du.ac.bd",      demoPass,  "DU",           User.UserRole.STUDENT, User.UserLevel.PRACTITIONER, 750,  12,  new BigDecimal("4.70"), false, "Design enthusiast and Figma power-user.");
        User u3    = saveUser("Karim Hassan",  "karim@nsu.edu.bd",    demoPass,  "NSU",          User.UserRole.STUDENT, User.UserLevel.LEARNER,      550,  8,   new BigDecimal("4.60"), true,  "Python dev by day, guitarist by night.");
        User u4    = saveUser("Fatema Begum",  "fatema@brac.net.bd",  demoPass,  "BRAC",         User.UserRole.STUDENT, User.UserLevel.SKILLED,      820,  14,  new BigDecimal("4.90"), false, "Into photography, writing and data science.");
        User u5    = saveUser("Arif Hossain",  "arif@iut-dhaka.edu",  demoPass,  "IUT",          User.UserRole.STUDENT, User.UserLevel.ADVANCED,     1100, 20,  new BigDecimal("4.85"), true,  "Web dev, public speaker and chess fan.");
        User u6    = saveUser("Sumaiya Khan",  "sumaiya@cuet.ac.bd",  demoPass,  "CUET",         User.UserRole.STUDENT, User.UserLevel.PRACTITIONER, 680,  10,  new BigDecimal("4.65"), false, "Learning French and digital marketing.");
        User u7    = saveUser("Tanvir Ahmed",  "tanvir@sust.edu",     demoPass,  "SUST",         User.UserRole.STUDENT, User.UserLevel.SKILLED,      870,  16,  new BigDecimal("4.75"), true,  "3D modeling and UI/UX design nerd.");
        User u8    = saveUser("Priya Sharma",  "priya@diu.edu.bd",    demoPass,  "DIU",          User.UserRole.STUDENT, User.UserLevel.LEARNER,      490,  6,   new BigDecimal("4.55"), false, "Music production and calligraphy lover.");
        User u9    = saveUser("Rafiq Uddin",   "rafiq@aust.edu",      demoPass,  "AUST",         User.UserRole.STUDENT, User.UserLevel.ADVANCED,     1050, 18,  new BigDecimal("4.80"), true,  "Excel wizard and cooking enthusiast.");
        User u10   = saveUser("Mitu Akter",    "mitu@ewu.edu.bd",     demoPass,  "EWU",          User.UserRole.STUDENT, User.UserLevel.PRACTITIONER, 720,  11,  new BigDecimal("4.70"), false, "Drawing, chess, and English writing.");

        // ── 2. Skills offered / wanted ────────────────────────────────────────
        skillFor(u1, skills, "Python",           "Video Editing",    SkillProficiency.EXPERT);
        skillFor(u2, skills, "Figma",            "Python",           SkillProficiency.EXPERT);
        skillFor(u3, skills, "Guitar",           "Figma",            SkillProficiency.MODERATE);
        skillFor(u4, skills, "Photography",      "Data Science",     SkillProficiency.EXPERT);
        skillFor(u5, skills, "Web Development",  "Public Speaking",  SkillProficiency.EXPERT);
        skillFor(u6, skills, "Digital Marketing","French Language",  SkillProficiency.MODERATE);
        skillFor(u7, skills, "3D Modeling",      "UI/UX Design",     SkillProficiency.EXPERT);
        skillFor(u8, skills, "Music Production", "Guitar",           SkillProficiency.MODERATE);
        skillFor(u9, skills, "Excel",            "Cooking",          SkillProficiency.EXPERT);
        skillFor(u10, skills,"Drawing",          "Chess",            SkillProficiency.MODERATE);

        // Second skill offered
        skillOffered(u1, skills, "Web Development", SkillProficiency.MODERATE);
        skillOffered(u2, skills, "Graphic Design",  SkillProficiency.MODERATE);
        skillOffered(u3, skills, "Python",          SkillProficiency.MODERATE);
        skillOffered(u4, skills, "Photography",     SkillProficiency.EXPERT);
        skillOffered(u5, skills, "Chess",           SkillProficiency.MODERATE);

        // ── 3. Events ─────────────────────────────────────────────────────────
        Skill webDev  = findSkill(skills, "Web Development");
        Skill uiux    = findSkill(skills, "UI/UX Design");
        Skill photo   = findSkill(skills, "Photography");
        Skill figma   = findSkill(skills, "Figma");
        Skill speak   = findSkill(skills, "Public Speaking");
        Skill chess   = findSkill(skills, "Chess");

        saveEvent("Web Dev Workshop",
                  "Hands-on modern web development with React and Spring Boot.",
                  u10, LocalDateTime.now().plusDays(10), "BUET ECE Building", false,
                  "bg-gradient-to-br from-blue-500 to-purple-600",
                  List.of(webDev, uiux), List.of(u1, u2, u3, u4, u5));

        saveEvent("Photography Walk in Old Dhaka",
                  "Capture the beauty of Old Dhaka with fellow photography enthusiasts.",
                  u5, LocalDateTime.now().plusDays(15), "Old Dhaka — Chawkbazar", false,
                  "bg-gradient-to-br from-amber-500 to-red-600",
                  List.of(photo), List.of(u3, u4, u5, u6, u7, u8));

        saveEvent("Online Figma Design-a-thon",
                  "A 24-hour online design challenge — build a full app UI in Figma.",
                  u4, LocalDateTime.now().plusDays(20), "Online (Zoom)", true,
                  "bg-gradient-to-br from-pink-500 to-rose-500",
                  List.of(figma, uiux), List.of(u2, u4, u5, u7, u8, u9, u10));

        saveEvent("Public Speaking Practice Session",
                  "Overcome your fears and practice public speaking in a supportive environment.",
                  u6, LocalDateTime.now().plusDays(7), "NSU Auditorium", false,
                  "bg-gradient-to-br from-green-500 to-teal-600",
                  List.of(speak), List.of(u2, u4, u6));

        saveEvent("Campus Chess Tournament",
                  "Test your strategic skills in our cross-campus chess tournament.",
                  u8, LocalDateTime.now().plusDays(12), "DU Teacher-Student Centre (TSC)", false,
                  "bg-gradient-to-br from-gray-700 to-gray-900",
                  List.of(chess), List.of(u4, u5, u6, u7, u8, u9));

        // ── 4. Discussions ────────────────────────────────────────────────────
        String[] dTopics = {
            "Python", "Guitar", "Figma", "Photography", "Public Speaking",
            "Data Science", "3D Modeling", "Chess"
        };
        String[] dCats = {
            "Tech", "Creative", "Design", "Creative", "Communication",
            "Tech", "Design", "Strategy"
        };
        User[] dAuthors = { u1, u3, u2, u4, u5, u1, u7, u10 };
        int[] dUpvotes  = { 60, 45, 80, 35, 55, 70, 40, 50 };
        int[] dReplies  = { 12, 8,  15, 6,  10, 14, 7,  9  };
        int[] dViews    = { 320, 210, 450, 180, 290, 380, 200, 270 };

        for (int i = 0; i < dTopics.length; i++) {
            String topic = dTopics[i];
            Discussion d = Discussion.builder()
                .title("How to start with " + topic + "? Tips for beginners?")
                .content("I'm new to " + topic + " and would love advice on where to begin. "
                       + "What are the best resources and common pitfalls to avoid? Thanks!")
                .author(dAuthors[i])
                .category(dCats[i])
                .upvotes(dUpvotes[i])
                .replies(dReplies[i])
                .views(dViews[i])
                .isPinned(i < 2)
                .build();
            discussionRepository.save(d);
        }

        // ── 5. Skill Circles ──────────────────────────────────────────────────
        Skill python  = findSkill(skills, "Python");
        Skill dsci    = findSkill(skills, "Data Science");
        Skill music   = findSkill(skills, "Guitar");
        Skill musProd = findSkill(skills, "Music Production");

        saveCircle("Python & AI Club",      "🐍", 24,
                   SkillCircle.ActivityLevel.VERY_ACTIVE,
                   List.of(python, dsci),
                   List.of(u1, u3, u5, u9));

        saveCircle("Creative Makers Circle","🎨", 18,
                   SkillCircle.ActivityLevel.ACTIVE,
                   List.of(findSkill(skills, "Graphic Design"), findSkill(skills, "Drawing"), figma),
                   List.of(u2, u4, u7, u10));

        saveCircle("Music & Arts Hub",      "🎵", 12,
                   SkillCircle.ActivityLevel.ACTIVE,
                   List.of(music, musProd),
                   List.of(u3, u8));

        saveCircle("Language Exchange Hub", "🌍", 9,
                   SkillCircle.ActivityLevel.QUIET,
                   List.of(findSkill(skills, "English Writing"), findSkill(skills, "French Language")),
                   List.of(u6, u10));

        log.info("[DataSeeder] ✅ Demo data seeded. Login with any demo account using password: Demo1234!");
        log.info("[DataSeeder]    Admin: admin@skillex.app / Admin1234!");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private User saveUser(String name, String email, String passwordHash,
                          String university, User.UserRole role, User.UserLevel level,
                          int score, int sessions, BigDecimal rating,
                          boolean online, String bio) {
        return userRepository.save(User.builder()
            .name(name)
            .email(email)
            .passwordHash(passwordHash)
            .university(university)
            .role(role)
            .level(level)
            .skillexScore(score)
            .sessionsCompleted(sessions)
            .rating(rating)
            .isOnline(online)
            .bio(bio)
            .build());
    }

    /** Convenience: set one offered skill and one wanted skill at once */
    private void skillFor(User user, List<Skill> skills,
                          String offeredName, String wantedName,
                          SkillProficiency offeredLevel) {
        skillOffered(user, skills, offeredName, offeredLevel);
        skillWanted(user, skills, wantedName);
    }

    private void skillOffered(User user, List<Skill> skills, String name, SkillProficiency level) {
        Skill s = findSkill(skills, name);
        if (s == null) return;
        offeredRepo.save(UserSkillOffered.builder()
            .id(new UserSkillId(user.getId(), s.getId()))
            .user(user)
            .skill(s)
            .level(level)
            .build());
    }

    private void skillWanted(User user, List<Skill> skills, String name) {
        Skill s = findSkill(skills, name);
        if (s == null) return;
        wantedRepo.save(UserSkillWanted.builder()
            .id(new UserSkillWanted.UserSkillId(user.getId(), s.getId()))
            .user(user)
            .skill(s)
            .build());
    }

    private void saveEvent(String title, String description, User host,
                           LocalDateTime date, String location, boolean isOnline,
                           String gradient, List<Skill> eventSkills, List<User> attendees) {
        Event e = Event.builder()
            .title(title)
            .description(description)
            .host(host)
            .eventDate(date)
            .location(location)
            .isOnline(isOnline)
            .coverGradient(gradient)
            .skills(new java.util.ArrayList<>(eventSkills))
            .attendees(new java.util.ArrayList<>(attendees))
            .build();
        eventRepository.save(e);
    }

    private void saveCircle(String name, String icon, int memberCount,
                            SkillCircle.ActivityLevel activity,
                            List<Skill> circleSkills, List<User> members) {
        SkillCircle c = SkillCircle.builder()
            .name(name)
            .icon(icon)
            .memberCount(memberCount)
            .activity(activity)
            .skills(new java.util.ArrayList<>(circleSkills))
            .members(new java.util.ArrayList<>(members))
            .build();
        circleRepository.save(c);
    }

    private Skill findSkill(List<Skill> skills, String name) {
        return skills.stream()
            .filter(s -> s.getName().equalsIgnoreCase(name))
            .findFirst()
            .orElse(null);
    }
}
