package com.yapai.akademikaracom.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "authors")
public class Author {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String openAlexId;

    @ManyToMany(mappedBy = "authorList")
    @JsonIgnore
    private List<Library> libraries;

    public Author() {
    }

    public Author(Long id, String openAlexId, List<Library> libraries) {
        this.id = id;
        this.openAlexId = openAlexId;
        this.libraries = libraries;
    }

    public Long getId() {
        return id;
    }

    public String getOpenAlexId() {
        return openAlexId;
    }

    public void setOpenAlexId(String openAlexId) {
        this.openAlexId = openAlexId;
    }

    public List<Library> getLibraries() {
        return libraries;
    }

    public void setLibraries(List<Library> libraries) {
        this.libraries = libraries;
    }
}
