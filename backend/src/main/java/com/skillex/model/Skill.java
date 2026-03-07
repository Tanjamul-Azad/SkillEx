package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * JPA entity mapping to the `skills` table.
 *
 * OOP notes:
 *  - DB column is `icon` (Lucide icon name, VARCHAR 100) — not icon_url
 *  - DB schema has no created_at column on skills table
 *  - description is VARCHAR(500) in DB, mapped with length=500
 */
@Entity
@Table(name = "skills")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Skill {

    @Id
    @Column(length = 36, updatable = false, nullable = false)
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    // DB column is `icon` — stores a Lucide icon component name (e.g. "Code", "Music")
    @Column(nullable = false, length = 100)
    private String icon;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(length = 500)
    private String description;
}
