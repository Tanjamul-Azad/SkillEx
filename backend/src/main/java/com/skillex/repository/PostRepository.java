package com.skillex.repository;

import com.skillex.model.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;

@Repository
public interface PostRepository extends JpaRepository<Post, String> {

    Page<Post> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Post> findByAuthorId(String authorId, Pageable pageable);

    Page<Post> findByType(Post.PostType type, Pageable pageable);

    Page<Post> findByContentContainingIgnoreCaseOrderByCreatedAtDesc(String content, Pageable pageable);

    Page<Post> findBySkill_IdInOrContentContainingIgnoreCaseOrderByCreatedAtDesc(
        Collection<String> skillIds,
        String content,
        Pageable pageable
    );

    long countByAuthorId(String authorId);

    long countBySkillId(String skillId);
}
