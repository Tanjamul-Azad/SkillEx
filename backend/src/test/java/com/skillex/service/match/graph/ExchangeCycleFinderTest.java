package com.skillex.service.match.graph;

import com.skillex.model.Skill;
import com.skillex.repository.SkillRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ExchangeCycleFinderTest {

    @Test
    void findCyclesExposesHopsAsTeacherToLearner() {
        SkillRepository skillRepository = mock(SkillRepository.class);
        when(skillRepository.findAll()).thenReturn(List.of(
            skill("skill-python", "Python"),
            skill("skill-figma", "Figma"),
            skill("skill-guitar", "Guitar")
        ));

        ExchangeGraph graph = new ExchangeGraph();
        graph.addNode(new ExchangeGraphNode("alice", "Alice", Set.of("skill-guitar"), Set.of("skill-python")));
        graph.addNode(new ExchangeGraphNode("bob", "Bob", Set.of("skill-python"), Set.of("skill-figma")));
        graph.addNode(new ExchangeGraphNode("cara", "Cara", Set.of("skill-figma"), Set.of("skill-guitar")));
        graph.addEdge(new ExchangeGraphEdge("alice", "bob", Set.of("skill-python")));
        graph.addEdge(new ExchangeGraphEdge("bob", "cara", Set.of("skill-figma")));
        graph.addEdge(new ExchangeGraphEdge("cara", "alice", Set.of("skill-guitar")));

        ExchangeCycleFinder finder = new ExchangeCycleFinder(skillRepository);

        List<ExchangeCycle> cycles = finder.findCycles(graph);

        assertThat(cycles).hasSize(1);
        assertThat(cycles.get(0).hops())
            .extracting(
                ExchangeCycleHop::fromUserName,
                ExchangeCycleHop::primarySkillName,
                ExchangeCycleHop::toUserName
            )
            .containsExactly(
                tuple("Bob", "Python", "Alice"),
                tuple("Cara", "Figma", "Bob"),
                tuple("Alice", "Guitar", "Cara")
            );
    }

    private static Skill skill(String id, String name) {
        return Skill.builder()
            .id(id)
            .name(name)
            .icon("BookOpen")
            .category("General")
            .description("")
            .build();
    }
}
