package com.yapai.akademikaracom.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "institutions")
public class Institution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String openAlexId;

    @ManyToMany(mappedBy = "institutionList")
    @JsonIgnore
    private List<Library> libraries;

    public Institution() {
    }

    public Institution(Long id, String openAlexId, List<Library> libraries) {
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
