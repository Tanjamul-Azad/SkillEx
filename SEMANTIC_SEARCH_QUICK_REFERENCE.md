# Semantic Search - Quick Reference & Code Snippets

## Backend Endpoint Usage

### 1. Search - Mixed Results
```bash
curl -X GET "http://localhost:8080/api/search?query=Python+programming&limit=20"
```

**Response Structure:**
```json
[
  {
    "type": "skill",
    "id": "skill-uuid",
    "name": "Python",
    "icon": "Code",
    "category": "Programming",
    "description": "...",
    "mentorCount": 5,
    "demandLevel": 8,
    "relevanceScore": 0.94
  },
  {
    "type": "mentor",
    "id": "user-uuid",
    "name": "Alice Johnson",
    "avatar": "https://...",
    "bio": "...",
    "topSkills": [
      { "id": "skill-uuid", "name": "Python", "icon": "Code" }
    ],
    "trustScore": 4.8,
    "sessionsCompleted": 12,
    "avgRating": 4.9,
    "relevanceScore": 0.87
  },
  {
    "type": "discussion",
    "id": "discussion-uuid",
    "title": "How to learn Python efficiently?",
    "authorId": "user-uuid",
    "authorName": "Bob Smith",
    "authorAvatar": "https://...",
    "upvotes": 45,
    "replies": 12,
    "snippet": "Here are the best resources I found...",
    "category": "Learning",
    "relevanceScore": 0.82
  },
  {
    "type": "circle",
    "id": "circle-uuid",
    "name": "Python Developers",
    "icon": "🐍",
    "description": "A community for Python developers...",
    "memberCount": 234,
    "activityLevel": "VERY_ACTIVE",
    "relevanceScore": 0.79
  }
]
```

### 2. Search - Grouped Results
```bash
curl -X GET "http://localhost:8080/api/search/grouped?query=Python&limit=10"
```

**Response Structure:**
```json
{
  "mentors": [
    { "type": "mentor", ... }
  ],
  "skills": [
    { "type": "skill", ... }
  ],
  "discussions": [
    { "type": "discussion", ... }
  ],
  "circles": [
    { "type": "circle", ... }
  ]
}
```

## Frontend Usage Examples

### 1. Basic Search Hook
```typescript
import { SearchService } from '@/services/searchService';
import { useState, useEffect } from 'react';

export function MySearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const search = async () => {
      setLoading(true);
      const results = await SearchService.search(query, 20);
      setResults(results);
      setLoading(false);
    };

    if (query.trim().length >= 2) {
      search();
    }
  }, [query]);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {loading && <p>Searching...</p>}
      {results.map(result => (
        <div key={result.id}>
          {result.type === 'mentor' && <p>{result.name}</p>}
          {result.type === 'skill' && <p>{result.name}</p>}
        </div>
      ))}
    </div>
  );
}
```

### 2. Using UnifiedSearchBox Component
```typescript
import { UnifiedSearchBox } from '@/components/search/UnifiedSearchBox';
import { useNavigate } from 'react-router-dom';
import type { SearchResult } from '@/services/searchService';

export function MyPage() {
  const navigate = useNavigate();

  const handleResultSelected = (result: SearchResult) => {
    if (result.type === 'mentor') {
      navigate(`/profile/${result.id}`);
    } else if (result.type === 'skill') {
      navigate(`/community?tab=circles&skill=${result.id}`);
    } else if (result.type === 'discussion') {
      navigate(`/community?tab=discussions`);
    }
  };

  return (
    <UnifiedSearchBox 
      placeholder="Search anything..."
      onResultSelected={handleResultSelected}
      className="w-full max-w-2xl"
    />
  );
}
```

### 3. Using SearchResultCard Component
```typescript
import { SearchResultCard } from '@/components/search/SearchResultCard';
import type { SearchResult } from '@/services/searchService';

interface MyGridProps {
  results: SearchResult[];
}

export function MyGrid({ results }: MyGridProps) {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {results.map(result => (
        <SearchResultCard key={result.id} result={result} />
      ))}
    </div>
  );
}
```

### 4. Type-Safe Result Handling
```typescript
import type { SearchResult, MentorResult, SkillResult } from '@/services/searchService';

function handleResult(result: SearchResult) {
  if (result.type === 'mentor') {
    const mentor = result as MentorResult;
    console.log(`Mentor: ${mentor.name}, Trust: ${mentor.trustScore}`);
  } else if (result.type === 'skill') {
    const skill = result as SkillResult;
    console.log(`Skill: ${skill.name}, Mentors: ${skill.mentorCount}`);
  } else if (result.type === 'discussion') {
    console.log(`Discussion: ${result.title}, Upvotes: ${result.upvotes}`);
  } else if (result.type === 'circle') {
    console.log(`Circle: ${result.name}, Members: ${result.memberCount}`);
  }
}
```

## Semantic Similarity Thresholds

The implementation uses cosine similarity (0.0 to 1.0):

```
[0.0 - 0.2]  = No semantic relation
[0.2 - 0.4]  = Weak relation (filtered out)
[0.3 - 0.6]  = Moderate relation (shown)
[0.6 - 0.8]  = Strong relation
[0.8 - 1.0]  = Very strong / exact match
```

Current minimum threshold: **0.3**

To adjust, edit in `UnifiedSearchServiceImpl.java`:
```java
private static final double MIN_RELEVANCE = 0.3; // Change this value
```

## Keyboard Shortcuts

In **UnifiedSearchBox** component:
- `↓` - Next result
- `↑` - Previous result
- `Enter` - Select result
- `Esc` - Close dropdown

In **App** command palette:
- `⌘K` (Mac) / `Ctrl+K` (Windows/Linux) - Open Global Search

## Pagination & Limits

Frontend request limits:
- Default: 20 results per request
- Max: 50 results per request (capped by backend)

Search grouped by type:
- Default: 10 results per type
- Example: 10 mentors + 10 skills + 10 discussions + 10 circles = 40 total

To fetch more results:
```typescript
// Get top 50 results
const results = await SearchService.search(query, 50);

// Get 20 per type instead of 10
const grouped = await SearchService.searchGrouped(query, 20);
```

## Testing with cURL

### 1. Test Basic Search
```bash
curl -s "http://localhost:8080/api/search?query=machine%20learning&limit=5" | jq
```

### 2. Test Grouped Search
```bash
curl -s "http://localhost:8080/api/search/grouped?query=python&limit=5" | jq '.mentors[] | {name, trustScore}'
```

### 3. Test Empty Query
```bash
curl -s "http://localhost:8080/api/search?query=&limit=20" | jq
# Returns empty array []
```

### 4. Test Large Limit (capped to 50)
```bash
curl -s "http://localhost:8080/api/search?query=java&limit=100" | jq length
# Returns max 50 results
```

## TypeScript Type Definitions

Complete type structure:

```typescript
// Result Union Type
type SearchResult = 
  | MentorResult 
  | SkillResult 
  | DiscussionResult 
  | CircleResult;

// Each result has:
interface BaseResult {
  id: string;
  relevanceScore: number; // 0.0 to 1.0
}

// Mentor result with skills
interface MentorResult extends BaseResult {
  type: 'mentor';
  name: string;
  avatar: string | null;
  bio: string;
  topSkills: Array<{ id: string; name: string; icon: string }>;
  trustScore: number;
  sessionsCompleted: number;
  avgRating: number;
}

// Skill with demand info
interface SkillResult extends BaseResult {
  type: 'skill';
  name: string;
  icon: string;
  category: string;
  description: string;
  mentorCount: number;
  demandLevel: number;
}

// Discussion with engagement metrics
interface DiscussionResult extends BaseResult {
  type: 'discussion';
  title: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  upvotes: number;
  replies: number;
  snippet: string;
  category: string;
}

// Skill circle with activity
interface CircleResult extends BaseResult {
  type: 'circle';
  name: string;
  icon: string;
  description: string;
  memberCount: number;
  activityLevel: 'VERY_ACTIVE' | 'ACTIVE' | 'QUIET';
}
```

## Performance Optimization Tips

### 1. Frontend Debouncing
```typescript
// Debounce is already built in (400ms)
// Results show after user stops typing for 400ms
<UnifiedSearchBox /> // Automatically debounced
```

### 2. Limit Requests
```typescript
// Good: Fetch 20 results
await SearchService.search(query, 20);

// Expensive: Fetch 1000 results (capped at 50)
await SearchService.search(query, 1000);
```

### 3. Cache Results Locally
```typescript
const [cache, setCache] = useState<Map<string, SearchResult[]>>(new Map());

const search = async (query: string) => {
  if (cache.has(query)) {
    return cache.get(query)!;
  }
  
  const results = await SearchService.search(query);
  setCache(new Map(cache).set(query, results));
  return results;
};
```

### 4. Lazy Load Results
```typescript
// Show first 6 results immediately, load more on scroll
const [results, setResults] = useState<SearchResult[]>([]);
const [page, setPage] = useState(0);

const loadMore = () => {
  // Fetch next page
  setPage(page + 1);
};
```

## Common Filtering Patterns

### Filter by Type
```typescript
const mentorResults = results.filter(r => r.type === 'mentor');
const skillResults = results.filter(r => r.type === 'skill');
```

### Sort by Relevance
```typescript
results.sort((a, b) => b.relevanceScore - a.relevanceScore);
```

### Filter by Relevance Threshold
```typescript
const highRelevance = results.filter(r => r.relevanceScore > 0.7);
```

### Filter Mentors by Trust Score
```typescript
const trustedMentors = results
  .filter(r => r.type === 'mentor')
  .filter(r => (r as MentorResult).trustScore >= 4.0);
```

## Migration to Production

1. **Backend Deployment:**
   - No database migrations needed
   - No new environment variables
   - Just redeploy JAR with new SearchController

2. **Frontend Deployment:**
   - No breaking changes to existing pages
   - /search route is new (no conflicts)
   - Command palette enhancement is backwards compatible

3. **Rollout:**
   - Deploy backend first
   - Test endpoints with cURL
   - Deploy frontend next
   - Enable feature in UI

---

**Last Updated:** 2026-06-11
