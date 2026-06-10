# Skill-Check Verification Feature

## Overview

**Problem Solved:** How do learners verify that a mentor is actually capable of teaching a skill before committing time/credits?

**Solution:** A comprehensive verification system that surfaces existing backend trust infrastructure (skill checks, certificates, portfolio proofs, completed sessions) through an intuitive "Verified" or "Pending" badge system.

---

## What Users See

### 1. **Verified Badge** (on mentor profiles & match cards)
```
✓ Verified    [or]    ⚠ Pending
```

- **Green "Verified"** badge appears when mentor's trust score ≥70 for that skill
- **Amber "Pending"** badge appears when trust score <70
- **Hover tooltip** explains exactly how they earned their verification (e.g., "3 sessions @ 4.5★", "Portfolio proof on file", "Skill check completed", "Admin verified")
- **"Request check" button** right on the badge when not verified — one click to start a 15-min vetting call

### 2. **Request Skill-Check Dialog** (multi-step flow)
A polished 4-step dialog that makes the vetting process crystal clear:

1. **What is a skill check?** — Explains the 15-min vetting call with an itemized checklist:
   - ✓ Live demo (5–10 min seeing them teach/code live)
   - ✓ Goal alignment (confirm what you want to learn & their teaching style)
   - ✓ Schedule fit (decide on a good time for both)

2. **Add a personal message** — Optional context so the mentor understands what you're looking for
   - e.g., "I'm trying to build a React component library and want to see your React patterns in action."

3. **Confirm request** — Review mentor name, skill, message before sending

4. **Success** — Auto-closes after 2 seconds with confirmation toast

### 3. **Integration Points**

#### **Profile Page** (when viewing any mentor's profile)
- Under "Can teach" skills section
- Each skill shows a VerifiedBadge with full tooltip + "Skill Check" button
- Non-owners can request a skill check directly from the profile

#### **Match/Exchange Dialog** (when about to request a skill swap)
- Shows VerifiedBadge next to each skill the mentor teaches
- User sees verification status **before** deciding to swap or pay credits
- Helps make informed decisions about whom to partner with

#### **Direct Button** (on profile page)
- Prominent "Skill Check" button under each taught skill
- One-click access to the RequestSkillCheckDialog

---

## Technical Implementation

### Components Created

#### **`VerifiedBadge.tsx`** (component)
Location: `frontend/src/components/trust/VerifiedBadge.tsx`

**Props:**
```typescript
interface VerifiedBadgeProps {
  userId: string;
  skillId: string;
  skillName: string;
  onRequestCheck?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}
```

**Behavior:**
- Fetches `SkillTrust` data from backend (`GET /users/{userId}/skills/{skillId}/trust`)
- Displays score as % with color-coded bar (green ≥70, amber ≥40, red <40)
- Shows tooltip with:
  - Trust score breakdown (numerical)
  - Animated progress bar
  - List of contributing reasons (completed sessions, portfolio, skill check, admin verified)
  - Guidance to request a skill check if pending
- "Request check" button triggers `onRequestCheck` callback
- Fully animated with Framer Motion spring transitions

---

#### **`RequestSkillCheckDialog.tsx`** (component)
Location: `frontend/src/components/trust/RequestSkillCheckDialog.tsx`

**Props:**
```typescript
interface RequestSkillCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  skillId: string;
  skillName: string;
  mentorName: string;
  onSuccess?: () => void;
}
```

**Features:**
- Multi-step dialog (intro → message → confirm → loading → success)
- Calls `skillCheckService.create()` to POST to `/skill-checks` backend endpoint
- Auto-closes on success after 2 seconds
- Full error handling with toast notifications
- Animated step transitions with Framer Motion
- Responsive design (works on mobile)

---

### Backend Integration

**Existing endpoints used:**
- `GET /users/{userId}/skills/{skillId}/trust` — fetch SkillTrust score + breakdown
- `POST /skill-checks` — create a skill-check meeting request

**No new backend code required** — uses existing infrastructure:
- `SkillTrustService` (interface already existed)
- `SkillTrustDto` (with score, reasons, session count, etc.)
- `SkillCheckController` with `POST /skill-checks` endpoint
- `SkillCheckService` to create meetings + notify mentor

---

### Files Modified

#### `frontend/src/features/match/components/RequestExchangeDialog.tsx`
**Change:** Show VerifiedBadge next to each skill mentor teaches

```tsx
<div className="space-y-2">
  {targetUser.skillsOffered?.slice(0, 4).map((s) => (
    <div key={s.id} className="flex items-center justify-between gap-2">
      <Badge variant="secondary" className="text-xs capitalize">
        {s.icon} {s.name}
      </Badge>
      <VerifiedBadge
        userId={targetUser.id}
        skillId={s.id}
        skillName={s.name}
        size="sm"
        showDetails={true}
      />
    </div>
  ))}
</div>
```

**Impact:** Before swapping skills or paying credits, users now see verification status.

---

#### `frontend/src/features/profile/pages/ProfilePage.tsx`
**Changes:**
1. Import VerifiedBadge component
2. Removed old `SkillTrustBadge` function (was just showing "Trust 50%" with no detail)
3. Updated "Can teach" skills section to show VerifiedBadge with full tooltip

```tsx
{variant === 'offer' && profileUserId && (
  <VerifiedBadge
    userId={profileUserId}
    skillId={skill.id}
    skillName={skill.name}
    size="sm"
    showDetails={true}
  />
)}
```

**Impact:** Every mentor's profile now shows verification status for their skills.

---

## Design Decisions

### Why "Verified for [skill]" instead of just a score?
- **Human-friendly:** "Verified" is instantly meaningful; "72%" requires interpretation
- **Progressive disclosure:** Simple badge at-a-glance, detailed tooltip on hover
- **Clear action:** Amber "Pending" + "Request check" button guides users to next step

### Why display on multiple surfaces?
1. **Match dialog** — Earliest decision point (before requesting)
2. **Profile page** — Complete mentor picture (when researching)
3. Both surfaces **maximize chance** users see verification before committing

### Why tooltip with reasons?
- Transparency: Users understand exactly how trust was earned
- Fairness: Shows that verification isn't arbitrary (3 real sessions > admin stamp)
- Conversion: When users see "3 sessions @ 4.5★", they trust the mentor without requesting a check

### Why multi-step dialog for "Request Check"?
- **Education:** Users understand what they're asking for (not just "request check")
- **Clarity:** Shows exact 15-min format (intro, demo, goal alignment, schedule fit)
- **Intent:** Personal message ensures request is specific, not generic

---

## User Journey

### Scenario: Learner wants to learn React from a match

1. **Sees match card** → "Teaches: React"
2. **Opens request dialog** → Sees VerifiedBadge next to React skill
   - If Verified ✓ → Confident, proceeds with swap/credit request
   - If Pending ⚠ → Clicks "Request check" button
3. **Multi-step dialog** → Understands what to expect
   - Reads "live demo, goal alignment, schedule fit"
   - Types optional message: "Show me how you structure hooks"
   - Confirms request
4. **Mentor receives notification** → Can accept, suggest time, or decline
5. **Skill check happens** → 15-min video call with checklist
6. **Trust score updates** → Verified badge turns green after mentor completes feedback

---

## Current Verification Criteria (from backend)

A skill is considered **"Verified"** (trust score ≥70) if mentor has:
- ≥3 completed teaching sessions with ≥4.0 average rating, **OR**
- Completed a formal Skill-Check meeting with positive feedback, **OR**
- Uploaded portfolio proofs for the skill, **OR**
- Admin manually verified the skill, **OR**
- Combination of the above (composite trust score)

Backend computes 6 trust signals:
1. **Proof score** — Portfolio proofs uploaded
2. **Session score** — Completed sessions + ratings
3. **Review score** — Peer reviews on teaching quality
4. **Skill-Check score** — Formal vetting meeting feedback
5. **Safety score** — No reports/bans on record
6. **Admin score** — Manual verification

---

## Future Enhancements

### Phase 2: AI Skill Assessment
- Ollama generates a short quiz/challenge for the skill
- Mentor completes it, AI grades answer
- Produces "AI-Verified by Ollama" badge (8/10 Python)
- Feeds into trust score automatically

### Phase 3: Video Proof
- Mentor optionally uploads a 2-min recorded demo of the skill
- Embedded on profile + linked in trust tooltip
- Learner can watch before requesting check or swapping

### Phase 4: Batch Verification
- Mentor uploads credentials (certifications, transcripts)
- System extracts & verifies credentials
- Auto-populates trust scores for multiple related skills

---

## Testing Checklist

- [x] VerifiedBadge renders without crashing (loads trust data from API)
- [x] Trust score displays with correct color (green/amber/red)
- [x] Tooltip shows all verification reasons when available
- [x] "Request check" button appears when trust <70
- [x] RequestSkillCheckDialog steps work (intro → message → confirm → success)
- [x] Dialog auto-closes 2s after success
- [x] Error toasts show if API call fails
- [x] Profile page shows badges for "Can teach" skills
- [x] RequestExchangeDialog shows badges next to each skill
- [x] TypeScript type checking passes (no errors)
- [x] Frontend builds without warnings

---

## Files & Locations

### New Files
- `frontend/src/components/trust/VerifiedBadge.tsx` (250 lines)
- `frontend/src/components/trust/RequestSkillCheckDialog.tsx` (310 lines)

### Modified Files
- `frontend/src/features/match/components/RequestExchangeDialog.tsx` (+VerifiedBadge import, +badge in "They can teach" section)
- `frontend/src/features/profile/pages/ProfilePage.tsx` (+VerifiedBadge import, removed SkillTrustBadge function, updated skill display)

### Backend (Used, not modified)
- `backend/src/main/java/com/skillex/service/SkillTrustService.java` (existing interface)
- `backend/src/main/java/com/skillex/controller/SkillCheckController.java` (existing endpoints)
- `backend/src/main/java/com/skillex/service/impl/SkillTrustServiceImpl.java` (existing trust aggregation)

---

## FAQ

**Q: Why can't learners just look at session ratings/reviews?**
A: Because ratings can be gamed (friends leaving glowing reviews). Skill checks require a live demo, which is harder to fake.

**Q: What if a mentor declines the skill check?**
A: Their trust score won't improve, but the learner sees the choice was made. Transparency > punitive system.

**Q: Can someone get "Verified" without a skill check?**
A: Yes — 3 real sessions at 4.0+ rating is enough. Skill checks are **one path**, not the only path.

**Q: What happens if mentor doesn't show up to their accepted skill check?**
A: Learner can leave negative feedback or report. Trust score drops. No penalty to learner (credits refunded if paid).

---

