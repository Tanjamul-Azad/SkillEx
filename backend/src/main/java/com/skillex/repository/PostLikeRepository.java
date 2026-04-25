package com.skillex.repository;

import com.skillex.model.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface PostLikeRepository extends JpaRepository<PostLike, PostLike.PostLikeId> {

    boolean existsByIdPostIdAndIdUserId(String postId, String userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM PostLike pl WHERE pl.id.postId = :postId AND pl.id.userId = :userId")
    void deleteByIdPostIdAndIdUserId(@Param("postId") String postId, @Param("userId") String userId);

    long countByIdPostId(String postId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM PostLike pl WHERE pl.id.postId = :postId")
    void deleteAllByPostId(@Param("postId") String postId);

    /** Check which posts in a set the viewer has liked — used for bulk isLikedByViewer resolution */
    @Query("SELECT pl.id.postId FROM PostLike pl WHERE pl.id.userId = :userId AND pl.id.postId IN :postIds")
    List<String> findLikedPostIdsByUser(@Param("userId") String userId, @Param("postIds") Collection<String> postIds);
}
